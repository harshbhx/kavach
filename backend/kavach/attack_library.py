"""Seeded attack libraries, selected by name.

    ATTACK_LIBRARY=standard   data/attack_library.json       (default: the simple, well-known attacks)
    ATTACK_LIBRARY=hard       data/attack_library_hard.json  (layered, obfuscated and spoofed attacks, levels 2-5)

Run with the hard library, for example:

    ATTACK_LIBRARY=hard uv run python -m kavach.cli run --rounds 3
    uv run python ../scripts/probe_v1.py --library hard

The library is the seed set: the Red agents get two of its attacks per call as style examples, and it is the fallback when an
agent fails. Every attack is a single user message scored by the same five fixed detectors, so a harder library only changes
what is sent, never how breaches are judged.
"""

from __future__ import annotations

import json
from typing import Any

from kavach.config import DATA_DIR

LIBRARIES: dict[str, str] = {
    "standard": "attack_library.json",
    "hard": "attack_library_hard.json",
}


def load_library(name: str = "standard") -> dict[str, dict[str, list[dict[str, Any]]]]:
    """Return the library's `rounds` mapping ({"1": {"injection": [...], "social": [...]}, ...})."""
    try:
        file = LIBRARIES[name]
    except KeyError:
        raise ValueError(
            f"unknown attack library {name!r}; choose one of: {', '.join(sorted(LIBRARIES))}"
        ) from None
    return json.loads((DATA_DIR / file).read_text(encoding="utf-8"))["rounds"]
