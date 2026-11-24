import { Check } from 'lucide-react'
import { motion } from 'motion/react'
import { pct } from '@/lib/format'
import { PHASES, type RunView } from '@/lib/useRun'
import { cn } from '@/lib/utils'

const LABEL: Record<(typeof PHASES)[number], string> = {
  probe: 'Probe',
  attack: 'Attack',
  detect: 'Detect',
  patch: 'Patch',
  audit: 'Audit',
}

const OUTCOME = {
  hardened: ['Hardened', 'text-kv-secure bg-kv-secure-soft'],
  no_breach: ['Held', 'text-kv-defend bg-kv-defend-soft'],
  unhardened: ['Unhardened', 'text-kv-attack bg-kv-attack-soft'],
} as const

/** One strip per round: where the round is in Probe → Attack → Detect → Patch → Audit, and how it ended. */
export function RoundRail({ run, total }: { run: RunView; total: number }) {
  const n = Math.max(total, run.currentRound)
  return (
    <div className="grid gap-3 px-4 md:grid-cols-3">
      {Array.from({ length: n }, (_, i) => i + 1).map((r) => {
        const p = run.progress[r]
        const summary = run.rounds[r]
        const active = run.status === 'running' && run.currentRound === r && !summary
        const reached = p?.reached ?? -1
        const current = p && p.phase !== 'done' ? PHASES.indexOf(p.phase as (typeof PHASES)[number]) : -1
        const outcome = summary ? OUTCOME[summary.status as keyof typeof OUTCOME] : null
        return (
          <div
            key={r}
            className={cn(
              'rounded-xl border px-4 py-3 transition-colors',
              active ? 'border-kv-brand/50 bg-kv-brand-soft/40' : 'border-kv-border bg-kv-surface/60',
            )}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[13px] font-semibold text-kv-text">Round {r}</span>
              {summary && <span className="font-mono text-[11px] text-kv-faint">attacked {summary.config_attacked}</span>}
              <span className="ml-auto flex items-center gap-2">
                {summary && (
                  <span className="text-[11px] text-kv-muted">
                    breach <b className={summary.breach_rate > 0 ? 'text-kv-attack' : 'text-kv-text'}>{pct(summary.breach_rate)}</b>
                    {summary.vetoes > 0 && (
                      <>
                        , <b className="text-kv-verdict">{summary.vetoes} veto{summary.vetoes > 1 ? 'es' : ''}</b>
                      </>
                    )}
                  </span>
                )}
                {outcome && <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-semibold', outcome[1])}>{outcome[0]}</span>}
                {active && <span className="rounded-md bg-kv-brand-soft px-1.5 py-0.5 text-[11px] font-semibold text-kv-brand-hover">In progress</span>}
              </span>
            </div>
            <ol className="flex items-center">
              {PHASES.map((ph, i) => {
                const skipped = r > 1 && ph === 'probe'
                const done = !skipped && (reached > i || summary !== undefined) && !(current === i && active)
                const now = active && current === i
                const veto = ph === 'patch' && (p?.vetoes ?? 0) > 0
                return (
                  <li key={ph} className="flex flex-1 items-center last:flex-none">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={cn(
                          'relative grid size-5 place-items-center rounded-full border text-[10px]',
                          skipped && 'border-dashed border-kv-border text-kv-faint',
                          !skipped && !done && !now && 'border-kv-border-strong bg-kv-bg',
                          done && 'border-kv-secure/60 bg-kv-secure-soft text-kv-secure',
                          now && 'border-kv-brand bg-kv-brand text-kv-bg',
                        )}
                      >
                        {done && <Check className="size-3" strokeWidth={3} />}
                        {now && (
                          <motion.span
                            className="absolute inset-0 rounded-full border border-kv-brand"
                            animate={{ scale: [1, 1.7], opacity: [0.7, 0] }}
                            transition={{ duration: 1.4, repeat: Infinity }}
                          />
                        )}
                      </span>
                      <span
                        className={cn(
                          'text-[10.5px]',
                          now ? 'font-semibold text-kv-text' : done ? 'text-kv-muted' : 'text-kv-faint',
                          veto && 'text-kv-verdict',
                        )}
                      >
                        {skipped ? 'Reused' : LABEL[ph]}
                        {veto && ` ×${(p?.vetoes ?? 0) + 1}`}
                      </span>
                    </div>
                    {i < PHASES.length - 1 && (
                      <span className={cn('mx-1 mb-4 h-px flex-1', reached > i || summary ? 'bg-kv-secure/40' : 'bg-kv-border')} />
                    )}
                  </li>
                )
              })}
            </ol>
          </div>
        )
      })}
    </div>
  )
}
