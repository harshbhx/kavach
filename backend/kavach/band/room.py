"""One Band room per run. Each agent posts as itself and @mentions the next agent.

Every post is mirrored as an `agent.message` event, so the dashboard feed works even with Band off.
Band failures never stop a run: they become `band.error` events.
"""

from __future__ import annotations

import logging
from pathlib import Path

import yaml

from kavach.band.client import BandClient, BandError
from kavach.config import Settings
from kavach.models import SQUAD
from kavach.orchestrator.events import EventBus

log = logging.getLogger(__name__)
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


def load_agent_config(path: Path) -> dict[str, dict[str, str]]:
    if not path.exists():
        return {}
    data = yaml.safe_load(path.read_text()) or {}
    return {k: v for k, v in data.items() if isinstance(v, dict) and v.get("agent_id") and v.get("api_key")}


class BandRoom:
    def __init__(self, settings: Settings, bus: EventBus, run_id: str, transport=None):
        self.settings = settings
        self.bus = bus
        self.run_id = run_id
        self.creds = load_agent_config(settings.band_config_path) if settings.band_enabled else {}
        self.enabled = settings.band_enabled and all(a in self.creds for a in AGENTS)
        if settings.band_enabled and not self.enabled:
            missing = [a for a in AGENTS if a not in self.creds]
            log.warning("Band disabled: missing credentials for %s", missing)
        self.clients = (
            {
                a: BandClient(settings.band_api_base, c["api_key"], transport=transport)
                for a, c in self.creds.items()
            }
            if self.enabled
            else {}
        )
        self.handles: dict[str, str] = {}
        self.chat_id: str | None = None
        self.room_url: str | None = None

    async def open(self) -> None:
        if not self.enabled:
            return
        try:
            for a in AGENTS:
                me = await self.clients[a].me()
                self.handles[a] = me.get("handle") or me.get("username") or DISPLAY[a]
            ref = self.clients["referee"]
            self.chat_id = await ref.create_chat(f"Kavach · {self.run_id}")
            for a in AGENTS:
                if a != "referee":
                    await ref.add_participant(self.chat_id, self.creds[a]["agent_id"])
            if self.settings.band_owner_user_id:
                await ref.add_participant(self.chat_id, self.settings.band_owner_user_id)
            self.room_url = f"https://app.band.ai/chats/{self.chat_id}"
        except (BandError, Exception) as exc:  # never block the run
            self._fail("open", exc)

    def _fail(self, action: str, exc: Exception) -> None:
        status = getattr(exc, "status", None)
        self.bus.emit("band.error", {"action": action, "status": status, "detail": str(exc)[:300]})
        if isinstance(exc, BandError) and exc.quota:
            self.enabled = False
        if action == "open":
            self.enabled = False

    async def post(self, agent: str, text: str, mentions: list[str], *, round: int | None = None) -> None:
        """Post as `agent`, mentioning other agents (or 'owner'). Always mirrored to the dashboard."""
        mentions = [m for m in mentions if m != agent] or (["recon"] if agent != "recon" else ["referee"])
        names = []
        for m in mentions:
            if m == "owner":
                names.append(self.settings.band_owner_handle or "owner")
            else:
                names.append(self.handles.get(m, DISPLAY.get(m, m)))
        content = " ".join(f"@{n}" for n in names) + " " + text
        message_id = None
        if self.enabled and self.chat_id:
            payload = []
            for m, n in zip(mentions, names, strict=True):
                if m == "owner":
                    if self.settings.band_owner_handle and self.settings.band_owner_user_id:
                        payload.append({"id": self.settings.band_owner_user_id, "handle": n})
                elif m in self.creds:
                    payload.append({"id": self.creds[m]["agent_id"], "handle": n})
            if not payload:  # Band requires at least one mention
                fallback = "recon" if agent != "recon" else "referee"
                payload = [
                    {
                        "id": self.creds[fallback]["agent_id"],
                        "handle": self.handles.get(fallback, DISPLAY[fallback]),
                    }
                ]
                content = f"@{payload[0]['handle']} {content}"
            try:
                message_id = await self.clients[agent].send_message(self.chat_id, content[:1500], payload)
            except Exception as exc:
                self._fail("send_message", exc)
        self.bus.emit(
            "agent.message",
            {
                "agent": agent,
                "squad": SQUAD[agent],
                "text": text,
                "mentions": mentions,
                "band_message_id": message_id,
            },
            round=round,
            agent=agent,
        )

    async def aclose(self) -> None:
        for c in self.clients.values():
            await c.aclose()
