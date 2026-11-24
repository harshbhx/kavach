"""Check the 7 Band remote-agent identities and post one test message.

1. Reads agent_config.yaml (template: agent_config.example.yaml).
2. Finds which base URL works (BAND_API_BASE first, then the other one the docs mention) with GET /agent/me.
3. Prints every agent's handle.
4. Unless --no-room: the Referee creates a test room, adds the other 6 (+ BAND_OWNER_USER_ID if set) and posts a
   message that @mentions everyone.

Usage (from backend/):
    uv run python ../scripts/band_setup.py
    uv run python ../scripts/band_setup.py --no-room     # identities only
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import datetime

from kavach.band.client import BandClient, BandError
from kavach.band.room import AGENTS, DISPLAY, load_agent_config
from kavach.config import get_settings

CANDIDATES = ["https://api.band.ai/api/v1", "https://app.band.ai/api/v1"]


async def find_base(api_key: str, preferred: str) -> tuple[str | None, dict]:
    bases = [preferred] + [b for b in CANDIDATES if b != preferred]
    for base in bases:
        c = BandClient(base, api_key, timeout=15)
        try:
            return base, await c.me()
        except (BandError, Exception) as exc:  # noqa: BLE001
            print(f"  {base}: {str(exc)[:120]}")
        finally:
            await c.aclose()
    return None, {}


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-room", action="store_true")
    args = ap.parse_args()

    s = get_settings()
    creds = load_agent_config(s.band_config_path)
    missing = [a for a in AGENTS if a not in creds]
    print(f"config: {s.band_config_path}")
    if missing:
        print(f"missing agent_id/api_key for: {', '.join(missing)}")
        print("Create them in app.band.ai -> Agents -> Connect remote agent (see docs/SPONSORS.md §2).")
        return 1

    print("\n1) base URL")
    base, ref_me = await find_base(creds["referee"]["api_key"], s.band_api_base)
    if not base:
        print(
            "no base URL accepted the Referee key. Check the key (it is shown only once when you create the agent)."
        )
        return 1
    print(f"  OK {base}")
    if base != s.band_api_base:
        print(f"  -> set BAND_API_BASE={base} in .env")

    print("\n2) identities")
    clients = {a: BandClient(base, creds[a]["api_key"]) for a in AGENTS}
    handles: dict[str, str] = {}
    ok = True
    try:
        for a in AGENTS:
            try:
                me = ref_me if a == "referee" else await clients[a].me()
                handles[a] = me.get("handle") or me.get("username") or DISPLAY[a]
                same = me.get("id") in (None, creds[a]["agent_id"])
                print(
                    f"  OK {DISPLAY[a]:<16} @{handles[a]:<20} id={me.get('id', '?')}{'' if same else '  (id differs from agent_config.yaml!)'}"
                )
            except BandError as exc:
                ok = False
                print(f"  FAIL {DISPLAY[a]:<14} {exc}")
        if not ok or args.no_room:
            return 0 if ok else 1

        print("\n3) test room")
        ref = clients["referee"]
        chat_id = await ref.create_chat(f"Kavach setup check {datetime.now():%H:%M}")
        for a in AGENTS:
            if a != "referee":
                await ref.add_participant(chat_id, creds[a]["agent_id"])
        if s.band_owner_user_id:
            await ref.add_participant(chat_id, s.band_owner_user_id)
            print("  added you (BAND_OWNER_USER_ID)")
        else:
            print("  BAND_OWNER_USER_ID not set: you won't be added to run rooms automatically")
        mentions = [{"id": creds[a]["agent_id"], "handle": handles[a]} for a in AGENTS if a != "referee"]
        text = " ".join(f"@{m['handle']}" for m in mentions) + " Kavach setup check: the room works. 🪔"
        await ref.send_message(chat_id, text, mentions)
        print(f"  OK posted. Open https://app.band.ai/chats/{chat_id}")
        print("\nBand is ready. Set BAND_ENABLED=true for live runs.")
        return 0
    except BandError as exc:
        print(f"  FAIL {exc}")
        if exc.quota:
            print(
                "  quota reached (403 limit_reached): runs will still work, the dashboard mirrors every message"
            )
        return 1
    finally:
        for c in clients.values():
            await c.aclose()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
