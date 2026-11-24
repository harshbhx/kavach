"""Client for the target service: over HTTP (local or Agent37) or in-process (tests/smoke)."""

from __future__ import annotations

import asyncio

import httpx

from kavach.config import Settings
from kavach.models import ChatRequest, ChatResponse, TargetConfig


class TargetClient:
    def __init__(self, settings: Settings):
        self.settings = settings
        if settings.target_url == "inprocess":
            from kavach.target.service import app

            transport = httpx.ASGITransport(app=app)
            base = "http://target.local"
        else:
            transport = None
            base = settings.target_url.rstrip("/")
        self._client = httpx.AsyncClient(
            base_url=base,
            transport=transport,
            headers=settings.target_extra_headers,
            timeout=settings.llm_timeout_s * 3,
        )
        self._sem = asyncio.Semaphore(settings.max_concurrency)

    async def chat(
        self,
        message: str,
        *,
        session_user: str = "U-101",
        config_override: TargetConfig | None = None,
        request_id: str = "",
    ) -> ChatResponse:
        req = ChatRequest(
            session_user=session_user, message=message, config_override=config_override, request_id=request_id
        )
        async with self._sem:
            last_exc: Exception | None = None
            for _ in range(2):  # retry once
                try:
                    r = await self._client.post("/chat", json=req.model_dump(mode="json"))
                    r.raise_for_status()
                    return ChatResponse.model_validate(r.json())
                except (httpx.HTTPError, ValueError) as exc:
                    last_exc = exc
            raise RuntimeError(f"target call failed: {last_exc}")

    async def get_config(self) -> TargetConfig:
        r = await self._client.get("/config")
        r.raise_for_status()
        return TargetConfig.model_validate(r.json())

    async def put_config(self, config: TargetConfig) -> None:
        r = await self._client.put("/config", json=config.model_dump(mode="json"))
        r.raise_for_status()

    async def reset(self) -> None:
        r = await self._client.post("/reset")
        r.raise_for_status()

    async def health(self) -> dict:
        r = await self._client.get("/health")
        r.raise_for_status()
        return r.json()

    async def aclose(self) -> None:
        await self._client.aclose()
