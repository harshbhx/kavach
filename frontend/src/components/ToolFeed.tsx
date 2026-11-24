import { useMemo, useState } from 'react'
import { useStickyScroll } from '../lib/useStickyScroll'
import { RULE_LABEL, TECHNIQUE_LABEL, callLabel } from '../lib/format'
import type { AttackInfo, ToolCard } from '../lib/types'

type Filter = 'all' | 'breach' | 'blocked'

const STYLE = {
  breach: 'border-kv-attack/60 bg-kv-attack-soft',
  blocked: 'border-kv-defend/50 bg-kv-defend-soft',
  ok: 'border-kv-border bg-kv-surface-2',
} as const

function Tag({ card }: { card: ToolCard }) {
  if (card.verdict === 'breach')
    return <span className="rounded-md bg-kv-attack px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-white">BREACH · {RULE_LABEL[card.ruleId ?? ''] ?? card.ruleId}</span>
  if (card.verdict === 'blocked') {
    const pending = card.record?.result?.status === 'pending_human_approval'
    return (
      <span className="rounded-md bg-kv-defend px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-kv-bg">
        {pending ? `SENT FOR APPROVAL · ${card.configVersion}` : `BLOCKED BY GUARDRAIL ${card.configVersion}`}
      </span>
    )
  }
  return <span className="rounded-md bg-kv-border px-1.5 py-0.5 text-[11px] font-semibold text-kv-muted">OK</span>
}

export function ToolFeed({ cards, attacks }: { cards: ToolCard[]; attacks: Record<string, AttackInfo> }) {
  const [filter, setFilter] = useState<Filter>('all')
  const shown = useMemo(() => (filter === 'all' ? cards : cards.filter((c) => c.verdict === filter)), [cards, filter])
  const box = useStickyScroll([shown.length])
  const counts = useMemo(
    () => ({ breach: cards.filter((c) => c.verdict === 'breach').length, blocked: cards.filter((c) => c.verdict === 'blocked').length }),
    [cards],
  )

  return (
    <section className="flex min-h-0 flex-col rounded-kv border border-kv-border bg-kv-surface">
      <div className="flex items-center gap-2 border-b border-kv-border px-4 py-3">
        <h2 className="mr-auto text-sm font-semibold">Intercepted tool calls</h2>
        {(['all', 'breach', 'blocked'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-2.5 py-1 text-xs ${filter === f ? 'bg-kv-surface-2 text-kv-text ring-1 ring-kv-border-strong' : 'text-kv-muted hover:text-kv-text'}`}
          >
            {f === 'all' ? `All ${cards.length}` : f === 'breach' ? `Breaches ${counts.breach}` : `Blocked ${counts.blocked}`}
          </button>
        ))}
      </div>
      <div ref={box} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 font-mono text-[13px]">
        {shown.length === 0 && <p className="pt-8 text-center font-sans text-sm text-kv-faint">Every tool call the target makes shows up here.</p>}
        {shown.map((c) => {
          const atk = attacks[c.ref]
          return (
            <div key={c.seq} className={`kv-fade-in rounded-kv border px-3 py-2 ${STYLE[c.verdict]}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Tag card={c} />
                <span className="font-sans text-[11px] text-kv-faint">
                  R{c.round} · {c.kind === 'replay' ? 'exploit replay' : 'attack'} · {c.ref}
                </span>
              </div>
              <div className="mt-1 text-kv-text">{c.record ? callLabel(c.record) : `message blocked by ${c.inputBlockedBy}`}</div>
              {atk && (
                <div className="mt-1 line-clamp-2 font-sans text-xs text-kv-muted">
                  <span className="text-kv-faint">{TECHNIQUE_LABEL(atk.technique)}: </span>
                  {atk.message}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
