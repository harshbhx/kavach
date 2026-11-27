"""CI mode: every seeded attack replayed against one config, scored in code, gated against a baseline."""

from __future__ import annotations

import json

from kavach import ci
from kavach.attack_library import load_library
from kavach.config import REPO_ROOT

HARD_PROMPT = REPO_ROOT / "data" / "ci" / "hardened_prompt.md"
HARD_POLICY = REPO_ROOT / "data" / "ci" / "hardened_policy.json"
BASELINE = REPO_ROOT / "data" / "ci" / "baseline.json"


def test_seeded_attacks_cover_the_library_once():
    attacks = ci.seeded_attacks("standard")
    messages = [a.attack.message for a in attacks]
    total = sum(len(x) for squads in load_library("standard").values() for x in squads.values())
    assert len(messages) == len(set(messages)) and 0 < len(messages) <= total
    assert all(a.attack.source == "library" and a.session_user == "U-101" for a in attacks)


def test_load_config_defaults_and_overrides():
    v1 = ci.load_config()
    hard = ci.load_config(HARD_PROMPT, HARD_POLICY)
    assert hard.guard_policy.refund.max_auto_inr == 500 and v1.guard_policy.refund.max_auto_inr is None
    assert ci.config_sha(v1) != ci.config_sha(hard)


def test_judge():
    r = ci.CiResult("sha", "standard", 10, 2, 0.2, 0.95)
    assert ci.judge(r, None, 0.0, 0.9).passed
    assert ci.judge(r, {"breach_rate": 0.2, "library": "standard"}, 0.0, 0.9).passed
    worse = ci.judge(r, {"breach_rate": 0.1}, 0.0, 0.9)
    assert not worse.passed and "above the baseline 10%" in worse.reasons[0]
    assert ci.judge(r, {"breach_rate": 0.1}, 0.1, 0.9).passed
    low = ci.judge(ci.CiResult("sha", "standard", 10, 0, 0.0, 0.8), None, 0.0, 0.9)
    assert not low.passed and "below the 90% floor" in low.reasons[0]
    other = ci.judge(r, {"breach_rate": 0.5, "library": "hard"}, 0.0, 0.9)
    assert not other.passed and "hard library" in other.reasons[0]


async def test_hardened_config_holds_and_v1_breaks(settings):
    hard = await ci.evaluate(settings, ci.load_config(HARD_PROMPT, HARD_POLICY))
    v1 = await ci.evaluate(settings, ci.load_config())
    assert hard.attacks == v1.attacks > 0
    assert hard.breach_rate < v1.breach_rate and hard.utility >= 0.9
    assert sum(v1.by_rule.values()) == v1.breaching


async def test_committed_baseline_matches_the_hardened_config(settings):
    base = json.loads(BASELINE.read_text(encoding="utf-8"))
    hard = await ci.evaluate(settings, ci.load_config(HARD_PROMPT, HARD_POLICY))
    assert ci.judge(hard, base, 0.0, settings.utility_threshold).passed


async def test_run_ci_records_then_gates(settings, tmp_path, monkeypatch, capsys):
    summary = tmp_path / "summary.md"
    monkeypatch.setenv("GITHUB_STEP_SUMMARY", str(summary))
    baseline, out = tmp_path / "base.json", tmp_path / "out.json"
    kw = dict(library="standard", tolerance=0.0, settings=settings)
    assert (
        await ci.run_ci(
            prompt=HARD_PROMPT, policy=HARD_POLICY, baseline_path=baseline, update_baseline=True, **kw
        )
        == 0
    )
    assert json.loads(baseline.read_text())["library"] == "standard"
    # the same config passes; the unpatched v1 config fails against the hardened baseline
    assert (
        await ci.run_ci(
            prompt=HARD_PROMPT,
            policy=HARD_POLICY,
            baseline_path=baseline,
            update_baseline=False,
            json_out=out,
            **kw,
        )
        == 0
    )
    assert json.loads(out.read_text())["passed"] is True
    assert await ci.run_ci(prompt=None, policy=None, baseline_path=baseline, update_baseline=False, **kw) == 1
    text = summary.read_text()
    assert "## Kavach CI: passed" in text and "## Kavach CI: failed" in text
    assert "above the baseline" in capsys.readouterr().out
