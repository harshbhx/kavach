from kavach.models import RoundSummary, RunSummary
from kavach.record_demo import story_problems


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
