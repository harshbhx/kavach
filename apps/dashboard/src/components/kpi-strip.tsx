import { NumberTicker } from '@/components/ui/number-ticker'
import type { RunView } from '@/lib/useRun'
import { cn } from '@/lib/utils'

function Kpi({ label, value, suffix, tone, note }: { label: string; value: number | null; suffix?: string; tone?: string; note: string }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="text-[11.5px] text-kv-muted">{label}</p>
      <p className={cn('font-display mt-0.5 text-[30px] leading-none font-semibold tabular-nums', tone ?? 'text-kv-text')}>
        {value === null ? (
          <span className="text-kv-faint">–</span>
        ) : (
          <>
            <NumberTicker value={value} className={cn('tracking-tight', tone ?? 'text-kv-text')} />
            {suffix && <span className="text-[18px] text-kv-faint">{suffix}</span>}
          </>
        )}
      </p>
      <p className="mt-1 truncate text-[11px] text-kv-faint">{note}</p>
    </div>
  )
}

/** The four numbers the judges care about, for the round in focus. */
export function KpiStrip({ run }: { run: RunView }) {
  const rounds = Object.values(run.rounds).sort((a, b) => a.round - b.round)
  const latest = run.chart[run.currentRound]
  const breach = latest?.breach ?? null
  const utilityRound = [...rounds].reverse().find((r) => r.utility_applied != null)
  const utility = run.final?.final_utility ?? utilityRound?.utility_applied ?? null
  const caught = run.toolCards.filter((c) => c.verdict === 'breach').length
  const blocked = run.toolCards.filter((c) => c.verdict === 'blocked').length
  const tth = rounds.find((r) => r.tth_seconds != null)?.tth_seconds ?? null

  return (
    <div className="grid grid-cols-2 divide-kv-border overflow-hidden rounded-2xl border border-kv-border bg-kv-surface/80 sm:grid-cols-4 sm:divide-x">
      <Kpi
        label={`Breach rate, round ${run.currentRound || 1}`}
        value={breach === null ? null : Math.round(breach * 100)}
        suffix="%"
        tone={breach && breach > 0 ? 'text-kv-attack' : undefined}
        note={rounds.length > 1 ? rounds.map((r) => `${Math.round(r.breach_rate * 100)}%`).join(' → ') : 'attacks that landed'}
      />
      <Kpi label="Utility" value={utility === null ? null : Math.round(utility * 100)} suffix="%" tone="text-kv-secure" note="normal requests served" />
      <Kpi label="Exploits caught" value={run.toolCards.length ? caught : null} tone="text-kv-attack" note="flagged by code" />
      <Kpi
        label="Blocked by guardrails"
        value={run.toolCards.length ? blocked : null}
        tone="text-kv-defend"
        note={tth != null ? `patched in ${Math.round(tth)}s` : 'stopped by patches'}
      />
    </div>
  )
}
