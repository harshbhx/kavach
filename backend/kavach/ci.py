"""CI mode: fail a build when a prompt or guard-policy change makes the bot easier to break, or less helpful.

    uv run python -m kavach.cli ci                                   # DiwaliMart v1 against .kavach/baseline.json
    uv run python -m kavach.cli ci --prompt my_prompt.md --policy my_policy.json --baseline .kavach/baseline.json
    uv run python -m kavach.cli ci ... --update-baseline             # accept the current numbers as the new baseline

It replays every seeded attack in the chosen library (both squads, all rounds) against ONE config, runs the benign suite,
and scores both in code with the same detectors as a run. No agents are involved, so a build is cheap and repeatable.
The gate fails (exit 1) when the breach rate rises above the baseline by more than --tolerance, or utility drops below
the floor (UTILITY_THRESHOLD, 0.9 by default). With TARGET_MODEL=fake it is fully offline; point it at a real model to
test a real prompt.
"""

from __future__ import annotations

import hashlib
import json
import os
from collections import Counter
from dataclasses import asdict, dataclass, field
from pathlib import Path

from kavach.attack_library import load_library
from kavach.config import Settings
from kavach.models import Attack, AttackResult, GuardPolicy, TargetConfig
from kavach.orchestrator.audit import audit
from kavach.target.db import custom_v1_config, load_v1_config
from kavach.target_client import TargetClient

DEFAULT_BASELINE = Path(".kavach") / "baseline.json"  # in your own repo; this repo's gate uses data/ci/


@dataclass
class CiResult:
    config_sha: str
    library: str
    attacks: int
    breaching: int
    breach_rate: float
    utility: float
    by_rule: dict[str, int] = field(default_factory=dict)
    failed_requests: list[str] = field(default_factory=list)


@dataclass
class Verdict:
    passed: bool
    reasons: list[str]


def load_config(prompt: Path | None = None, policy: Path | None = None) -> TargetConfig:
    """The config under test: DiwaliMart v1 by default, or your prompt and guard policy."""
    config = custom_v1_config(prompt.read_text(encoding="utf-8")) if prompt else load_v1_config()
    if policy:
        config.guard_policy = GuardPolicy.model_validate_json(policy.read_text(encoding="utf-8"))
    return config


def config_sha(config: TargetConfig) -> str:
    return hashlib.sha256(config.model_dump_json().encode()).hexdigest()[:12]


def seeded_attacks(library: str) -> list[AttackResult]:
    """Every attack in the library once, as replayable results with no response yet."""
    out: list[AttackResult] = []
    seen: set[str] = set()
    for round_no, squads in sorted(load_library(library).items()):
        for squad, attacks in sorted(squads.items()):
            for i, a in enumerate(attacks, start=1):
                if a["message"] in seen:
                    continue
                seen.add(a["message"])
                attack = Attack(
                    id=f"ci-r{round_no}-{squad[:3]}-{i:02d}",
                    technique=a["technique"],
                    goal=a["goal"],
                    message=a["message"],
                    agent=squad,
                    source="library",
                )
                out.append(AttackResult(attack=attack))
    return out


async def evaluate(settings: Settings, config: TargetConfig, library: str = "standard") -> CiResult:
    attacks = seeded_attacks(library)
    target = TargetClient(settings)
    try:
        outcome, _ = await audit(target, config, attacks, attempt=0, settings=settings)
    finally:
        close = getattr(target, "aclose", None)
        if close:
            await close()
    return CiResult(
        config_sha=config_sha(config),
        library=library,
        attacks=outcome.replay_total,
        breaching=outcome.replay_still_breaching,
        breach_rate=round(outcome.replay_still_breaching / outcome.replay_total, 4)
        if outcome.replay_total
        else 0.0,
        utility=round(outcome.utility.score, 4),
        by_rule=dict(Counter(d["rule_id"] for d in outcome.replay_details)),
        failed_requests=[f"{f.id}: {f.why}" for f in outcome.utility.failed],
    )


def judge(result: CiResult, baseline: dict | None, tolerance: float, utility_floor: float) -> Verdict:
    reasons: list[str] = []
    if result.utility < utility_floor:
        reasons.append(f"utility {result.utility:.0%} is below the {utility_floor:.0%} floor")
    if baseline is not None:
        allowed = float(baseline.get("breach_rate", 0.0)) + tolerance
        if result.breach_rate > allowed + 1e-9:
            reasons.append(
                f"breach rate {result.breach_rate:.0%} is above the baseline {float(baseline['breach_rate']):.0%}"
                + (f" + {tolerance:.0%} tolerance" if tolerance else "")
            )
        if baseline.get("library") and baseline["library"] != result.library:
            reasons.append(
                f"baseline was measured with the {baseline['library']} library, not {result.library}"
            )
    return Verdict(passed=not reasons, reasons=reasons)


def read_baseline(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None


def write_baseline(path: Path, result: CiResult) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = {k: v for k, v in asdict(result).items() if k != "failed_requests"}
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def markdown(result: CiResult, baseline: dict | None, verdict: Verdict) -> str:
    base = "–" if baseline is None else f"{float(baseline.get('breach_rate', 0)):.0%}"
    lines = [
        f"## Kavach CI: {'passed' if verdict.passed else 'failed'}",
        "",
        "| | This build | Baseline |",
        "|---|---|---|",
        f"| Breach rate | {result.breach_rate:.0%} ({result.breaching} of {result.attacks}) | {base} |",
        f"| Everyday requests served | {result.utility:.0%} | – |",
        "",
        f"Config `{result.config_sha}`, attack library `{result.library}`. Scored in code from the target's tool-call log.",
    ]
    if result.by_rule:
        lines += [
            "",
            "Breaches by rule: " + ", ".join(f"`{k}` ×{v}" for k, v in sorted(result.by_rule.items())),
        ]
    if verdict.reasons:
        lines += ["", *[f"- {r}" for r in verdict.reasons]]
    return "\n".join(lines) + "\n"


async def run_ci(
    *,
    prompt: Path | None,
    policy: Path | None,
    baseline_path: Path,
    library: str,
    tolerance: float,
    update_baseline: bool,
    json_out: Path | None = None,
    settings: Settings | None = None,
) -> int:
    """0 = passed, 1 = regression. Prints a summary and writes the GitHub step summary when it runs in Actions."""
    settings = settings or Settings()
    config = load_config(prompt, policy)
    result = await evaluate(settings, config, library)
    baseline = read_baseline(baseline_path)
    verdict = judge(result, None if update_baseline else baseline, tolerance, settings.utility_threshold)
    report = markdown(result, baseline, verdict)
    print(report)
    if summary := os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(summary, "a", encoding="utf-8") as fh:
            fh.write(report)
    if json_out:
        json_out.write_text(
            json.dumps({**asdict(result), **asdict(verdict)}, indent=2) + "\n", encoding="utf-8"
        )
    if update_baseline:
        write_baseline(baseline_path, result)
        print(f"baseline written to {baseline_path}")
        return 0
    if baseline is None:
        print(f"No baseline at {baseline_path}. Run again with --update-baseline to record one.")
    return 0 if verdict.passed else 1
