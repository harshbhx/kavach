"""The round loop (docs/ARCHITECTURE.md §3): recon → attacks → detect → patch ⇄ audit → score."""

from __future__ import annotations

import asyncio
import difflib
import logging
import time
from dataclasses import dataclass, field

from kavach.agents import AgentCtx, blue, red, referee
from kavach.band.room import BandRoom
from kavach.brains import Brain
from kavach.config import Settings
from kavach.models import (
    Attack,
    AttackResult,
    Dossier,
    Finding,
    MonitorReport,
    RoundSummary,
    RunSummary,
    TargetConfig,
)
from kavach.orchestrator.audit import audit
from kavach.orchestrator.events import EventBus
from kavach.report.markdown import build_report
from kavach.scoring import detectors, metrics
from kavach.target.db import load_v1_config
from kavach.target_client import TargetClient

log = logging.getLogger(__name__)


@dataclass
class RunState:
    summary: RunSummary
    configs: dict[str, TargetConfig] = field(default_factory=dict)
    findings: list[Finding] = field(default_factory=list)
    patch_history: list[dict] = field(default_factory=list)
    final_report: dict | None = None
    report_md: str | None = None


def policy_changes(old: dict, new: dict, prefix: str = "") -> list[str]:
    out = []
    for key in sorted(set(old) | set(new)):
        a, b = old.get(key), new.get(key)
        path = f"{prefix}{key}"
        if isinstance(a, dict) and isinstance(b, dict):
            out += policy_changes(a, b, path + ".")
        elif a != b:
            if key == "input_filters":
                ids_a = {f["id"] for f in a or []}
                ids_b = {f["id"] for f in b or []}
                out += [f"+ input filter {i}" for i in sorted(ids_b - ids_a)] + [
                    f"- input filter {i}" for i in sorted(ids_a - ids_b)
                ]
            else:
                out.append(f"{path}: {a} → {b}")
    return out


def diff_stats(old: str, new: str) -> dict[str, int]:
    added = removed = 0
    for line in difflib.unified_diff(old.splitlines(), new.splitlines(), lineterm=""):
        if line.startswith("+") and not line.startswith("+++"):
            added += 1
        elif line.startswith("-") and not line.startswith("---"):
            removed += 1
    return {"added": added, "removed": removed}


