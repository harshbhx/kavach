import { Empty, Panel, Stamp } from '@/components/panel'
import { PatchPanel } from '@/components/patch-panel'
import { pct } from '@/lib/format'
import type { TargetConfig } from '@/lib/types'
import type { RunView } from '@/lib/useRun'
import { GitCompareArrows } from 'lucide-react'

const WHERE: Record<string, string> = { band: 'in the Band room', dashboard: 'from the dashboard', api: 'through the API' }

/** Every candidate the Patcher wrote, what the Auditor and a person decided, and the diff itself. */
export function PatchesView({ run, demoData }: { run: RunView; demoData?: () => { configs: Record<string, TargetConfig>; reportMd: string | null } | null }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className="min-w-0">
        <Panel title="Candidates" hint="Patcher → Auditor → a person, attempt by attempt" className="max-h-[calc(100vh-11rem)]" bodyClassName="overflow-y-auto">
          {run.patches.length === 0 ? (
            <Empty icon={<GitCompareArrows className="size-5" />} title="No candidates yet">
              When the first breach lands, the Patcher writes a new prompt and guard policy. Each attempt lands here with its audit.
            </Empty>
          ) : (
            <ol className="divide-y divide-kv-border/70">
              {run.patches.map((p) => {
                const decision = run.approvals.find((a) => a.version === p.candidate_version && a.round === p.round && a.attempt === p.attempt)?.decided
                const deployed = run.deployedVersion === p.candidate_version && p.audit?.decision === 'approve' && decision?.decision !== 'reject'
                return (
                  <li key={`${p.round}-${p.candidate_version}-${p.attempt}`} className="space-y-2 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[14px] font-semibold text-kv-text">
                        {p.candidate_version}
                        <span className="text-kv-faint">-a{p.attempt}</span>
                      </span>
                      <span className="text-[12px] text-kv-faint">round {p.round}</span>
                      <span className="ml-auto flex gap-1.5">
                        {p.audit && <Stamp tone={p.audit.decision === 'veto' ? 'attack' : 'secure'}>{p.audit.decision === 'veto' ? 'VETOED' : 'PASSED'}</Stamp>}
                        {decision && <Stamp tone={decision.decision === 'approve' ? 'secure' : 'attack'}>{decision.decision === 'approve' ? 'APPROVED' : 'REJECTED'}</Stamp>}
                      </span>
                    </div>
                    {p.policy_changes?.length > 0 && (
                      <ul className="space-y-0.5 font-mono text-[11.5px] leading-5 text-kv-defend">
                        {p.policy_changes.slice(0, 5).map((c) => (
                          <li key={c} className="truncate" title={c}>
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}
                    {p.audit && (
                      <p className="text-[12.5px] text-kv-muted">
                        Replay: {p.audit.replay.still_breaching} of {p.audit.replay.total} still land. Utility {pct(p.audit.utility?.score)}.
                        {p.audit.decision === 'veto' && p.audit.reasons[0] && <span className="block text-kv-attack">{p.audit.reasons[0]}</span>}
                      </p>
                    )}
                    {decision && (
                      <p className="text-[12.5px] text-kv-muted">
                        {decision.source === 'timeout' ? `No answer, ${decision.decision === 'approve' ? 'approved' : 'rejected'} by policy` : `${decision.decision === 'approve' ? 'Approved' : 'Rejected'} by ${decision.by} ${WHERE[decision.source] ?? ''}`}
                        {decision.reason ? `: ${decision.reason}` : ''}.
                      </p>
                    )}
                    {deployed && <p className="text-[12.5px] font-semibold text-kv-secure">Deployed</p>}
                  </li>
                )
              })}
            </ol>
          )}
        </Panel>
      </aside>
      <div className="h-[calc(100vh-11rem)] min-h-[560px] min-w-0">
        <PatchPanel run={run} demoData={demoData} />
      </div>
    </div>
  )
}
