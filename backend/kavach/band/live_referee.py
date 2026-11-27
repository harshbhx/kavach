"""The live Referee: answers people who @mention it in the Band room, with numbers computed by code.

    make referee          # needs agent_config.yaml (the `referee` entry) and the `live` extra (band-sdk)

It runs as the Referee's Band identity through the Band SDK, next to the Kavach API. When a person writes
"@Referee status?" in the room, it reads the latest run from the API (KAVACH_API, default http://127.0.0.1:8000), or the
recorded demo run (runs/demo_run.jsonl) when no run is live, and replies to them. Every number comes from the run's
RunSummary; no model is asked for a score. It ignores messages from agents, so the squads' own handoffs to @Referee
never trigger a reply.

Questions it understands: status (the default), breaches, patch, report, help. When the run asks for human approval
(APPROVAL_REQUIRED=true), `@Referee approve v2` or `@Referee reject v2 because ...` settles the patch that is waiting,
through POST /api/runs/{run_id}/approval.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Any, ClassVar

import httpx

from kavach.config import REPO_ROOT
from kavach.models import RoundSummary, RunSummary
from kavach.orchestrator.replay import load_events

log = logging.getLogger(__name__)

DEMO_RUN = REPO_ROOT / "runs" / "demo_run.jsonl"
HELP = (
    "Ask me: `status` for the score by round, `breaches` for what broke, `patch` for what the blue squad shipped, "
    "or `report` for the audit report. When a patch is waiting for you, say `approve v2` or `reject v2 because ...`. "
    "Every number comes from code, read from the target's tool-call log."
)
DECISION = re.compile(r"^\s*(?P<word>approve[ds]?|ship it|reject(?:ed|s)?)\b", re.IGNORECASE)
LEADING_MENTIONS = re.compile(r"^(?:\s*@\S+[\s,:]*)+")
VERSION = re.compile(r"\bv(\d{1,3})\b", re.IGNORECASE)
REASON = re.compile(r"(?:\bbecause\b|:|—| - )\s*(?P<why>.+)$", re.IGNORECASE | re.DOTALL)


def _pct(v: float | None) -> str:
    return "n/a" if v is None else f"{round(v * 100)}%"


def summary_from_jsonl(path: Path) -> RunSummary | None:
    """Build a RunSummary from a recorded run (runs/*.jsonl), without replaying its timing."""
    try:
        events = load_events(path)
    except (OSError, ValueError) as exc:
        log.warning("cannot read %s: %s", path, exc)
        return None
    if not events:
        return None
    summary = RunSummary(run_id=events[0].run_id, mode="replay", status="completed")
    for ev in events:
        if ev.type == "round.scored":
            rs = RoundSummary.model_validate(ev.data)
            summary.rounds = [r for r in summary.rounds if r.round != rs.round] + [rs]
            summary.current_round = max(summary.current_round, rs.round)
        elif ev.type == "patch.applied":
            summary.deployed_version = ev.data.get("version", summary.deployed_version)
        elif ev.type == "band.room":
            summary.band_room_url = ev.data.get("url")
        elif ev.type in ("report.ready", "replay.extras"):
            summary.report_ready = True
    summary.rounds.sort(key=lambda r: r.round)
    return summary


async def latest_summary(api_base: str, client: httpx.AsyncClient | None = None) -> RunSummary | None:
    """The newest run the Kavach API knows about, or None if the API is down or has no runs."""
    own = client is None
    client = client or httpx.AsyncClient(timeout=5.0)
    try:
        runs = (await client.get(f"{api_base}/api/runs")).raise_for_status().json()
        if not runs:
            return None
        run_id = runs[-1]["run_id"]
        data = (await client.get(f"{api_base}/api/runs/{run_id}")).raise_for_status().json()
        return RunSummary.model_validate(data)
    except (httpx.HTTPError, ValueError, KeyError, IndexError) as exc:
        log.info("no live run from %s (%s)", api_base, exc)
        return None
    finally:
        if own:
            await client.aclose()


def _round_line(r: RoundSummary) -> str:
    line = f"Round {r.round} on {r.config_attacked}: {r.breaching} of {r.total_attacks} attacks breached ({_pct(r.breach_rate)})"
    if r.applied_version:
        line += f", patched to {r.applied_version} with utility {_pct(r.utility_applied)}"
        if r.tth_seconds is not None:
            line += f", {r.tth_seconds:.0f} s into the round"
    elif r.status == "no_breach":
        line += ", nothing to patch"
    elif r.status == "unhardened":
        line += ", no patch passed the Auditor"
    return line + "."


def parse_decision(text: str) -> tuple[str, str | None, str | None] | None:
    """("approve" | "reject", version or None, reason or None) if a person is deciding a patch, else None.

    The decision word must open the message (after any @mentions), so a question like "should I approve v2?"
    never ships a patch."""
    text = LEADING_MENTIONS.sub("", text, count=1)
    m = DECISION.search(text)
    if not m:
        return None
    decision = "reject" if m.group("word").lower().startswith("reject") else "approve"
    v = VERSION.search(text)
    why = REASON.search(text[m.end() :])
    reason = why.group("why").strip()[:300] if why and decision == "reject" else None
    return decision, (f"v{v.group(1)}" if v else None), reason or None


def answer(question: str, summary: RunSummary | None, report_url: str | None = None) -> str:
    """The Referee's reply to one question. Pure: same summary in, same words out."""
    q = question.lower()
    waiting = summary.awaiting_approval if summary else None
    if waiting and not re.search(r"\b(help|report|breach|breaches|broke|findings?|rules?)\b", q):
        return (
            f"{waiting} passed the Auditor and is waiting for you: say `approve {waiting}` to ship it or "
            f"`reject {waiting} because ...` to send it back. "
            + answer("status", summary.model_copy(update={"awaiting_approval": None}), report_url)
        )
    if re.search(r"\b(help|commands?|what can you)\b", q):
        return HELP
    if summary is None or not summary.rounds:
        return "No run has been scored yet. Start one from the dashboard and ask me again. " + HELP
    head = f"Run {summary.run_id} ({summary.status}, {summary.mode})"
    if re.search(r"\breport\b", q):
        if summary.report_ready and report_url:
            return f"{head}: the audit report is at {report_url}"
        if summary.report_ready:
            return f"{head}: the audit report is ready on the dashboard."
        return f"{head}: the report is written when the run completes."
    if re.search(r"\b(breach|breaches|broke|findings?|rules?)\b", q):
        parts = []
        for r in summary.rounds:
            found = ", ".join(f"{k} ×{v}" for k, v in r.findings_by_rule.items()) or "no breaches"
            parts.append(f"round {r.round}: {found}")
        return f"{head}. Breaches by rule, " + "; ".join(parts) + "."
    if re.search(r"\b(patch|patches|fix|guard|veto|vetoes|shipped)\b", q):
        patched = [r for r in summary.rounds if r.applied_version]
        vetoes = sum(r.vetoes for r in summary.rounds)
        if not patched:
            return f"{head}: no patch has shipped yet ({vetoes} vetoed). Deployed config: {summary.deployed_version}."
        shipped = "; ".join(
            f"{r.applied_version} in round {r.round} after {r.attempts} attempt(s), utility {_pct(r.utility_applied)}"
            for r in patched
        )
        return f"{head}. Shipped: {shipped}. Vetoed: {vetoes}. Deployed config: {summary.deployed_version}."
    trend = " → ".join(_pct(r.breach_rate) for r in summary.rounds)
    lines = " ".join(_round_line(r) for r in summary.rounds)
    return f"{head}. Breach rate {trend}. {lines} Deployed config: {summary.deployed_version}."


Source = Callable[[], Awaitable[tuple[RunSummary | None, str | None]]]
Decider = Callable[[str, str | None, str, str | None], Awaitable[str]]


def default_source(api_base: str | None = None, demo_run: Path = DEMO_RUN) -> Source:
    """The live run from the API if there is one, else the recorded demo run."""
    base = (api_base or os.environ.get("KAVACH_API") or "http://127.0.0.1:8000").rstrip("/")

    async def source() -> tuple[RunSummary | None, str | None]:
        live = await latest_summary(base)
        if live:
            return live, f"{base}/api/runs/{live.run_id}/report.md"
        return summary_from_jsonl(demo_run), None

    return source


def default_decider(api_base: str | None = None) -> Decider:
    """Forward a person's approve/reject to the run that is waiting, and say what happened."""
    base = (api_base or os.environ.get("KAVACH_API") or "http://127.0.0.1:8000").rstrip("/")

    async def decide(decision: str, version: str | None, by: str, reason: str | None) -> str:
        async with httpx.AsyncClient(timeout=5.0) as client:
            summary = await latest_summary(base, client)
            if summary is None or not summary.awaiting_approval:
                return "No patch is waiting for approval right now."
            body = {"decision": decision, "version": version, "by": by, "source": "band", "reason": reason}
            try:
                r = await client.post(f"{base}/api/runs/{summary.run_id}/approval", json=body)
            except httpx.HTTPError as exc:
                log.warning("approval forward failed: %s", exc)
                return "I couldn't reach the Kavach API to record that. Try the dashboard."
            if r.status_code == 409:
                return f"{r.json().get('detail', 'That patch is no longer waiting')}."
            if r.status_code >= 400:
                return "The Kavach API refused that decision. Try the dashboard."
        v = summary.awaiting_approval
        if decision == "approve":
            return f"Approved {v}. Shipping it now."
        return f"Rejected {v}" + (f" ({reason})" if reason else "") + ". The Patcher will try again."

    return decide


def is_person(sender_type: str | None) -> bool:
    return (sender_type or "User") not in ("Agent", "System")


try:  # the Band SDK is optional: `uv sync --extra live`
    from band import Capability, Emit
    from band.core import AgentToolsProtocol, SimpleAdapter
    from band.core.delivery import relay_reply
    from band.core.types import PlatformMessage
except ImportError:  # pragma: no cover - exercised only without the extra
    SimpleAdapter = None  # type: ignore[assignment,misc]


class _NoHistory:
    """The Referee answers each question on its own, so it keeps no transcript."""

    def convert(self, raw: list[dict[str, Any]]) -> list[str]:
        return []

    def set_agent_name(self, name: str) -> None:
        return None


if SimpleAdapter is not None:

    class RefereeAdapter(SimpleAdapter[list[str]]):
        SUPPORTED_EMIT: ClassVar[frozenset[Emit]] = frozenset()
        SUPPORTED_CAPABILITIES: ClassVar[frozenset[Capability]] = frozenset()

        def __init__(
            self, source: Source | None = None, decider: Decider | None = None, **features: Any
        ) -> None:
            super().__init__(history_converter=_NoHistory(), **features)
            self.source = source or default_source()
            self.decider = decider or default_decider()

        async def on_message(
            self,
            msg: PlatformMessage,
            tools: AgentToolsProtocol,
            history: list[str],
            participants_msg: str | None,
            contacts_msg: str | None,
            *,
            is_session_bootstrap: bool,
            room_id: str,
        ) -> None:
            if not is_person(msg.sender_type):
                return  # the squads @mention the Referee in their handoffs; only people get answers
            parsed = parse_decision(msg.content)
            if parsed:
                decision, version, reason = parsed
                text = await self.decider(decision, version, msg.sender_name or msg.sender_id, reason)
            else:
                summary, report_url = await self.source()
                text = answer(msg.content, summary, report_url)
            if msg.sender_name:
                text = f"@{msg.sender_name} {text}"
            await relay_reply(tools, text, mentions=[msg.sender_id])
            log.info("answered %s in room %s", msg.sender_name or msg.sender_id, room_id)

        async def on_cleanup(self, room_id: str) -> None:
            return None


def main() -> None:  # pragma: no cover - needs Band credentials
    if SimpleAdapter is None:
        raise SystemExit(
            "The live Referee needs the Band SDK: run `uv sync --extra live` (or `make referee`)."
        )
    from band import Agent, configure_logging

    configure_logging()
    config = Path(os.environ.get("BAND_AGENT_CONFIG") or REPO_ROOT / "agent_config.yaml")
    agent = Agent.from_config("referee", adapter=RefereeAdapter(), config_path=config)
    asyncio.run(agent.run())


if __name__ == "__main__":
    main()
