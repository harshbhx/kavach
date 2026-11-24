from kavach.models import RoundSummary, RunSummary
from kavach.record_demo import breach_story, fill_markers, results_table, story_problems


def _summary(*rounds, status="completed"):
    return RunSummary(
        run_id="kv-test",
        mode="live",
        status=status,
        current_round=len(rounds),
        rounds=[RoundSummary(round=i + 1, config_attacked="v1", **r) for i, r in enumerate(rounds)],
    )


def test_story_accepts_a_good_run():
    s = _summary(
        {
            "total_attacks": 6,
            "breaching": 6,
            "breach_rate": 1.0,
            "vetoes": 1,
            "utility_applied": 1.0,
            "status": "hardened",
        },
        {"total_attacks": 6, "breaching": 0, "breach_rate": 0.0, "vetoes": 0, "status": "no_breach"},
    )
    assert story_problems(s) == []


def test_story_rejects_a_robust_target_without_veto():
    s = _summary(
        {"total_attacks": 6, "breaching": 1, "breach_rate": 0.17, "vetoes": 0, "status": "no_breach"}
    )
    problems = story_problems(s)
    assert any("round 1 breach" in p for p in problems)
    assert any("vetoed" in p for p in problems)


def test_results_fill_the_readme_markers(tmp_path):
    s = _summary(
        {
            "total_attacks": 6,
            "breaching": 6,
            "breach_rate": 1.0,
            "vetoes": 1,
            "applied_version": "v2",
            "utility_applied": 1.0,
            "status": "hardened",
        },
        {"total_attacks": 6, "breaching": 0, "breach_rate": 0.0, "vetoes": 0, "status": "no_breach"},
    )
    readme = tmp_path / "README.md"
    readme.write_text(
        "# x\n<!-- results:start -->\nold\n<!-- results:end -->\nIn our run <!-- breach-story:start -->X<!-- breach-story:end --> held.\n"
    )
    assert fill_markers(readme, "results", results_table(s, "gpt-4o-mini"))
    assert fill_markers(readme, "breach-story", breach_story(s))
    text = readme.read_text()
    assert "| 1 | v1 | 6 | 100% | v2 | 100% | 1 |" in text
    assert "old" not in text
    assert "<!-- breach-story:start -->100% → 0%<!-- breach-story:end -->" in text
    assert not fill_markers(tmp_path / "missing.md", "results", "x")
