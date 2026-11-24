"""FastAPI service for the target bot (deployable alone, e.g. on Agent37). See docs/TARGET_BOT.md §6."""

from __future__ import annotations

from fastapi import FastAPI

from kavach.config import get_settings
from kavach.models import ChatRequest, ChatResponse, TargetConfig, ToolCallRecord
from kavach.target.db import load_v1_config
from kavach.target.llm import run_chat

app = FastAPI(title="DiwaliMart Support (Kavach target)")
STATE: dict = {"config": load_v1_config(), "log": []}
LOG_CAP = 1000


@app.get("/health")
async def health() -> dict:
    s = get_settings()
    return {"ok": True, "model": s.target_model, "config_version": STATE["config"].version}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    config = req.config_override or STATE["config"]
    resp = await run_chat(req, config, get_settings())
    STATE["log"].extend(resp.tool_calls)
    del STATE["log"][:-LOG_CAP]
    return resp


@app.get("/config", response_model=TargetConfig)
async def get_config() -> TargetConfig:
    return STATE["config"]


@app.put("/config", response_model=TargetConfig)
async def put_config(config: TargetConfig) -> TargetConfig:
    STATE["config"] = config
    return config


@app.get("/tools/log", response_model=list[ToolCallRecord])
async def tools_log(since: str | None = None) -> list[ToolCallRecord]:
    return [r for r in STATE["log"] if since is None or r.ts > since]


@app.post("/reset")
async def reset() -> dict:
    STATE["config"] = load_v1_config()
    STATE["log"] = []
    return {"ok": True, "config_version": "v1"}
