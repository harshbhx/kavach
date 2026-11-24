import { RULE_LABEL, pct } from '../lib/format'
import type { RunView } from '../lib/useRun'

const STATUS = {
  hardened: { label: 'Hardened', cls: 'text-kv-secure bg-kv-secure-soft' },
  no_breach: { label: 'Held', cls: 'text-kv-defend bg-kv-defend-soft' },
  unhardened: { label: 'Unhardened', cls: 'text-kv-attack bg-kv-attack-soft' },
  running: { label: 'Running', cls: 'text-kv-verdict bg-kv-verdict-soft' },
} as const

export function Scoreboard({ run, totalRounds }: { run: RunView; totalRounds: number }) {
  const n = Math.max(totalRounds, run.currentRound, Object.keys(run.rounds).length)
  const trend = Object.values(run.rounds)
    .sort((a, b) => a.round - b.round)
    .map((r) => pct(r.breach_rate))
    .join(' → ')

  return (
    <section className="space-y-3">
      {run.final && (
        <div className="kv-fade-in flex flex-wrap items-center gap-x-8 gap-y-2 rounded-kv border border-kv-secure/40 bg-kv-secure-soft px-5 py-3">
          <span className="text-sm font-semibold text-kv-secure">Run complete</span>
          <span className="text-sm text-kv-text">
            Breach <b className="font-display text-lg">{trend}</b>
          </span>
          <span className="text-sm text-kv-text">
            Utility <b className="font-display text-lg">{pct(run.final.final_utility)}</b>
          </span>
          <span className="text-sm text-kv-text">
            Exploits found <b className="font-display text-lg">{run.final.total_exploits}</b>
          </span>
          <span className="text-sm text-kv-text">
            Deployed <b className="font-mono">{run.final.deployed_version}</b>
          </span>
        </div>
      )}
      <div className="grid gap-3 md:[grid-template-columns:repeat(var(--kv-cols),minmax(0,1fr))]" style={{ ["--kv-cols" as string]: Math.max(n, 1) }}>
        {Array.from({ length: Math.max(n, 1) }, (_, i) => i + 1).map((r) => {
          const s = run.rounds[r]
          const live = !s && run.currentRound === r && run.status === 'running'
          const st = s ? STATUS[s.status] : live ? STATUS.running : null
          return (
            <div key={r} className="rounded-kv border border-kv-border bg-kv-surface px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-kv-muted">
                  Round {r}
                  {s && <span className="ml-2 font-mono text-kv-faint">vs {s.config_attacked}</span>}
                </span>
                {st && <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[11px] text-kv-faint">Breach</div>
                  <div className="font-display text-2xl font-bold" style={{ color: s && s.breach_rate > 0 ? 'var(--kv-attack)' : 'var(--kv-text)' }}>
                    {s ? pct(s.breach_rate) : '–'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-kv-faint">Utility</div>
                  <div className="font-display text-2xl font-bold text-kv-secure">
                    {s ? (s.utility_applied != null ? pct(s.utility_applied) : <span className="text-base font-semibold text-kv-faint">no patch needed</span>) : '–'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-kv-faint">Harden</div>
                  <div className="font-display text-2xl font-bold">{s?.tth_seconds != null ? `${Math.round(s.tth_seconds)}s` : '–'}</div>
                </div>
              </div>
              {s && (
                <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-kv-muted">
                  <span>
                    {s.breaching}/{s.total_attacks} attacks landed · {s.attempts} patch{s.attempts === 1 ? '' : 'es'} · {s.vetoes} veto{s.vetoes === 1 ? '' : 'es'}
                  </span>
                  {Object.entries(s.findings_by_rule).map(([k, v]) => (
                    <span key={k} className="rounded bg-kv-attack-soft px-1 text-kv-attack">
                      {RULE_LABEL[k] ?? k} ×{v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
