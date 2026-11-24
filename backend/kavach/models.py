"""All data contracts (see docs/TARGET_BOT.md, docs/SCORING.md, docs/AGENT_ROSTER.md, docs/API_CONTRACTS.md)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

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


class Attack(BaseModel):
    id: str = "temp"
    technique: str
    goal: str
    message: str
    why_it_might_work: str = ""
    agent: str = ""  # injection | social
    source: Literal["agent", "library"] = "agent"


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


class WeakPoint(BaseModel):
    hypothesis: str
    suggested_technique: str = ""


class Dossier(BaseModel):
    persona: str
    tools_observed: list[str] = Field(default_factory=list)
    stated_limits: list[str] = Field(default_factory=list)
    weak_points: list[WeakPoint] = Field(default_factory=list)
    band_message: str = ""


class AttackBatch(BaseModel):
    attacks: list[Attack]
    band_message: str = ""


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


class Event(BaseModel):
    run_id: str
    seq: int
    ts: str = Field(default_factory=now_iso)
    t_rel_ms: int = 0
    type: str
    round: int | None = None
    agent: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)