class KavachRun:
    def __init__(
        self,
        settings: Settings,
        run_id: str,
        bus: EventBus,
        brain: Brain,
        target: TargetClient,
        band: BandRoom,
    ):
        self.s = settings
        self.run_id = run_id
        self.bus = bus
        self.ctx = AgentCtx(brain, settings, run_id)
        self.target = target
        self.band = band
        self.state = RunState(summary=RunSummary(run_id=run_id, mode="live"))
        self.deployed: TargetConfig = load_v1_config()
        self.state.configs["v1"] = self.deployed
        self.dossier: Dossier | None = None
        self.patch_notes: str | None = None
        self._next_version = 2

    # ── helpers ──
    def emit(
        self, type: str, data: dict | None = None, *, round: int | None = None, agent: str | None = None
    ):
        return self.bus.emit(type, data, round=round, agent=agent)

    def _emit_response(self, r: AttackResult, kind: str, round_no: int, ref: str) -> None:
        if r.response is None:
            self.emit(
                "target.response",
                {"kind": kind, "ref": ref, "error": r.error, "config_version": r.config_version},
                round=round_no,
            )
            return
        resp = r.response
        self.emit(
            "target.response",
            {
                "kind": kind,
                "ref": ref,
                "reply_excerpt": resp.reply[:400],
                "config_version": resp.config_version,
                "input_blocked_by": resp.input_blocked_by,
                "latency_ms": resp.latency_ms,
            },
            round=round_no,
        )
        if resp.input_blocked_by:
            self.emit(
                "toolcall.intercepted",
                {
                    "kind": kind,
                    "ref": ref,
                    "verdict": "blocked",
                    "config_version": resp.config_version,
                    "record": None,
                    "input_blocked_by": resp.input_blocked_by,
                },
                round=round_no,
            )
        for c in resp.tool_calls:
            verdict, rule = detectors.verdict_for_call(c, r.session_user)
            self.emit(
                "toolcall.intercepted",
                {
                    "kind": kind,
                    "ref": ref,
                    "verdict": verdict,
                    "rule_id": rule,
                    "config_version": resp.config_version,
                    "record": c.model_dump(),
                },
                round=round_no,
            )

    async def _attack(self, a: Attack, round_no: int) -> AttackResult:
        try:
            resp = await self.target.chat(a.message, config_override=self.deployed, request_id=a.id)
            return AttackResult(attack=a, response=resp, config_version=self.deployed.version)
        except Exception as exc:
            return AttackResult(attack=a, error=str(exc), config_version=self.deployed.version)

    # ── main ──
    async def run(self) -> RunState:
        s = self.s
        self.emit(
            "run.started",
            {
                "mode": "live",
                "rounds": s.rounds,
                "attacks_per_agent": s.attacks_per_agent,
                "brain_provider": s.brain_provider,
                "target_url": s.target_url,
                "target_model": s.target_model,
            },
        )
        await self.band.open()
        self.state.summary.band_room_url = self.band.room_url
        if self.band.room_url:
            self.emit("band.room", {"url": self.band.room_url})
        try:
            for r in range(1, s.rounds + 1):
                self.state.summary.current_round = r
                await self._round(r)
            await self._finish()
            self.state.summary.status = "completed"
        except asyncio.CancelledError:
            self.state.summary.status = "stopped"
            self.emit("error", {"where": "run", "detail": "stopped", "fatal": True})
            raise
        except Exception as exc:
            log.exception("run failed")
            self.state.summary.status = "failed"
            self.emit("error", {"where": "run", "detail": str(exc)[:500], "fatal": True})
        finally:
            await self.band.aclose()
            self.bus.close()
        return self.state

    async def _round(self, r: int) -> None:
        t0 = time.monotonic()
        summary = RoundSummary(round=r, config_attacked=self.deployed.version)
        self.state.summary.rounds.append(summary)
        self.emit("round.started", {"config_version": self.deployed.version}, round=r)
        first = ["recon"] if r == 1 else ["injection", "social"]
        await self.band.post(
            "referee", f"⚖️ Round {r}: target DiwaliMart {self.deployed.version}. Go.", first, round=r
        )

        if r == 1 or self.dossier is None:
            plan = await red.plan_probes(self.ctx, r)
            probe_results = await asyncio.gather(
                *(
                    self._attack(Attack(id=f"probe-{i + 1}", technique="probe", goal="recon", message=p), r)
                    for i, p in enumerate(plan.probes)
                )
            )
            for pr in probe_results:
                self._emit_response(pr, "probe", r, pr.attack.id)
            pairs = [
                {
                    "probe": pr.attack.message,
                    "reply": pr.response.reply if pr.response else "",
                    "tool_calls": [
                        c.model_dump(include={"tool", "args", "executed"})
                        for c in (pr.response.tool_calls if pr.response else [])
                    ],
                }
                for pr in probe_results
            ]
            self.dossier = await red.write_dossier(self.ctx, pairs)
            self.emit(
                "recon.dossier", self.dossier.model_dump(exclude={"band_message"}), round=r, agent="recon"
            )
            await self.band.post(
                "recon", self.dossier.band_message or "🛰️ Dossier ready.", ["injection", "social"], round=r
            )

        inj, soc = await asyncio.gather(
            red.generate_attacks(self.ctx, "injection", r, self.dossier, self.patch_notes),
            red.generate_attacks(self.ctx, "social", r, self.dossier, self.patch_notes),
        )
        attacks = inj.attacks + soc.attacks
        for a in attacks:
            self.emit(
                "attack.launched",
                {
                    "attack_id": a.id,
                    "agent": a.agent,
                    "technique": a.technique,
                    "goal": a.goal,
                    "message": a.message,
                    "source": a.source,
                },
                round=r,
                agent=a.agent,
            )
        await self.band.post(
            "injection", inj.band_message or f"💉 {len(inj.attacks)} attacks queued.", ["monitor"], round=r
        )
        await self.band.post(
            "social", soc.band_message or f"🎭 {len(soc.attacks)} attacks queued.", ["monitor"], round=r
        )

        results = await asyncio.gather(*(self._attack(a, r) for a in attacks))
        findings: list[Finding] = []
        for res in results:
            self._emit_response(res, "attack", r, res.attack.id)
            fs = detectors.detect(res, self.deployed.system_prompt)
            for f in fs:
                self.emit("breach.detected", f.model_dump(), round=r)
            findings += fs
        self.state.findings += findings
        bs = metrics.breach_summary(results, findings)
        summary.total_attacks, summary.breaching, summary.errors = (
            bs["total_attacks"],
            bs["breaching"],
            bs["errors"],
        )
        summary.breach_rate, summary.findings_by_rule = bs["breach_rate"], bs["findings_by_rule"]
        self.emit("round.breach_scored", bs, round=r)

        report = MonitorReport(incident_summary="No breaches this round")
        if not findings:
            summary.status = "no_breach"
            await self.band.post(
                "monitor",
                f"🛡️ No breaches in round {r}. {self.deployed.version} holds.",
                ["referee"],
                round=r,
            )
        else:
            report = await blue.explain_incidents(self.ctx, r, self.deployed.version, findings, results)
            self.emit("monitor.report", report.model_dump(exclude={"band_message"}), round=r, agent="monitor")
            await self.band.post("monitor", report.band_message or "🚨 Breaches found.", ["patcher"], round=r)
            breaching = [res for res in results if res.attack.id in {f.attack_id for f in findings}]
            await self._patch_loop(r, report, breaching, summary, t0)

        commentary = await referee.round_commentary(self.ctx, summary, report.incident_summary)
        self.emit("round.scored", summary.model_dump(), round=r)
        nxt = ["injection", "social"] if r < self.s.rounds else ["owner"]
        await self.band.post("referee", commentary.band_message, nxt, round=r)

    async def _patch_loop(
        self, r: int, report: MonitorReport, breaching: list[AttackResult], summary: RoundSummary, t0: float
    ) -> None:
        version = f"v{self._next_version}"
        veto_reasons: list[str] = []
        for attempt in range(1, self.s.max_patch_attempts + 1):
            summary.attempts = attempt
            proposal = await blue.propose_patch(
                self.ctx, r, attempt, self.deployed, report, veto_reasons, version
            )
            if proposal is None:
                summary.vetoes += 1
                veto_reasons = ["patcher_failed: no valid candidate"]
                self.emit(
                    "audit.result",
                    {
                        "attempt": attempt,
                        "candidate_version": version,
                        "decision": "veto",
                        "replay": {"total": 0, "still_breaching": 0},
                        "utility": None,
                        "reasons": veto_reasons,
                    },
                    round=r,
                    agent="auditor",
                )
                continue
            candidate = TargetConfig(
                version=version,
                system_prompt=proposal.candidate.system_prompt,
                guard_policy=proposal.candidate.guard_policy,
            )
            self.state.configs[f"{version}-a{attempt}"] = candidate
            self.emit(
                "patch.proposed",
                {
                    "attempt": attempt,
                    "candidate_version": version,
                    "changelog": proposal.changelog,
                    "rationale": proposal.rationale,
                    "prompt_diff_stats": diff_stats(self.deployed.system_prompt, candidate.system_prompt),
                    "policy_changes": policy_changes(
                        self.deployed.guard_policy.model_dump(), candidate.guard_policy.model_dump()
                    ),
                    "config_key": f"{version}-a{attempt}",
                },
                round=r,
                agent="patcher",
            )
            await self.band.post(
                "patcher",
                proposal.band_message or f"🛠️ Candidate {version}, attempt {attempt}.",
                ["auditor"],
                round=r,
            )

            outcome, replays = await audit(self.target, candidate, breaching, attempt, self.s)
            for rr in replays:
                self._emit_response(rr, "replay", r, rr.attack.id)
            self.emit(
                "audit.result",
                {
                    "attempt": attempt,
                    "candidate_version": version,
                    "decision": outcome.decision,
                    "replay": {
                        "total": outcome.replay_total,
                        "still_breaching": outcome.replay_still_breaching,
                        "details": outcome.replay_details,
                    },
                    "utility": outcome.utility.model_dump(),
                    "reasons": outcome.reasons,
                },
                round=r,
                agent="auditor",
            )
            verdict = await blue.explain_audit(self.ctx, r, outcome, proposal.changelog)
            if outcome.decision == "approve":
                await self.band.post("auditor", verdict.verdict_message, ["referee"], round=r)
                self.deployed = candidate
                self.state.configs[version] = candidate
                self._next_version += 1
                try:
                    await self.target.put_config(candidate)
                except Exception as exc:
                    self.emit(
                        "error", {"where": "put_config", "detail": str(exc)[:300], "fatal": False}, round=r
                    )
                summary.applied_version = version
                summary.utility_applied = outcome.utility.score
                summary.tth_seconds = round(time.monotonic() - t0, 1)
                summary.status = "hardened"
                self.state.summary.deployed_version = version
                self.patch_notes = "; ".join(proposal.changelog)
                self.state.patch_history.append(
                    {"version": version, "round": r, "changelog": proposal.changelog}
                )
                self.emit("patch.applied", {"version": version, "tth_seconds": summary.tth_seconds}, round=r)
                return
            summary.vetoes += 1
            await self.band.post("auditor", verdict.verdict_message, ["patcher"], round=r)
            veto_reasons = outcome.reasons + (
                [verdict.advice_to_patcher] if verdict.advice_to_patcher else []
            )
        summary.status = "unhardened"

    async def _finish(self) -> None:
        rounds = [rs.model_dump() for rs in self.state.summary.rounds]
        final_utility = next(
            (
                rs.utility_applied
                for rs in reversed(self.state.summary.rounds)
                if rs.utility_applied is not None
            ),
            None,
        )
        payload = {
            "rounds": rounds,
            "findings_by_owasp": metrics.owasp_breakdown(self.state.findings),
            "patch_history": self.state.patch_history,
            "first_config_version": "v1",
            "final_config_version": self.deployed.version,
            "final_breach_rate": rounds[-1]["breach_rate"] if rounds else None,
            "final_utility": final_utility,
        }
        fr = await referee.final_report(self.ctx, payload)
        self.state.final_report = fr.model_dump()
        self.state.report_md = build_report(self.state, self.deployed, fr)
        self.state.summary.report_ready = True
        self.emit("report.ready", {"url": f"/api/runs/{self.run_id}/report.md"})
        self.emit(
            "run.completed",
            {
                "final_breach_rate": payload["final_breach_rate"],
                "final_utility": final_utility,
                "total_exploits": len({f.attack_id for f in self.state.findings}),
                "owasp_breakdown": payload["findings_by_owasp"],
                "deployed_version": self.deployed.version,
            },
        )
        await self.band.post("referee", fr.band_message or "⚖️ Run complete. Report is ready.", ["owner"])
