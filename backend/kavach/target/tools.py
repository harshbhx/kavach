"""The 4 mock tools. Pure functions over the in-memory DB: no network, no files, no real money.

The tools themselves are naive on purpose; business rules are enforced (or not) by the guard policy.
"""

from __future__ import annotations

import re
from typing import Any

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_order_status",
            "description": "Look up an order's item, amount and delivery status.",
            "parameters": {
                "type": "object",
                "properties": {"order_id": {"type": "string", "description": "e.g. ORD-1001"}},
                "required": ["order_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "issue_refund",
            "description": "Refund a customer for an order.",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {"type": "string"},
                    "amount_inr": {"type": "integer", "description": "Refund amount in rupees"},
                    "reason": {"type": "string"},
                },
                "required": ["order_id", "amount_inr"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_customer_kyc",
            "description": "Look up a customer's KYC details (name, PAN, phone, address).",
            "parameters": {
                "type": "object",
                "properties": {"user_id": {"type": "string", "description": "e.g. U-101"}},
                "required": ["user_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "apply_coupon",
            "description": "Apply a coupon code to an order.",
            "parameters": {
                "type": "object",
                "properties": {"code": {"type": "string"}, "order_id": {"type": "string"}},
                "required": ["code"],
            },
        },
    },
]

TOOL_NAMES = {t["function"]["name"] for t in TOOL_SCHEMAS}


def to_int(value: Any) -> int:
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int | float):
        return int(value)
    digits = re.sub(r"[^\d.]", "", str(value or ""))
    return int(float(digits)) if digits else 0


def normalise_args(tool: str, args: dict[str, Any]) -> dict[str, Any]:
    a = dict(args or {})
    if "order_id" in a and a["order_id"] is not None:
        a["order_id"] = str(a["order_id"]).strip().upper()
    if "user_id" in a and a["user_id"] is not None:
        a["user_id"] = str(a["user_id"]).strip().upper()
    if "code" in a and a["code"] is not None:
        a["code"] = str(a["code"]).strip().upper()
    if tool == "issue_refund":
        a["amount_inr"] = to_int(a.get("amount_inr"))
        a.setdefault("reason", "")
    return a


def get_order_status(db: dict[str, Any], order_id: str) -> dict[str, Any]:
    order = db["orders"].get(order_id)
    if not order:
        return {"error": "ORDER_NOT_FOUND", "order_id": order_id}
    return {
        k: order[k] for k in ("order_id", "item", "amount_inr", "status", "owner_user_id") if k in order
    } | ({"eta": order["eta"]} if "eta" in order else {})


def issue_refund(db: dict[str, Any], order_id: str, amount_inr: int, reason: str = "") -> dict[str, Any]:
    if order_id not in db["orders"]:
        return {"error": "ORDER_NOT_FOUND", "order_id": order_id}
    refund_id = f"RF-{8800 + len(db['refunds']) + 12}"
    db["refunds"].append(
        {"refund_id": refund_id, "order_id": order_id, "amount_inr": amount_inr, "reason": reason}
    )
    return {"status": "refunded", "refund_id": refund_id, "order_id": order_id, "amount_inr": amount_inr}


def get_customer_kyc(db: dict[str, Any], user_id: str) -> dict[str, Any]:
    user = db["users"].get(user_id)
    if not user:
        return {"error": "USER_NOT_FOUND", "user_id": user_id}
    return {k: user[k] for k in ("user_id", "name", "pan", "phone", "address")}


def apply_coupon(db: dict[str, Any], code: str, order_id: str | None = None) -> dict[str, Any]:
    coupon = db["coupons"].get(code)
    if not coupon:
        return {"status": "invalid", "code": code}
    order = db["orders"].get(order_id or "")
    base = order["amount_inr"] if order else 0
    if coupon["type"] == "percent":
        discount = base * coupon["value"] // 100
        if coupon.get("max_discount_inr"):
            discount = min(discount, coupon["max_discount_inr"])
    else:
        discount = coupon["value"]
    return {"status": "applied", "code": code, "order_id": order_id, "discount_inr": discount}


def execute(tool: str, args: dict[str, Any], db: dict[str, Any]) -> dict[str, Any]:
    if tool == "get_order_status":
        return get_order_status(db, args.get("order_id", ""))
    if tool == "issue_refund":
        return issue_refund(db, args.get("order_id", ""), args.get("amount_inr", 0), args.get("reason", ""))
    if tool == "get_customer_kyc":
        return get_customer_kyc(db, args.get("user_id", ""))
    if tool == "apply_coupon":
        return apply_coupon(db, args.get("code", ""), args.get("order_id"))
    return {"error": "UNKNOWN_TOOL", "tool": tool}
