"""Build the demo gallery: runs/gallery.json + runs/gallery/<id>.jsonl from real recordings.

    python scripts/build_gallery.py            # reads runs/gallery.sources.json

runs/gallery.sources.json is a list of {"id", "title", "blurb", "source"} where `source` is a recording in runs/ (kv-*.jsonl).
Titles and blurbs are written by hand; every number on a gallery card (model, rounds, breach trend, vetoes, utility,
time to harden, verdict) is read from the recording itself, so a card can never disagree with the run it opens.
The dashboard's Demo picker, the landing page and the site build all read runs/gallery.json. Standard library only.
"""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / "runs"


def stats(path: Path) -> dict:
    started: dict = {}
    rounds: list[dict] = []
    final: dict = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        ev = json.loads(line)
        d = ev.get("data") or {}
        if ev["type"] == "run.started":
            started = d
        elif ev["type"] == "round.scored":
            rounds.append(d)
        elif ev["type"] == "run.completed":
            final = d
    if not rounds or not final:
        sys.exit(f"{path.name} is not a finished run (no rounds or no run.completed)")
    rounds.sort(key=lambda r: r["round"])
    trend = [round(r["breach_rate"], 4) for r in rounds]
    first, last = trend[0], final.get("final_breach_rate", trend[-1])
    # A late find still counts as a hardened run: the worst round is what got fixed.
    worst = max(trend)
    verdict = "breached" if last >= worst and worst > 0 else "hardened" if worst > 0 else "held"
    tth = next((r["tth_seconds"] for r in rounds if r.get("tth_seconds")), None)
    return {
        "model": started.get("target_model", "?"),
        "rounds": len(rounds),
        "attacksPerAgent": started.get("attacks_per_agent"),
        "trend": trend,
        "vetoes": sum(r.get("vetoes", 0) for r in rounds),
        "utility": final.get("final_utility"),
        "tthSeconds": round(tth, 1) if tth else None,
        "verdict": verdict,
        "exploits": final.get("total_exploits"),
    }


def fill_readme(gallery: list[dict]) -> None:
    """The README's table of recorded runs, between <!-- gallery:start --> and <!-- gallery:end -->."""
    readme = ROOT / "README.md"
    if not readme.exists():
        return
    rows = ["| Demo | Victim model | Breach rate by round | Utility | Hardened in |", "|---|---|---|---|---|"]
    for i, g in enumerate(gallery, 1):
        trend = " → ".join(f"{round(t * 100)}%" for t in g["trend"])
        util = "–" if g["utility"] is None else f"{round(g['utility'] * 100)}%"
        tth = "–" if g["tthSeconds"] is None else f"{round(g['tthSeconds'])}s"
        link = f"[{g['title']}](https://kavach.dualmindlab.tech/dashboard/?demo={g['id']})"
        rows.append(f"| {i} · {link} | `{g['model']}` | {trend} | {util} | {tth} |")
    text = readme.read_text(encoding="utf-8")
    pattern = re.compile(r"(<!-- gallery:start -->)(.*?)(<!-- gallery:end -->)", re.S)
    if pattern.search(text):
        block = chr(10) + chr(10).join(rows) + chr(10)
        readme.write_text(pattern.sub(lambda m: m.group(1) + block + m.group(3), text, count=1), encoding="utf-8")


def main() -> None:
    sources = json.loads((RUNS / "gallery.sources.json").read_text(encoding="utf-8"))
    out_dir = RUNS / "gallery"
    out_dir.mkdir(exist_ok=True)
    gallery = []
    for s in sources:
        src = RUNS / s["source"]
        if not src.exists():
            sys.exit(f"missing recording: {src}")
        dest = out_dir / f"{s['id']}.jsonl"
        shutil.copyfile(src, dest)
        gallery.append({"id": s["id"], "file": f"gallery/{s['id']}.jsonl", "title": s["title"], "blurb": s["blurb"], **stats(src)})
    fill_readme(gallery)
    (RUNS / "gallery.json").write_text(json.dumps(gallery, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    for g in gallery:
        trend = " → ".join(f"{round(t * 100)}%" for t in g["trend"])
        print(f"  {g['id']}: {g['title']} | {g['model']} | {trend} | {g['verdict']}")
    print(f"Wrote runs/gallery.json with {len(gallery)} demos")


if __name__ == "__main__":
    main()
