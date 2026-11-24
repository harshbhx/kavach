"""Referee: narrates code-computed scores and writes the final report."""

from __future__ import annotations

from kavach.agents import TEMPERATURE, AgentCtx
from kavach.brains import BrainError, run_agent
from kavach.models import FinalReport, RefereeCommentary, RoundSummary


async def round_commentary(ctx: AgentCtx, summary: RoundSummary, monitor_summary: str) -> RefereeCommentary:
    payload = summary.model_dump() | {"monitor_summary": monitor_summary}
    try:
        return await run_agent(
            ctx.brain,
            "referee",
            "round_commentary",
            payload,
            RefereeCommentary,
            session_id=ctx.session("referee"),
            temperature=TEMPERATURE["referee"],
        )
    except BrainError:
        util = f"{round(summary.utility_applied * 100)}%" if summary.utility_applied is not None else "n/a"
        return RefereeCommentary(
            band_message=f"⚖️ Round {summary.round}: breach {round(summary.breach_rate * 100)}%, utility {util}, status {summary.status}."
        )


async def final_report(ctx: AgentCtx, payload: dict) -> FinalReport:
    try:
        return await run_agent(
            ctx.brain,
            "referee",
            "final_report",
            payload,
            FinalReport,
            session_id=ctx.session("referee"),
            temperature=TEMPERATURE["referee"],
        )
    except BrainError:
        trend = " → ".join(f"{round(r['breach_rate'] * 100)}%" for r in payload.get("rounds", []))
        return FinalReport(
            executive_summary=f"Breach rate by round: {trend}.",
            band_message=f"⚖️ Final: {trend}. Report is ready.",
        )
