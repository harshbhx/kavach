import { Check } from 'lucide-react'
import { motion } from 'motion/react'
import { pct } from '@/lib/format'
import { PHASES, type RunView } from '@/lib/useRun'
import { cn } from '@/lib/utils'
import { Stamp } from './panel'

const LABEL: Record<(typeof PHASES)[number], string> = {
  probe: 'Probe',
  attack: 'Attack',
  detect: 'Detect',
  patch: 'Patch',
  audit: 'Audit',
}

const OUTCOME = {
  hardened: ['HARDENED', 'secure'],
  no_breach: ['HELD', 'defend'],
  unhardened: ['BREACHED', 'attack'],
} as const

/** The rounds as one ledger with three columns: where each round is in Probe → Audit, and how it closed. */
export function RoundRail({ run, total }: { run: RunView; total: number }) {
  const n = Math.max(total, run.currentRound)
  return (
    <div data-film="rounds" className="grid overflow-hidden rounded-xl border border-kv-border-strong/70 bg-kv-surface shadow-[0_18px_40px_-28px_rgb(14_35_28/0.45)] md:grid-cols-3">
      {Array.from({ length: n }, (_, i) => i + 1).map((r) => {
        const p = run.progress[r]
        const summary = run.rounds[r]
        const active = run.status === 'running' && run.currentRound === r && !summary
        const reached = p?.reached ?? -1
        const current = p && p.phase !== 'done' ? PHASES.indexOf(p.phase as (typeof PHASES)[number]) : -1
        const outcome = summary ? OUTCOME[summary.status as keyof typeof OUTCOME] : null
        return (
          <div key={r} className={cn('relative px-5 pt-3 pb-3.5', r > 1 && 'border-t border-kv-border md:border-t-0 md:border-l', active && 'bg-kv-defend-soft/50')}>
            <div className="mb-3 flex items-center gap-3">
              <span className="font-display text-[19px] leading-none whitespace-nowrap text-kv-text">Round {r}</span>
              <span className="font-mono text-[11.5px] text-kv-faint">
                {summary ? `against ${summary.config_attacked}` : active ? 'in progress' : 'waiting'}
              </span>
              <span className="ml-auto flex items-center gap-3">
                {summary && (
                  <span className="text-[12.5px] text-kv-muted">
                    breach <b className={summary.breach_rate > 0 ? 'text-kv-attack' : 'text-kv-text'}>{pct(summary.breach_rate)}</b>
                    {summary.vetoes > 0 && (
                      <>
                        , <b className="text-kv-verdict">{summary.vetoes} veto{summary.vetoes > 1 ? 'es' : ''}</b>
                      </>
                    )}
                  </span>
                )}
                {outcome && <Stamp tone={outcome[1]}>{outcome[0]}</Stamp>}
              </span>
            </div>
            <ol className="flex items-start">
              {PHASES.map((ph, i) => {
                const skipped = r > 1 && ph === 'probe'
                const done = !skipped && (reached > i || summary !== undefined) && !(current === i && active)
                const now = active && current === i
                const vetoes = ph === 'patch' ? (p?.vetoes ?? 0) : 0
                return (
                  <li key={ph} className="flex flex-1 items-start last:flex-none">
                    <div className="flex w-12 flex-col items-center gap-1">
                      <span
                        className={cn(
                          'relative grid size-6 place-items-center rounded-full border-[1.5px] text-[11px]',
                          skipped && 'border-dashed border-kv-border-strong text-kv-faint',
                          !skipped && !done && !now && 'border-kv-border-strong bg-kv-surface',
                          done && 'border-kv-secure bg-kv-secure text-kv-surface',
                          now && 'border-kv-text bg-kv-text text-kv-surface',
                        )}
                      >
                        {done && <Check className="size-3.5" strokeWidth={3} />}
                        {now && (
                          <motion.span
                            className="absolute inset-0 rounded-full border-2 border-kv-text"
                            animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                          />
                        )}
                      </span>
                      <span className={cn('text-[11.5px]', now ? 'font-semibold text-kv-text' : done ? 'text-kv-muted' : 'text-kv-faint')}>
                        {skipped ? 'Reused' : LABEL[ph]}
                      </span>
                      {vetoes > 0 && <span className="-mt-0.5 text-[10.5px] font-semibold text-kv-verdict">{vetoes} vetoed</span>}
                    </div>
                    {i < PHASES.length - 1 && (
                      <span className={cn('mt-3 h-px flex-1', reached > i || summary ? 'bg-kv-secure/60' : 'bg-kv-border-strong/60')} />
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
