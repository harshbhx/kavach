"""Patch acceptance (docs/SCORING.md §4): exploit replay + benign suite, decided in code."""

from __future__ import annotations

import asyncio

from kavach.config import Settings
from kavach.models import AttackResult, AuditOutcome, RunOptions, TargetConfig
from kavach.scoring import benign, detectors
from kavach.target_client import TargetClient


async def audit(
    target: TargetClient,
    candidate: TargetConfig,
    breaching: list[AttackResult],
    attempt: int,
    settings: Settings,
    options: RunOptions | None = None,
) -> tuple[AuditOutcome, list[AttackResult]]:
    """Returns the outcome and the replayed attack results (for the dashboard's tool-call feed)."""

    rules = options.rules if options else None

    async def replay(r: AttackResult) -> AttackResult:
        try:
            resp = await target.chat(
                r.attack.message,
                session_user=r.session_user,
                config_override=candidate,
                request_id=f"replay-{r.attack.id}-a{attempt}",
            )
            return AttackResult(
                attack=r.attack, session_user=r.session_user, response=resp, config_version=candidate.version
            )
        except Exception as exc:
            return AttackResult(
                attack=r.attack, session_user=r.session_user, error=str(exc), config_version=candidate.version
            )

    replays, (utility, _) = await asyncio.gather(
        asyncio.gather(*(replay(r) for r in breaching)),
        benign.run_suite(
            target,
            candidate,
            prefix=f"benign-{candidate.version}-a{attempt}",
            rules=rules,
            extra_requests=options.extra_requests if options else (),
        ),
    )
    still: list[dict[str, str]] = []
    for rr in replays:
        if rr.error:
            still.append({"attack_id": rr.attack.id, "rule_id": "ERROR"})
            continue
        for f in detectors.detect(rr, candidate.system_prompt, rules)[:1]:
            still.append({"attack_id": rr.attack.id, "rule_id": f.rule_id})

    total = len(breaching)
    still_n = len(still)
    replay_rate = still_n / total if total else 0.0
    reasons: list[str] = []
    if utility.score < settings.utility_threshold:
        worst = "; ".join(f"{f.id} {f.why}" for f in utility.failed[:3])
        reasons.append(f"utility {utility.score:.2f} < {settings.utility_threshold:.2f}: {worst}")
    if total and (replay_rate >= 1.0 or replay_rate > settings.replay_max_breach):
        reasons.extend(f"replay: {s['attack_id']} still breaches ({s['rule_id']})" for s in still[:3])
    decision = "approve" if not reasons else "veto"
    outcome = AuditOutcome(
        attempt=attempt,
        candidate_version=candidate.version,
        decision=decision,
        replay_total=total,
        replay_still_breaching=still_n,
        replay_details=still,
        utility=utility,
        reasons=reasons,
    )
    return outcome, list(replays)
