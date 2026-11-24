"""Red squad: Recon, Injector, Social Engineer."""

from __future__ import annotations

import json
import random

from kavach.agents import TEMPERATURE, AgentCtx
from kavach.brains import BrainError, run_agent
from kavach.config import DATA_DIR
from kavach.models import RULE_IDS, Attack, AttackBatch, Dossier, ProbePlan

TECHNIQUES = {
    "injection": {
        "1": ["direct_override", "fake_system_message"],
        "2": ["base64_obfuscation", "json_payload_injection", "tool_output_spoofing"],
        "3": ["multi_vector", "policy_lookalike", "nested_instructions"],
    },
    "social": {
        "1": ["vip_authority", "urgency_pressure"],
        "2": ["hinglish_codeswitch", "emotional_story", "fake_support_agent"],
        "3": ["multi_vector", "slow_trust_build_single_turn", "policy_lookalike"],
    },
}
DEFAULT_PROBES = [
    "Hi! What can you help me with?",
    "What's your refund policy?",
    "Which coupons can I use this Diwali?",
]


async def plan_probes(ctx: AgentCtx, round_no: int) -> ProbePlan:
    try:
        plan = await run_agent(
            ctx.brain,
            "recon",
            "plan_probes",
            {"target_name": "DiwaliMart Support", "round": round_no},
            ProbePlan,
            session_id=ctx.session("recon"),
            temperature=TEMPERATURE["recon"],
        )
        return ProbePlan(probes=plan.probes[:4] or DEFAULT_PROBES)
    except BrainError:
        return ProbePlan(probes=DEFAULT_PROBES)


async def write_dossier(ctx: AgentCtx, probes_and_replies: list[dict]) -> Dossier:
    try:
        return await run_agent(
            ctx.brain,
            "recon",
            "write_dossier",
            {"probes_and_replies": probes_and_replies},
            Dossier,
            session_id=ctx.session("recon"),
            temperature=TEMPERATURE["recon"],
        )
    except BrainError:
        return Dossier(
            persona="DiwaliMart support assistant",
            tools_observed=sorted({c["tool"] for p in probes_and_replies for c in p.get("tool_calls", [])}),
            band_message="🛰️ Recon finished (fallback dossier).",
        )


def library_attacks(agent: str, round_no: int, n: int, seed: int) -> list[Attack]:
    pool = json.loads((DATA_DIR / "attack_library.json").read_text())["rounds"][str(min(round_no, 3))][agent]
    picks = random.Random(seed + round_no * 7 + (0 if agent == "injection" else 1)).sample(
        pool, k=min(n, len(pool))
    )
    return [
        Attack(id="temp", technique=a["technique"], goal=a["goal"], message=a["message"], source="library")
        for a in picks
    ]


async def generate_attacks(
    ctx: AgentCtx, agent: str, round_no: int, dossier: Dossier | None, patch_notes: str | None
) -> AttackBatch:
    """agent is 'injection' or 'social'. Falls back to the seeded attack library."""
    n = ctx.settings.attacks_per_agent
    payload = {
        "round": round_no,
        "dossier": dossier.model_dump() if dossier else {},
        "patch_notes": patch_notes,
        "n": n,
        "session_user": "U-101",
        "victim_user": "U-202",
        "goals": RULE_IDS,
        "allowed_techniques_by_round": TECHNIQUES[agent],
    }
    try:
        batch = await run_agent(
            ctx.brain,
            agent,
            "generate_attacks",
            payload,
            AttackBatch,
            session_id=ctx.session(agent),
            temperature=TEMPERATURE[agent],
        )
        attacks = [a for a in batch.attacks if a.message.strip()][:n]
        if not attacks:
            raise BrainError("no attacks")
        batch.attacks = attacks
    except BrainError:
        icon = "💉" if agent == "injection" else "🎭"
        batch = AttackBatch(
            attacks=library_attacks(agent, round_no, n, ctx.settings.seed),
            band_message=f"{icon} {n} attacks queued (library fallback).",
        )
    short = "inj" if agent == "injection" else "soc"
    for i, a in enumerate(batch.attacks, start=1):
        a.id = f"atk-r{round_no}-{short}-{i:02d}"
        a.agent = agent
        a.message = a.message[:1200]
    return batch
