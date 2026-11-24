"""Event bus: typed events → in-memory history, live subscribers (SSE) and runs/{run_id}.jsonl."""

from __future__ import annotations

import asyncio
import time
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

from kavach.models import Event

_CLOSED = object()


class EventBus:
    def __init__(self, run_id: str, log_path: Path | None = None):
        self.run_id = run_id
        self.history: list[Event] = []
        self._subs: set[asyncio.Queue] = set()
        self._t0 = time.monotonic()
        self._file = log_path.open("a", encoding="utf-8") if log_path else None
        self.log_path = log_path
        self.closed = False

    def emit(
        self,
        type: str,
        data: dict[str, Any] | None = None,
        *,
        round: int | None = None,
        agent: str | None = None,
        t_rel_ms: int | None = None,
    ) -> Event:
        ev = Event(
            run_id=self.run_id,
            seq=len(self.history),
            t_rel_ms=int((time.monotonic() - self._t0) * 1000) if t_rel_ms is None else t_rel_ms,
            type=type,
            round=round,
            agent=agent,
            data=data or {},
        )
        self.history.append(ev)
        if self._file:
            self._file.write(ev.model_dump_json() + "\n")
            self._file.flush()
        for q in list(self._subs):
            q.put_nowait(ev)
        return ev

    async def subscribe(self, from_seq: int = 0) -> AsyncIterator[Event]:
        q: asyncio.Queue = asyncio.Queue()
        self._subs.add(q)
        try:
            for ev in self.history[from_seq:]:
                yield ev
            sent = len(self.history)
            if self.closed:
                return
            while True:
                item = await q.get()
                if item is _CLOSED:
                    return
                if item.seq >= sent:
                    yield item
        finally:
            self._subs.discard(q)

    def close(self) -> None:
        self.closed = True
        if self._file:
            self._file.close()
            self._file = None
        for q in list(self._subs):
            q.put_nowait(_CLOSED)
