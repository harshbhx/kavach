"""Skill packs: the squads' playbooks, read from skills/ at run time.

    skills/owasp-llm-attack-pack/   SKILL.md + techniques.json   (Injector and Social Engineer)
    skills/agent-hardening-pack/    SKILL.md + playbook.json     (Patcher)

The red agents get the technique cards for their round on every call, and the Patcher gets the principles, the guard
template and the prompt additions with every patch request. The folders are agentskills-format packs, so other agents can
load them too: AdaL reads copies from .adal/skills/. A missing or broken pack never stops a run; the agents fall back to
the built-in technique list (kavach/agents/red.py) and the guard schema alone.

Set KAVACH_SKILLS_DIR to load packs from another folder.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from kavach.config import REPO_ROOT

log = logging.getLogger(__name__)

ATTACK_PACK = "owasp-llm-attack-pack"
HARDENING_PACK = "agent-hardening-pack"
DATA_FILES = {ATTACK_PACK: "techniques.json", HARDENING_PACK: "playbook.json"}


@dataclass(frozen=True)
class SkillPack:
    name: str
    description: str
    version: str
    digest: str  # sha256 over the pack's files, so a report says exactly which playbook a run used
    data: dict[str, Any]

    @property
    def ref(self) -> str:
        return f"{self.name}@{self.version}+{self.digest[:8]}"


def skills_dir() -> Path:
    return Path(os.environ.get("KAVACH_SKILLS_DIR") or REPO_ROOT / "skills")


def _frontmatter(text: str) -> dict[str, str]:
    """The `key: value` lines between the two leading `---` markers of a SKILL.md."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}
    meta: dict[str, str] = {}
    for line in lines[1:]:
        if line.strip() == "---":
            break
        key, sep, value = line.partition(":")
        if sep:
            meta[key.strip()] = value.strip()
    return meta


@lru_cache(maxsize=16)
def _load(name: str, root: str) -> SkillPack | None:
    folder = Path(root) / name
    try:
        meta = _frontmatter((folder / "SKILL.md").read_text(encoding="utf-8"))
        data = json.loads((folder / DATA_FILES[name]).read_text(encoding="utf-8"))
        digest = hashlib.sha256()
        for f in sorted(p for p in folder.rglob("*") if p.is_file()):
            digest.update(f.relative_to(folder).as_posix().encode())
            digest.update(f.read_bytes())
    except (OSError, ValueError, KeyError) as exc:
        log.warning("skill pack %s is unavailable (%s); using the built-in fallback", name, exc)
        return None
    return SkillPack(
        name=meta.get("name", name),
        description=meta.get("description", ""),
        version=str(data.get("version", "0")),
        digest=digest.hexdigest()[:12],
        data=data,
    )


def load_pack(name: str) -> SkillPack | None:
    return _load(name, str(skills_dir()))


def clear_cache() -> None:
    _load.cache_clear()


def techniques_by_round(squad: str) -> dict[str, list[str]] | None:
    """{"1": [...], "2": [...], "3": [...]} for "injection" or "social", or None without the attack pack."""
    pack = load_pack(ATTACK_PACK)
    if not pack:
        return None
    out: dict[str, list[str]] = {}
    for t in pack.data.get("techniques", []):
        if t.get("squad") == squad:
            out.setdefault(str(t["round"]), []).append(t["id"])
    return out or None


def technique_cards(squad: str, round_no: int) -> list[dict[str, Any]]:
    """The cards a red agent gets for one round: technique, OWASP risks, goals and a short how-to."""
    pack = load_pack(ATTACK_PACK)
    if not pack:
        return []
    r = str(min(max(round_no, 1), 3))
    return [
        {
            "technique": t["id"],
            "owasp": t.get("owasp", []),
            "goals": t.get("goals", []),
            "how": t.get("card", ""),
        }
        for t in pack.data.get("techniques", [])
        if t.get("squad") == squad and str(t.get("round")) == r
    ]


def hardening_brief() -> dict[str, Any] | None:
    """What the Patcher gets with every patch request, or None without the hardening pack."""
    pack = load_pack(HARDENING_PACK)
    if not pack:
        return None
    d = pack.data
    return {
        "pack": pack.ref,
        "principles": d.get("principles", []),
        "guard_policy_template": d.get("guard_policy_template", {}),
        "system_prompt_additions": d.get("system_prompt_additions", []),
    }


def loaded_refs() -> list[str]:
    """`name@version+digest` for each pack this run can use, for run.started and the report."""
    return [p.ref for p in (load_pack(ATTACK_PACK), load_pack(HARDENING_PACK)) if p]
