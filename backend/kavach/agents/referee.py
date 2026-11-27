"""Referee: narrates code-computed scores and writes the final report.

The numbers in every Referee message are formatted here, from the scored round, never taken from the model. The model
only contributes a short comment, and a comment that contains digits is dropped, so it cannot misquote a figure
("utility 1.0%" for 100%) or invent one.
"""

from __future__ import annotations

import re

from kavach.agents import TEMPERATURE, AgentCtx
from kavach.brains import BrainError, run_agent
from kavach.models import FinalReport, RefereeCommentary, RoundSummary

_DIGITS = re.compile(r"\d")


def pct(value: float | None) -> str:
    """0.923 -> '92%'; None -> 'n/a'. Accepts fractions only: a bare 1.0 means 100%, never '1%'."""
    return "n/a" if value is None else f"{round(value * 100)}%"


def round_facts(summary: RoundSummary) -> str:
    """One line with the round's numbers, formatted from code."""
    line = (
        f"⚖️ Round {summary.round}: breach {pct(summary.breach_rate)} "
        f"({summary.breaching} of {summary.total_attacks} attacks landed), utility {pct(summary.utility_applied)}, "
        f"{summary.attempts} patch attempt{'s' if summary.attempts != 1 else ''}, "
        f"{summary.vetoes} veto{'es' if summary.vetoes != 1 else ''}"
    )
    if summary.tth_seconds is not None:
        line += f", hardened in {round(summary.tth_seconds)}s"
    return f"{line}, status {summary.status}."


def final_facts(payload: dict) -> str:
    """The closing line: the breach trend, the final utility and the attack count, from the scored rounds."""
    rounds = payload.get("rounds", [])
    trend = " → ".join(pct(r.get("breach_rate")) for r in rounds) or "n/a"
    total = sum(int(r.get("total_attacks") or 0) for r in rounds)
    landed = sum(int(r.get("breaching") or 0) for r in rounds)
    return (
        f"⚖️ Final: breach rate {trend}, utility {pct(payload.get('final_utility'))}, "
        f"{total} attacks in all, {landed} landed. The report is ready."
    )


def clean_comment(text: str) -> str:
    """The model's comment, kept only when it has no digits (numbers come from code) and is short."""
    text = " ".join((text or "").split())
    if not text or _DIGITS.search(text):
        return ""
    first = re.split(r"(?<=[.!?])\s", text, maxsplit=1)[0]
    return first[:160]


def compose(facts: str, model_text: str) -> str:
    comment = clean_comment(model_text)
    return f"{facts} {comment}".strip() if comment else facts


async def round_commentary(ctx: AgentCtx, summary: RoundSummary, monitor_summary: str) -> RefereeCommentary:
    payload = summary.model_dump() | {"monitor_summary": monitor_summary}
    facts = round_facts(summary)
    try:
        reply = await run_agent(
            ctx.brain,
            "referee",
            "round_commentary",
            payload,
            RefereeCommentary,
            session_id=ctx.session("referee"),
            temperature=TEMPERATURE["referee"],
        )
    except BrainError:
        return RefereeCommentary(band_message=facts)
    return RefereeCommentary(band_message=compose(facts, reply.band_message))


async def final_report(ctx: AgentCtx, payload: dict) -> FinalReport:
    facts = final_facts(payload)
    try:
        report = await run_agent(
            ctx.brain,
            "referee",
            "final_report",
            payload,
            FinalReport,
            session_id=ctx.session("referee"),
            temperature=TEMPERATURE["referee"],
        )
    except BrainError:
        trend = " → ".join(pct(r.get("breach_rate")) for r in payload.get("rounds", []))
        return FinalReport(executive_summary=f"Breach rate by round: {trend}.", band_message=facts)
    return report.model_copy(update={"band_message": compose(facts, report.band_message)})
