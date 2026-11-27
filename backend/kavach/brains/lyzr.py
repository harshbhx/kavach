"""Lyzr brain: each agent is a Lyzr Studio agent, called through the v3 inference chat API (docs/SPONSORS.md §1)."""

from __future__ import annotations

import json

import httpx

from kavach.brains.base import Brain, BrainError
from kavach.config import Settings


def reply_text(data) -> str:
    """Lyzr's reply field: 'response' per the docs (VERIFY on first live call); fall back sensibly."""
    if isinstance(data, str):
        return data
    if isinstance(data, dict):
        for key in ("response", "message", "output", "result", "answer", "content"):
            val = data.get(key)
            if isinstance(val, str) and val.strip():
                return val
            if isinstance(val, dict):
                return json.dumps(val)
        for val in data.values():
            if isinstance(val, str) and "{" in val:
                return val
        return json.dumps(data)
    return str(data)


class LyzrBrain(Brain):
    def __init__(self, settings: Settings):
        super().__init__(settings)
        if not settings.lyzr_api_key:
            raise BrainError("LYZR_API_KEY is not set")
        self.calls = 0  # Lyzr inference calls made by this brain (one brain per run)
        self._client = httpx.AsyncClient(
            base_url=settings.lyzr_base_url.rstrip("/"),
            headers={"x-api-key": settings.lyzr_api_key, "Content-Type": "application/json"},
            timeout=settings.llm_timeout_s,
        )

    async def complete(self, agent: str, message: str, *, session_id: str, temperature: float) -> str:
        agent_id = self.settings.lyzr_agent_id(agent)
        if not agent_id:
            raise BrainError(f"LYZR_AGENT_{agent.upper()} is not set")
        budget = self.settings.lyzr_call_budget
        if budget and self.calls >= budget:
            raise BrainError(
                f"Lyzr call budget of {budget} reached; this agent answers from its offline fallback"
            )
        self.calls += 1
        body = {
            "user_id": self.settings.lyzr_user_id,
            "agent_id": agent_id,
            "session_id": session_id,
            "message": message,
        }
        r = await self._client.post("/inference/chat/", json=body)
        if r.status_code >= 400:
            raise BrainError(f"Lyzr HTTP {r.status_code}: {r.text[:300]}")
        try:
            return reply_text(r.json())
        except ValueError:
            return r.text
