"""Replay a recorded run (runs/*.jsonl) with its original timing, for reliable demos."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

from kavach.models import Event, RoundSummary, RunSummary
from kavach.orchestrator.events import EventBus


def load_events(path: Path) -> list[Event]:
    return [Event.model_validate(json.loads(line)) for line in path.read_text().splitlines() if line.strip()]


async def replay(path: Path, bus: EventBus, summary: RunSummary, speed: float = 1.0) -> dict:
    """Re-emits every event under the new run id. Returns {'report_md': ..., 'configs': {...}} if present."""
    events = load_events(path)
    speed = max(speed, 0.1)
    prev = 0
    extras: dict = {}
    try:
        for ev in events:
            delay = (ev.t_rel_ms - prev) / 1000 / speed
            prev = ev.t_rel_ms
            # keep a readable pace even for runs recorded with instant fake brains
            floor = 0.8 if ev.type == "agent.message" else 0.05
            await asyncio.sleep(min(max(delay, floor / speed), 8))
            if ev.type == "replay.extras":  # report + configs saved at the end of a live run
                extras = ev.data
                continue
            bus.emit(
                ev.type,
                {**ev.data, "replayed": True},
                round=ev.round,
                agent=ev.agent,
                t_rel_ms=int(ev.t_rel_ms / speed),
            )
            if ev.type == "round.scored":
                rs = RoundSummary.model_validate({k: v for k, v in ev.data.items() if k != "replayed"})
                summary.rounds = [x for x in summary.rounds if x.round != rs.round] + [rs]
                summary.current_round = rs.round
            elif ev.type == "patch.applied":
                summary.deployed_version = ev.data.get("version", summary.deployed_version)
            elif ev.type == "band.room":
                summary.band_room_url = ev.data.get("url")
        summary.status = "completed"
        summary.report_ready = bool(extras.get("report_md"))
    finally:
        bus.close()
    return extras
