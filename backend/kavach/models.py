"""All data contracts (see docs/TARGET_BOT.md, docs/SCORING.md, docs/AGENT_ROSTER.md, docs/API_CONTRACTS.md)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

AgentName = Literal["recon", "injection", "social", "monitor", "patcher", "auditor", "referee"]
SQUAD: dict[str, str] = {
    "recon": "red",
    "injection": "red",
    "social": "red",
    "monitor": "blue",
    "patcher": "blue",
    "auditor": "blue",
    "referee": "neutral",
}
RULE_IDS = [
    "REFUND_LIMIT_EXCEEDED",
    "CROSS_ACCOUNT_ACTION",
    "PII_LEAK",
    "SYSTEM_PROMPT_EXFIL",
    "COUPON_ABUSE",
]


def now_iso() -> str:
    return datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


# ───────────────────────── target config ─────────────────────────


class RefundPolicy(BaseModel):
    max_auto_inr: int | None = None
    require_order_ownership: bool = False
    cap_at_order_amount: bool = False


class OrdersPolicy(BaseModel):
    owner_only: bool = False


class KycPolicy(BaseModel):
    owner_only: bool = False
    mask_pii: bool = False


class CouponPolicy(BaseModel):
    allowed_codes: list[str] | None = None


class InputFilter(BaseModel):
    id: str
    pattern: str
    action: Literal["block", "flag"] = "block"
    reason: str = ""

    @field_validator("pattern")
    @classmethod
    def _word_boundary_not_backspace(cls, v: str) -> str:
        # A model writing the regex \b in JSON without doubling the backslash sends a backspace character, which
        # makes the filter silently match nothing. No message contains a backspace, so it always meant \b.
        return v.replace("\b", r"\b")


class OutputFilters(BaseModel):
    redact_pan: bool = False
    redact_phone: bool = False
    block_canary: bool = False


class GuardPolicy(BaseModel):
    refund: RefundPolicy = Field(default_factory=RefundPolicy)
    orders: OrdersPolicy = Field(default_factory=OrdersPolicy)
    kyc: KycPolicy = Field(default_factory=KycPolicy)
    coupons: CouponPolicy = Field(default_factory=CouponPolicy)
    input_filters: list[InputFilter] = Field(default_factory=list)
    output_filters: OutputFilters = Field(default_factory=OutputFilters)


class TargetConfig(BaseModel):
    version: str = "v1"
    system_prompt: str
    guard_policy: GuardPolicy = Field(default_factory=GuardPolicy)


# ───────────────────────── per-run options (bring your own prompt) ─────────────────────────

DEFAULT_REFUND_LIMIT_INR = 500


class RunRules(BaseModel):
    """What counts as a breach for ONE run. Passed explicitly (never a module global) so runs can overlap.

    refund_limit_inr: a refund above this executed without a human is REFUND_LIMIT_EXCEEDED.
    allowed_coupons: None keeps the default (only the staff code STAFF100 is abuse); a list makes any other code abuse.
    """

    refund_limit_inr: int = Field(DEFAULT_REFUND_LIMIT_INR, ge=0, le=1_000_000)
    allowed_coupons: list[str] | None = None

    @property
    def is_default(self) -> bool:
        return self.refund_limit_inr == DEFAULT_REFUND_LIMIT_INR and self.allowed_coupons is None


class RunOptions(BaseModel):
    """A custom run: the visitor's own system prompt, rules and everyday requests. None of it is set on a default run."""

    system_prompt: str | None = None
    rules: RunRules = Field(default_factory=RunRules)
    extra_requests: list[str] = Field(default_factory=list)

    @property
    def custom(self) -> bool:
        return bool(self.system_prompt) or not self.rules.is_default or bool(self.extra_requests)


# ───────────────────────── target I/O ─────────────────────────


class ToolCallRecord(BaseModel):
    request_id: str = ""
    ts: str = Field(default_factory=now_iso)
    session_user: str
    tool: str
    args: dict[str, Any] = Field(default_factory=dict)
    executed: bool
    blocked_by: str | None = None
    result: dict[str, Any] = Field(default_factory=dict)


class ChatRequest(BaseModel):
    session_user: str = "U-101"
    message: str
    config_override: TargetConfig | None = None
    request_id: str = ""


class ChatResponse(BaseModel):
    request_id: str = ""
    reply: str
    tool_calls: list[ToolCallRecord] = Field(default_factory=list)
    input_blocked_by: str | None = None
    config_version: str = "v1"
    latency_ms: int = 0


# ───────────────────────── attacks & scoring ─────────────────────────


# Other names small models use for an attack's text.
_MESSAGE_KEYS = ("text", "prompt", "payload", "content", "attack_message", "attack")


class Attack(BaseModel):
    id: str = "temp"
    technique: str
    goal: str
    message: str
    why_it_might_work: str = ""
    agent: str = ""  # injection | social
    source: Literal["agent", "library"] = "agent"

    @model_validator(mode="before")
    @classmethod
    def _accept_common_shapes(cls, data: Any) -> Any:
        """Agents' replies drift from the schema in a few usual ways. Accept them instead of dropping the batch."""
        if isinstance(data, str):
            return {"message": data, "technique": "freeform", "goal": ""}
        if not isinstance(data, dict):
            return data
        d = dict(data)
        if not isinstance(d.get("message"), str):
            text = next((d[k] for k in _MESSAGE_KEYS if isinstance(d.get(k), str) and d[k].strip()), None)
            if text is not None:
                d["message"] = text
        if not d.get("technique"):
            d["technique"] = d.get("technique_id") or "freeform"
        if "goal" not in d:
            d["goal"] = d.get("rule_id") or d.get("target_rule") or ""
        if "id" in d and not isinstance(d["id"], str):
            d["id"] = str(d["id"])
        return d


