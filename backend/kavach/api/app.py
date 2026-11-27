"""REST + SSE API for the dashboard. One run at a time."""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field, field_validator
from sse_starlette.sse import EventSourceResponse

from kavach.config import get_settings
from kavach.models import RunOptions, RunRules, RunSummary, TargetConfig
from kavach.orchestrator.events import EventBus
from kavach.orchestrator.replay import replay
from kavach.runtime import build_run, new_run_id, save_extras
from kavach.target_client import TargetClient

log = logging.getLogger(__name__)
app = FastAPI(title="Kavach API")
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.dashboard_origin,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@dataclass
class RunHandle:
    summary: RunSummary
    bus: EventBus
    task: asyncio.Task | None = None
    configs: dict[str, dict] = field(default_factory=dict)
    report_md: str | None = None
    live_state: object | None = None  # RunState of a live run, so configs are viewable while it runs

    def all_configs(self) -> dict[str, dict]:
        live = getattr(self.live_state, "configs", None) or {}
        return {**{k: v.model_dump() for k, v in live.items()}, **self.configs}


RUNS: dict[str, RunHandle] = {}


CUSTOM_MAX_ROUNDS = 3  # a bring-your-own-prompt run is small on purpose: it costs real model calls
CUSTOM_MAX_ATTACKS = 3
_COUPON_CODE = re.compile(r"^[A-Za-z0-9_-]{1,24}$")


