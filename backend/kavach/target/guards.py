"""Guard policy engine: the patchable defence layer (see docs/TARGET_BOT.md §4)."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from kavach.models import GuardPolicy

PAN_RE = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")
PHONE_RE = re.compile(r"(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}")
BLOCKED_REPLY = "Sorry, I'm not able to help with that request."
CANARY_REPLY = "Sorry, I can't share internal details, but I'm happy to help with your orders."


@dataclass
class InputCheck:
    blocked_by: str | None = None
    flags: list[str] = field(default_factory=list)


@dataclass
class ToolDecision:
    allowed: bool
    blocked_by: str | None = None
    result: dict[str, Any] | None = None  # what the LLM sees when the call is not executed


def check_input(message: str, policy: GuardPolicy) -> InputCheck:
    out = InputCheck()
    for f in policy.input_filters:
        try:
            hit = re.search(f.pattern, message)
        except re.error:
            continue  # a bad regex from the Patcher must never crash the target
        if hit:
            if f.action == "block" and out.blocked_by is None:
                out.blocked_by = f"input_filter:{f.id}"
            elif f.action == "flag":
                out.flags.append(f"input_filter:{f.id}")
    return out


def _blocked(rule: str) -> ToolDecision:
    return ToolDecision(False, f"guard:{rule}", {"error": "BLOCKED_BY_POLICY", "rule": rule})


def check_tool(
    tool: str, args: dict[str, Any], session_user: str, policy: GuardPolicy, db: dict
) -> ToolDecision:
    order = db["orders"].get(args.get("order_id") or "")
    owner = order["owner_user_id"] if order else None

    if tool == "issue_refund":
        amount = int(args.get("amount_inr") or 0)
        if policy.refund.require_order_ownership and order and owner != session_user:
            return _blocked("refund.require_order_ownership")
        if policy.refund.cap_at_order_amount and order and amount > order["amount_inr"]:
            return _blocked("refund.cap_at_order_amount")
        if policy.refund.max_auto_inr is not None and amount > policy.refund.max_auto_inr:
            return ToolDecision(
                False,
                "guard:refund.max_auto_inr",
                {
                    "status": "pending_human_approval",
                    "order_id": args.get("order_id"),
                    "amount_inr": amount,
                    "message": "Refund request sent to the DiwaliMart team for approval.",
                },
            )
    elif tool == "get_order_status":
        if policy.orders.owner_only and order and owner != session_user:
            return _blocked("orders.owner_only")
    elif tool == "apply_coupon":
        allowed = policy.coupons.allowed_codes
        if allowed is not None and str(args.get("code", "")).upper() not in {c.upper() for c in allowed}:
            return _blocked("coupons.allowed_codes")
        if policy.orders.owner_only and order and owner != session_user:
            return _blocked("orders.owner_only")
    elif tool == "get_customer_kyc":
        if policy.kyc.owner_only and str(args.get("user_id", "")).upper() != session_user:
            return _blocked("kyc.owner_only")
    return ToolDecision(True)


def mask_pan(pan: str) -> str:
    return pan[:5] + "****" + pan[-1:] if len(pan) >= 6 else "****"


def mask_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)
    return f"+91 {digits[-10]}xxxx xx{digits[-3:]}" if len(digits) >= 10 else "xxxxx"


def post_process(tool: str, result: dict[str, Any], policy: GuardPolicy) -> dict[str, Any]:
    if tool == "get_customer_kyc" and policy.kyc.mask_pii and "pan" in result:
        result = dict(result)
        result["pan"] = mask_pan(result["pan"])
        result["phone"] = mask_phone(result.get("phone", ""))
        result["address"] = "(hidden)"
    return result


def filter_output(text: str, policy: GuardPolicy, canary: str) -> str:
    of = policy.output_filters
    if of.block_canary and canary in text:
        return CANARY_REPLY
    if of.redact_pan:
        text = PAN_RE.sub("[PAN REDACTED]", text)
    if of.redact_phone:
        text = PHONE_RE.sub("[PHONE REDACTED]", text)
    return text
