"""Minimal Band Agent API client. Auth is per agent (X-API-Key). Endpoints per docs.band.ai."""

from __future__ import annotations

import asyncio
from typing import Any

import httpx


class BandError(RuntimeError):
    def __init__(self, status: int, detail: str):
        super().__init__(f"Band HTTP {status}: {detail}")
        self.status = status
        self.detail = detail

    @property
    def quota(self) -> bool:
        return self.status == 403 and "limit_reached" in self.detail


class BandClient:
    def __init__(
        self,
        base_url: str,
        api_key: str,
        timeout: float = 20.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ):
        self._client = httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            headers={"X-API-Key": api_key, "Content-Type": "application/json"},
            timeout=timeout,
            transport=transport,
        )

    async def _req(self, method: str, path: str, json: dict | None = None) -> dict[str, Any]:
        for attempt in range(2):
            r = await self._client.request(method, path, json=json)
            if r.status_code == 503 and attempt == 0:  # backpressure: retry once
                await asyncio.sleep(1)
                continue
            if r.status_code >= 400:
                raise BandError(r.status_code, r.text[:300])
            return r.json() if r.content else {}
        raise BandError(503, "backpressure")

    async def me(self) -> dict[str, Any]:
        data = await self._req("GET", "/agent/me")
        return data.get("data", data)

    async def create_chat(self, title: str) -> str:
        data = await self._req("POST", "/agent/chats", {"chat": {"title": title}})
        return (data.get("data") or data)["id"]

    async def add_participant(self, chat_id: str, participant_id: str, role: str = "member") -> None:
        await self._req(
            "POST",
            f"/agent/chats/{chat_id}/participants",
            {"participant": {"participant_id": participant_id, "role": role}},
        )

    async def send_message(self, chat_id: str, content: str, mentions: list[dict[str, str]]) -> str | None:
        data = await self._req(
            "POST",
            f"/agent/chats/{chat_id}/messages",
            {"message": {"content": content, "mentions": mentions}},
        )
        return (data.get("data") or data).get("id")

    async def aclose(self) -> None:
        await self._client.aclose()
