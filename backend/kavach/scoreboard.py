"""The model scoreboard: every recorded run in runs/gallery/, summed up by victim model.

    uv run python -m kavach.cli scoreboard            # a markdown table, ready for the README
    GET /api/scoreboard                               # the same numbers as JSON

Every number comes from the runs' own events (round.scored, patch.applied, run.started), so the scoreboard can't
disagree with the recordings it summarises.
"""

from __future__ import annotations

import statistics
from dataclasses import asdict, dataclass, field
from pathlib import Path

from kavach.orchestrator.replay import load_events


@dataclass
class RunRow:
    run_id: str
    file: str
    model: str
    rounds: int
    trend: list[float]
    first_breach: float  # breach rate of the first round that was breached (0 if none ever was)
    final_breach: float
    attacks: int
    breaches: int
    vetoes: int
    utility: float | None  # lowest utility of any shipped patch
    tth_seconds: float | None  # time to harden, first shipped patch
    verdict: str  # hardened | held | breached
    skill_packs: list[str] = field(default_factory=list)


@dataclass
class ModelRow:
    model: str
    runs: int
    first_breach_avg: float
    first_breach_max: float
    hardened: int
    tth_median: float | None
    utility_min: float | None


def summarize_run(path: Path) -> RunRow | None:
    try:
        events = load_events(path)
    except (OSError, ValueError):
        return None
    if not events:
        return None
    model, packs, rounds, tth = "unknown", [], {}, None
    for ev in events:
        if ev.type == "run.started":
            model = str(ev.data.get("target_model") or model)
            packs = list(ev.data.get("skill_packs") or [])
        elif ev.type == "round.scored" and ev.round is not None:
            rounds[ev.round] = ev.data
        elif ev.type == "patch.applied" and tth is None:
            tth = ev.data.get("tth_seconds")
    if not rounds:
        return None
    ordered = [rounds[k] for k in sorted(rounds)]
    trend = [round(float(r.get("breach_rate", 0.0)), 4) for r in ordered]
    utilities = [float(r["utility_applied"]) for r in ordered if r.get("utility_applied") is not None]
    breached = [b for b in trend if b > 0]
    final = trend[-1]
    verdict = "breached" if final > 0 else ("hardened" if breached else "held")
    return RunRow(
        run_id=events[0].run_id,
        file=path.name,
        model=model,
        rounds=len(trend),
        trend=trend,
        first_breach=breached[0] if breached else 0.0,
        final_breach=final,
        attacks=sum(int(r.get("total_attacks", 0)) for r in ordered),
        breaches=sum(int(r.get("breaching", 0)) for r in ordered),
        vetoes=sum(int(r.get("vetoes", 0)) for r in ordered),
        utility=min(utilities) if utilities else None,
        tth_seconds=float(tth) if tth is not None else None,
        verdict=verdict,
        skill_packs=packs,
    )


def by_model(runs: list[RunRow]) -> list[ModelRow]:
    groups: dict[str, list[RunRow]] = {}
    for r in runs:
        groups.setdefault(r.model, []).append(r)
    rows = []
    for model, rs in groups.items():
        tths = [r.tth_seconds for r in rs if r.tth_seconds is not None]
        utils = [r.utility for r in rs if r.utility is not None]
        firsts = [r.first_breach for r in rs]
        rows.append(
            ModelRow(
                model=model,
                runs=len(rs),
                first_breach_avg=round(statistics.fmean(firsts), 4),
                first_breach_max=round(max(firsts), 4),
                hardened=sum(r.verdict != "breached" for r in rs),
                tth_median=round(statistics.median(tths), 1) if tths else None,
                utility_min=min(utils) if utils else None,
            )
        )
    return sorted(rows, key=lambda m: -m.first_breach_avg)


def scoreboard(folder: Path) -> dict:
    runs = [r for p in sorted(folder.glob("*.jsonl")) if (r := summarize_run(p))]
    return {"runs": [asdict(r) for r in runs], "models": [asdict(m) for m in by_model(runs)]}


def short_model(model: str) -> str:
    return model.split("/")[-1]


def markdown(board: dict) -> str:
    pct = lambda v: "–" if v is None else f"{round(v * 100)}%"  # noqa: E731
    lines = [
        "| Victim model | Runs | First breach rate (avg / max) | Ended hardened or held | Median time to harden | Lowest utility |",
        "|---|---|---|---|---|---|",
    ]
    for m in board["models"]:
        tth = "–" if m["tth_median"] is None else f"{m['tth_median']:.0f} s"
        lines.append(
            f"| `{short_model(m['model'])}` | {m['runs']} | {pct(m['first_breach_avg'])} / {pct(m['first_breach_max'])} "
            f"| {m['hardened']} of {m['runs']} | {tth} | {pct(m['utility_min'])} |"
        )
    return "\n".join(lines) + "\n"
