"""Backend for `pnpm dev`: the Kavach API on :8000, plus the DiwaliMart target when TARGET_URL points at this machine.

One process, one Ctrl-C. `make api` and `make target` still start them separately.
"""

from __future__ import annotations

import asyncio
import contextlib
import signal
from urllib.parse import urlparse

import uvicorn

from kavach.config import Settings

API_PORT = 8000


class _Server(uvicorn.Server):
    """Signals are handled once for both servers in main(), not by each server."""

    @contextlib.contextmanager
    def capture_signals(self):  # type: ignore[override]
        yield


def local_target_port(target_url: str) -> int | None:
    """The port to serve the target on, or None when it runs in-process or somewhere else (Agent37)."""
    url = urlparse(target_url)
    if url.hostname in {"localhost", "127.0.0.1", "0.0.0.0"} and url.port and url.port != API_PORT:
        return url.port
    return None


async def main() -> None:
    settings = Settings()
    configs = [uvicorn.Config("kavach.api.app:app", host="127.0.0.1", port=API_PORT)]
    port = local_target_port(settings.target_url)
    if port:
        configs.append(uvicorn.Config("kavach.target.service:app", host="127.0.0.1", port=port))
    servers = [_Server(c) for c in configs]

    def stop() -> None:
        for s in servers:
            s.should_exit = True

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        with contextlib.suppress(NotImplementedError):
            loop.add_signal_handler(sig, stop)
    where = f"target on :{port}" if port else f"target at {settings.target_url}"
    print(f"Kavach API on :{API_PORT}, {where}")
    await asyncio.gather(*(s.serve() for s in servers))


if __name__ == "__main__":
    asyncio.run(main())
