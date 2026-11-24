"""Builds and runs a Kavach run (shared by the API and the CLI)."""

from __future__ import annotations

import secrets
from datetime import datetime
from pathlib import Path

from kavach.band.room import BandRoom
from kavach.brains import make_brain
from kavach.config import Settings
from kavach.models import RunOptions
from kavach.orchestrator.events import EventBus
from kavach.orchestrator.run import KavachRun, RunState
from kavach.target_client import TargetClient


def new_run_id() -> str:
    return f"kv-{datetime.now().strftime('%Y%m%d-%H%M')}-{secrets.token_hex(2)}"


def build_run(
    settings: Settings,
    run_id: str | None = None,
    bus: EventBus | None = None,
    options: RunOptions | None = None,
) -> KavachRun:
    run_id = run_id or new_run_id()
    bus = bus or EventBus(run_id, settings.runs_path / f"{run_id}.jsonl")
    return KavachRun(
        settings,
        run_id,
        bus,
        make_brain(settings),
        TargetClient(settings),
        BandRoom(settings, bus, run_id),
        options=options,
    )


def save_extras(state: RunState, path: Path | None) -> None:
    """Append the report and configs to the JSONL so a replay can serve them too."""
    if not path:
        return
    import json

    from kavach.models import Event

    ev = Event(
        run_id=state.summary.run_id,
        seq=-1,
        t_rel_ms=0,
        type="replay.extras",
        data={"report_md": state.report_md, "configs": {k: v.model_dump() for k, v in state.configs.items()}},
    )
    line = ev.model_dump()
    # put it last but with the final timestamp so the replay doesn't pause for it
    with path.open("r", encoding="utf-8") as fh:
        last = [ln for ln in fh.read().splitlines() if ln.strip()]
    if last:
        line["t_rel_ms"] = json.loads(last[-1]).get("t_rel_ms", 0)
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(line) + "\n")
