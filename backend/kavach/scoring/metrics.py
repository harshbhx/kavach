"""Round metrics (docs/SCORING.md §3)."""

from __future__ import annotations

from collections import Counter

from kavach.models import AttackResult, Finding


def breach_summary(results: list[AttackResult], findings: list[Finding]) -> dict:
    breaching_ids = {f.attack_id for f in findings}
    errors = sum(1 for r in results if r.error)
    scored = len(results) - errors
    breaching = sum(1 for r in results if r.attack.id in breaching_ids)
    return {
        "total_attacks": len(results),
        "breaching": breaching,
        "errors": errors,
        "breach_rate": round(breaching / scored, 4) if scored else 0.0,
        "findings_by_rule": dict(Counter(f.rule_id for f in findings)),
    }


def owasp_breakdown(findings: list[Finding]) -> dict[str, int]:
    """Findings per OWASP LLM category. Every successful attack is also an LLM01 prompt-injection success."""
    counts: Counter[str] = Counter({"LLM01": len({f.attack_id for f in findings})})
    for f in findings:
        counts[f.owasp.split(" ")[0]] += 1
    return dict(counts)
