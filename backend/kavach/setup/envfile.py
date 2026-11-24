"""Read and update KEY=value files (.env) without losing comments or ordering."""

from __future__ import annotations

import re
from pathlib import Path

_LINE = re.compile(r"^\s*([A-Z0-9_]+)\s*=(.*)$")


def read_env(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.exists():
        return out
    for line in path.read_text(encoding="utf-8").splitlines():
        m = _LINE.match(line)
        if m:
            out[m.group(1)] = m.group(2).strip().strip('"').strip("'")
    return out


def update_env(path: Path, values: dict[str, str], template: Path | None = None) -> list[str]:
    """Set keys in place (keeping comments), append unknown ones, create from template if missing.

    Returns the keys that changed.
    """
    if not path.exists():
        path.write_text(template.read_text(encoding="utf-8") if template and template.exists() else "")
    lines = path.read_text(encoding="utf-8").splitlines()
    seen: set[str] = set()
    changed: list[str] = []
    for i, line in enumerate(lines):
        m = _LINE.match(line)
        if m and m.group(1) in values:
            key = m.group(1)
            seen.add(key)
            new = f"{key}={values[key]}"
            if line != new:
                lines[i] = new
                changed.append(key)
    missing = [k for k in values if k not in seen]
    if missing:
        lines.append("")
        lines.append("# added by `make setup`")
        for k in missing:
            lines.append(f"{k}={values[k]}")
            changed.append(k)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return changed
