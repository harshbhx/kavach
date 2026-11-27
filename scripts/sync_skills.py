"""Copy the skill packs in skills/ to .adal/skills/, where AdaL looks for project skills.

    python scripts/sync_skills.py

skills/ is the source of truth. A test (backend/tests/test_skills.py) fails if the copies drift.
"""

from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACKS = ("owasp-llm-attack-pack", "agent-hardening-pack")


def main() -> None:
    dest_root = ROOT / ".adal" / "skills"
    for name in PACKS:
        dest = dest_root / name
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(ROOT / "skills" / name, dest)
        print(f"synced skills/{name} -> .adal/skills/{name}")


if __name__ == "__main__":
    main()