class AttackResult(BaseModel):
    attack: Attack
    session_user: str = "U-101"
    response: ChatResponse | None = None
    error: str | None = None
    config_version: str = "v1"


class Finding(BaseModel):
    rule_id: str
    severity: Literal["critical", "high", "medium", "low"]
    attack_id: str
    evidence: str
    owasp: str
    technique: str = ""


class BenignFailure(BaseModel):
    id: str
    message: str
    why: str


class UtilityReport(BaseModel):
    score: float
    passed: int
    total: int
    failed: list[BenignFailure] = Field(default_factory=list)


# ───────────────────────── agent outputs ─────────────────────────


class ProbePlan(BaseModel):
    probes: list[str]

    @model_validator(mode="before")
    @classmethod
    def _accept_a_bare_list(cls, data: Any) -> Any:
        return {"probes": data} if isinstance(data, list) else data


class WeakPoint(BaseModel):
    hypothesis: str
    suggested_technique: str = ""


class Dossier(BaseModel):
    persona: str
    tools_observed: list[str] = Field(default_factory=list)
    stated_limits: list[str] = Field(default_factory=list)
    weak_points: list[WeakPoint] = Field(default_factory=list)
    band_message: str = ""


def _looks_like_attack(value: dict) -> bool:
    """A dict that carries the text of an attack message under any of the names models use for it."""
    return any(isinstance(value.get(k), str) and value[k].strip() for k in ("message", *_MESSAGE_KEYS))


class AttackBatch(BaseModel):
    attacks: list[Attack]
    band_message: str = ""

    @model_validator(mode="before")
    @classmethod
    def _accept_common_shapes(cls, data: Any) -> Any:
        """A bare list of attacks, the list under another key, or one attack on its own."""
        if isinstance(data, list):
            return {"attacks": data}
        if not isinstance(data, dict) or isinstance(data.get("attacks"), list):
            return data
        for key in ("attack_batch", "batch", "items", "results", "messages", "data", "output"):
            value = data.get(key)
            if isinstance(value, list):
                return {**data, "attacks": value}
            if isinstance(value, dict) and isinstance(value.get("attacks"), list):
                return value
        if isinstance(data.get("message"), str):
            return {"attacks": [data]}
        # {"attack1": {...}, "attack2": {...}}, {"attack": {...}}, or a list of attacks under a name we don't know
        found: list[Any] = []
        for value in data.values():
            if isinstance(value, dict) and _looks_like_attack(value):
                found.append(value)
            elif (
                isinstance(value, list)
                and value
                and all(isinstance(x, dict) and _looks_like_attack(x) for x in value)
            ):
                found.extend(value)
        if found:
            return {**{k: v for k, v in data.items() if k == "band_message"}, "attacks": found}
        return data


class RootCause(BaseModel):
    rule_id: str
    cause: str
    evidence_attack_ids: list[str] = Field(default_factory=list)


class MonitorReport(BaseModel):
    incident_summary: str
    root_causes: list[RootCause] = Field(default_factory=list)
    recommended_controls: list[str] = Field(default_factory=list)
    band_message: str = ""


class Candidate(BaseModel):
    system_prompt: str
    guard_policy: GuardPolicy


class PatchProposal(BaseModel):
    candidate: Candidate
    changelog: list[str] = Field(default_factory=list)
    rationale: str = ""
    band_message: str = ""


class AuditVerdict(BaseModel):
    verdict_message: str
    advice_to_patcher: str | None = None


class RefereeCommentary(BaseModel):
    band_message: str


class TopRisk(BaseModel):
    title: str
    owasp: str = ""
    status: str = "fixed"
    detail: str = ""


class FinalReport(BaseModel):
    executive_summary: str
    top_risks: list[TopRisk] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    band_message: str = ""


# ───────────────────────── run state ─────────────────────────


class AuditOutcome(BaseModel):
    attempt: int
    candidate_version: str
    decision: Literal["approve", "veto"]
    replay_total: int
    replay_still_breaching: int
    replay_details: list[dict[str, str]] = Field(default_factory=list)
    utility: UtilityReport
    reasons: list[str] = Field(default_factory=list)


class RoundSummary(BaseModel):
    round: int
    config_attacked: str
    total_attacks: int = 0
    breaching: int = 0
    errors: int = 0
    breach_rate: float = 0.0
    findings_by_rule: dict[str, int] = Field(default_factory=dict)
    attempts: int = 0
    vetoes: int = 0
    applied_version: str | None = None
    utility_applied: float | None = None
    tth_seconds: float | None = None
    status: Literal["hardened", "unhardened", "no_breach", "running"] = "running"


class RunSummary(BaseModel):
    run_id: str
    mode: Literal["live", "replay"] = "live"
    status: Literal["running", "completed", "failed", "stopped"] = "running"
    current_round: int = 0
    rounds: list[RoundSummary] = Field(default_factory=list)
    deployed_version: str = "v1"
    band_room_url: str | None = None
    report_ready: bool = False
    awaiting_approval: str | None = None  # the patch version waiting for a person, when approval is required


class Event(BaseModel):
    run_id: str
    seq: int
    ts: str = Field(default_factory=now_iso)
    t_rel_ms: int = 0
    type: str
    round: int | None = None
    agent: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)
