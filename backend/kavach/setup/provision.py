"""Create the seven Kavach agents on Lyzr and on Band from the prompts in prompts/agents/.

Lyzr: POST {LYZR_BASE_URL}/agents/ (x-api-key) -> {"agent_id": ...}
Band: POST {BAND_API_BASE}/me/agents/register (X-API-Key = your *user* API key) -> agent id + agent API key (shown once)

Both APIs are called with httpx so tests can mock them with respx. Field names that the docs leave open are tried in
order and reported, so a mismatch shows up as a clear message instead of a stack trace.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

import httpx

from kavach.brains.base import PROMPT_FILES
from kavach.config import PROMPTS_DIR

AGENTS = ["recon", "injection", "social", "monitor", "patcher", "auditor", "referee"]
DISPLAY = {
    "recon": "Recon",
    "injection": "Injector",
    "social": "Social Engineer",
    "monitor": "Monitor",
    "patcher": "Patcher",
    "auditor": "Auditor",
    "referee": "Referee",
}
DESCRIPTION = {
    "recon": "Kavach red team: maps the target bot with harmless questions",
    "injection": "Kavach red team: technical prompt-injection attacks",
    "social": "Kavach red team: social-engineering attacks, incl. Hinglish",
    "monitor": "Kavach blue team: explains each breach and its root cause",
    "patcher": "Kavach blue team: rewrites the system prompt and guard policy",
    "auditor": "Kavach blue team: replays exploits and benign requests, approves or vetoes",
    "referee": "Kavach referee: opens the room, keeps score, writes the report",
}


class ProvisionError(RuntimeError):
    pass


def _section(md: str, title: str) -> str:
    m = re.search(rf"^# {title}\s*\n(.*?)(?=^# |\Z)", md, flags=re.S | re.M)
    return m.group(1).strip() if m else ""


def agent_payload(agent: str, provider: str, model: str, credential: str) -> dict[str, Any]:
    md = (PROMPTS_DIR / "agents" / PROMPT_FILES[agent]).read_text()
    return {
        "name": f"Kavach {DISPLAY[agent]}",
        "description": DESCRIPTION[agent],
        "agent_role": _section(md, "Role") or f"You are {DISPLAY[agent]} in Kavach.",
        "agent_goal": _section(md, "Goal"),
        "agent_instructions": md,
        "provider_id": provider,
        "model": model,
        "llm_credential_id": credential,
        "temperature": 0.4,
        "top_p": 0.9,
        "store_messages": True,
        "features": [],
        "tools": [],
    }


def _find(data: Any, *keys: str) -> str | None:
    """First string value for any of `keys`, looking one level into common wrappers."""
    if isinstance(data, dict):
        for k in keys:
            v = data.get(k)
            if isinstance(v, (str, int)) and str(v):
                return str(v)
        for wrapper in ("data", "agent", "result"):
            if isinstance(data.get(wrapper), dict):
                found = _find(data[wrapper], *keys)
                if found:
                    return found
    return None


@dataclass
class LyzrProvisioner:
    api_key: str
    base_url: str = "https://agent-prod.studio.lyzr.ai/v3"
    provider: str = "OpenAI"
    model: str = "gpt-4o-mini"
    credential: str = "lyzr_openai"
    transport: httpx.AsyncBaseTransport | None = None

    async def create(self, agent: str) -> str:
        payload = agent_payload(agent, self.provider, self.model, self.credential)
        async with httpx.AsyncClient(
            base_url=self.base_url.rstrip("/"),
            headers={"x-api-key": self.api_key, "Content-Type": "application/json"},
            timeout=60,
            transport=self.transport,
        ) as c:
            r = await c.post("/agents/", json=payload)
        if r.status_code in (401, 403):
            raise ProvisionError("Lyzr rejected the API key (check LYZR_API_KEY in Lyzr Studio > Settings)")
        if r.status_code >= 400:
            raise ProvisionError(f"Lyzr {r.status_code}: {r.text[:300]}")
        agent_id = _find(r.json(), "agent_id", "id", "_id")
        if not agent_id:
            raise ProvisionError(f"Lyzr created the agent but returned no id: {r.text[:200]}")
        return agent_id

    async def ping(self, agent_id: str, user_id: str) -> str:
        """One tiny inference call, to confirm the agent answers and to see the reply shape."""
        async with httpx.AsyncClient(
            base_url=self.base_url.rstrip("/"),
            headers={"x-api-key": self.api_key, "Content-Type": "application/json"},
            timeout=60,
            transport=self.transport,
        ) as c:
            r = await c.post(
                "/inference/chat/",
                json={
                    "user_id": user_id,
                    "agent_id": agent_id,
                    "session_id": f"{agent_id}-setup",
                    "message": 'TASK: ping\nReply with the JSON {"ok": true} and nothing else.',
                },
            )
        if r.status_code >= 400:
            raise ProvisionError(f"Lyzr inference {r.status_code}: {r.text[:300]}")
        from kavach.brains.lyzr import reply_text

        return reply_text(r.json())[:200]


@dataclass
class BandProvisioner:
    user_api_key: str
    base_url: str = "https://app.band.ai/api/v1"
    transport: httpx.AsyncBaseTransport | None = None

    def _client(self, key: str | None = None) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=self.base_url.rstrip("/"),
            headers={"X-API-Key": key or self.user_api_key, "Content-Type": "application/json"},
            timeout=30,
            transport=self.transport,
        )

    async def me(self) -> dict[str, Any]:
        async with self._client() as c:
            r = await c.get("/me/profile")
            if r.status_code == 404:
                r = await c.get("/me")
        if r.status_code in (401, 403):
            raise ProvisionError("Band rejected the user API key (create one in Band > Settings > API Keys)")
        if r.status_code >= 400:
            raise ProvisionError(f"Band {r.status_code}: {r.text[:300]}")
        data = r.json()
        return data.get("data", data) if isinstance(data, dict) else {}

    async def register(self, agent: str) -> dict[str, str]:
        body = {"name": DISPLAY[agent], "description": DESCRIPTION[agent]}
        async with self._client() as c:
            r = await c.post("/me/agents/register", json={"agent": body})
            if r.status_code in (400, 422):  # some versions take the fields unwrapped
                r = await c.post("/me/agents/register", json=body)
        if r.status_code in (401, 403):
            raise ProvisionError("Band rejected the user API key (create one in Band > Settings > API Keys)")
        if r.status_code >= 400:
            raise ProvisionError(f"Band {r.status_code} registering {DISPLAY[agent]}: {r.text[:300]}")
        data = r.json()
        agent_id = _find(data, "id", "agent_id", "uuid")
        api_key = _find(data, "api_key", "apiKey", "key", "token")
        if not agent_id or not api_key:
            raise ProvisionError(
                f"Band registered {DISPLAY[agent]} but the reply had no id/api_key: {str(data)[:200]}"
            )
        return {"agent_id": agent_id, "api_key": api_key}

    async def check_agent(self, api_key: str) -> dict[str, Any]:
        async with self._client(api_key) as c:
            r = await c.get("/agent/me")
        if r.status_code >= 400:
            raise ProvisionError(f"Band agent check {r.status_code}: {r.text[:200]}")
        data = r.json()
        return data.get("data", data) if isinstance(data, dict) else {}
