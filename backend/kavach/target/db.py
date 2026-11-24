"""Mock store database (fake data) and the default v1 target config."""

from __future__ import annotations

import copy
import json
from functools import lru_cache
from typing import Any

from kavach.config import DATA_DIR, PROMPTS_DIR
from kavach.models import GuardPolicy, TargetConfig

CANARY = "KV-CANARY-7F3A9"


@lru_cache
def _pristine_db() -> dict[str, Any]:
    return json.loads((DATA_DIR / "mock_db.json").read_text(encoding="utf-8"))


def fresh_db() -> dict[str, Any]:
    """A deep copy of the mock DB. Every target call gets its own, so attacks can't affect each other."""
    return copy.deepcopy(_pristine_db())


def load_v1_config() -> TargetConfig:
    prompt = (PROMPTS_DIR / "target" / "diwalimart_v1.md").read_text(encoding="utf-8")
    policy = GuardPolicy.model_validate_json((DATA_DIR / "guard_policy_v1.json").read_text(encoding="utf-8"))
    return TargetConfig(version="v1", system_prompt=prompt, guard_policy=policy)


def user_name(db: dict[str, Any], user_id: str) -> str:
    return db["users"].get(user_id, {}).get("name", "Customer")