class RulesIn(BaseModel):
    """The visitor's own rules for what counts as a breach. Omitted fields keep the defaults."""

    refund_limit_inr: int | None = Field(None, ge=0, le=1_000_000)
    allowed_coupons: list[str] | None = Field(None, max_length=12)

    @field_validator("allowed_coupons")
    @classmethod
    def _coupons(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        out: list[str] = []
        for code in v:
            code = code.strip()
            if not _COUPON_CODE.match(code):
                raise ValueError(f"coupon code {code!r} must be 1 to 24 letters, digits, - or _")
            if code.upper() not in out:
                out.append(code.upper())
        return out


class StartRun(BaseModel):
    mode: Literal["live", "replay"] = "live"
    rounds: int | None = Field(None, ge=1, le=10)
    attacks_per_agent: int | None = Field(None, ge=1, le=10)
    replay_file: str | None = None
    speed: float = 1.0
    # Bring your own prompt (live runs only). All optional: omitting them leaves a run exactly as it was.
    system_prompt: str | None = Field(None, max_length=8000)
    rules: RulesIn | None = None
    extra_requests: list[str] = Field(default_factory=list, max_length=5)
    # Ask a person before each patch ships (Band room or dashboard). None keeps APPROVAL_REQUIRED from .env.
    require_approval: bool | None = None

    @field_validator("system_prompt")
    @classmethod
    def _prompt(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        if len(v) < 20:
            raise ValueError("system_prompt must be at least 20 characters")
        return v

    @field_validator("extra_requests")
    @classmethod
    def _requests(cls, v: list[str]) -> list[str]:
        out = [r.strip() for r in v if r.strip()]
        for r in out:
            if len(r) > 300:
                raise ValueError("each extra request must be 300 characters or fewer")
        return out

    def options(self) -> RunOptions | None:
        """The custom-run options, or None when none of the three was given."""
        rules = RunRules()
        if self.rules:
            if self.rules.refund_limit_inr is not None:
                rules.refund_limit_inr = self.rules.refund_limit_inr
            rules.allowed_coupons = self.rules.allowed_coupons
        opts = RunOptions(system_prompt=self.system_prompt, rules=rules, extra_requests=self.extra_requests)
        return opts if opts.custom else None


def _active() -> RunHandle | None:
    return next((h for h in RUNS.values() if h.task and not h.task.done()), None)


@app.get("/api/health")
async def health() -> dict:
    target_ok = False
    try:
        client = TargetClient(settings)
        await client.health()
        target_ok = True
        await client.aclose()
    except Exception:
        pass
    return {
        "ok": True,
        "brain_provider": settings.brain_provider,
        "band_enabled": settings.band_enabled,
        "target_url": settings.target_url,
        "target_model": settings.target_model,
        "target_ok": target_ok,
    }


@app.get("/api/replays")
async def list_replays() -> list[dict]:
    files = sorted(
        settings.runs_path.glob("*.jsonl"), key=lambda p: (p.name != "demo_run.jsonl", -p.stat().st_mtime)
    )
    return [{"file": p.name, "size": p.stat().st_size} for p in files]


@app.get("/api/scoreboard")
async def get_scoreboard() -> dict:
    """The recorded runs in runs/gallery/, summed up by victim model (kavach/scoreboard.py)."""
    from kavach.scoreboard import scoreboard

    return scoreboard(settings.runs_path / "gallery")


@app.post("/api/runs", status_code=201)
async def start_run(body: StartRun) -> dict:
    if _active():
        raise HTTPException(409, "a run is already active")
    if body.mode == "replay":
        name = body.replay_file or "demo_run.jsonl"
        path = (settings.runs_path / Path(name).name).resolve()
        if not path.exists():
            raise HTTPException(404, f"replay file {name} not found in runs/")
        run_id = new_run_id()
        bus = EventBus(run_id)
        handle = RunHandle(summary=RunSummary(run_id=run_id, mode="replay"), bus=bus)

        async def go():
            extras = await replay(path, bus, handle.summary, body.speed)
            handle.configs = extras.get("configs", {})
            handle.report_md = extras.get("report_md")

        handle.task = asyncio.create_task(go())
        RUNS[run_id] = handle
        return {"run_id": run_id}

    s = settings.model_copy()
    if body.rounds:
        s.rounds = body.rounds
    if body.attacks_per_agent:
        s.attacks_per_agent = body.attacks_per_agent
    if body.require_approval is not None:
        s.approval_required = body.require_approval
    options = body.options()
    if options:  # custom runs are capped; the prompt is never logged
        s.rounds = min(s.rounds, CUSTOM_MAX_ROUNDS)
        s.attacks_per_agent = min(s.attacks_per_agent, CUSTOM_MAX_ATTACKS)
    run = build_run(s, options=options)
    handle = RunHandle(summary=run.state.summary, bus=run.bus, live_state=run.state)

    async def go_live():
        state = await run.run()
        save_extras(state, run.bus.log_path)
        handle.configs = {k: v.model_dump() for k, v in state.configs.items()}
        handle.report_md = state.report_md

    handle.task = asyncio.create_task(go_live())
    RUNS[run.run_id] = handle
    return {"run_id": run.run_id}


def _get(run_id: str) -> RunHandle:
    h = RUNS.get(run_id)
    if not h:
        raise HTTPException(404, "unknown run")
    return h


class ApprovalIn(BaseModel):
    decision: Literal["approve", "reject"]
    version: str | None = Field(None, max_length=12)  # optional guard: must match the version waiting
    by: str = Field("dashboard", min_length=1, max_length=80)
    source: Literal["dashboard", "band", "api"] = "dashboard"
    reason: str | None = Field(None, max_length=300)


@app.post("/api/runs/{run_id}/approval")
async def decide_approval(run_id: str, body: ApprovalIn) -> dict:
    """A person approves or rejects the patch waiting in this run (see orchestrator/approval.py)."""
    pending = getattr(_get(run_id).live_state, "approval", None)
    if pending is None or pending.future.done():
        raise HTTPException(409, "no patch is waiting for approval")
    if body.version and body.version != pending.version:
        raise HTTPException(409, f"{pending.version} is waiting, not {body.version}")
    pending.decide(body.decision, body.by.strip(), body.source, (body.reason or "").strip() or None)
    return {"ok": True, "version": pending.version, "decision": body.decision}


@app.get("/api/runs")
async def list_runs() -> list[dict]:
    return [{"run_id": k, "mode": h.summary.mode, "status": h.summary.status} for k, h in RUNS.items()]


@app.get("/api/runs/{run_id}", response_model=RunSummary)
async def get_run(run_id: str) -> RunSummary:
    return _get(run_id).summary


@app.get("/api/runs/{run_id}/events")
async def run_events(run_id: str, request: Request, from_seq: int = 0):
    h = _get(run_id)
    last = request.headers.get("last-event-id")
    if last and last.isdigit():  # EventSource reconnect: resume after the last event it saw
        from_seq = max(from_seq, int(last) + 1)

    async def gen():
        async for ev in h.bus.subscribe(from_seq):
            yield {"event": ev.type, "id": str(ev.seq), "data": ev.model_dump_json()}

    return EventSourceResponse(gen(), ping=15)


@app.get("/api/runs/{run_id}/configs/{key}", response_model=TargetConfig)
async def get_config(run_id: str, key: str) -> TargetConfig:
    configs = _get(run_id).all_configs()
    if key not in configs:
        raise HTTPException(404, "unknown config")
    return TargetConfig.model_validate(configs[key])


@app.get("/api/runs/{run_id}/configs")
async def list_configs(run_id: str) -> dict[str, dict]:
    return _get(run_id).all_configs()


@app.get("/api/runs/{run_id}/report.md", response_class=PlainTextResponse)
async def report(run_id: str) -> PlainTextResponse:
    h = _get(run_id)
    if not h.report_md:
        raise HTTPException(404, "report not ready")
    return PlainTextResponse(
        h.report_md,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="kavach-report-{run_id}.md"'},
    )


@app.post("/api/runs/{run_id}/stop")
async def stop(run_id: str) -> dict:
    h = _get(run_id)
    if h.task and not h.task.done():
        h.task.cancel()
    return {"stopped": True}
