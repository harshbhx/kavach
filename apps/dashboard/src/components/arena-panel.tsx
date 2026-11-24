import { ShieldCheck, Swords } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import DecryptedText from '@/components/DecryptedText'
import { BorderBeam } from '@/components/ui/border-beam'
import { RULE_LABEL, TECHNIQUE_LABEL } from '@/lib/format'
import type { AttackInfo, ToolCallRecord, ToolCard } from '@/lib/types'
import type { RunView } from '@/lib/useRun'
import { useStickyScroll } from '@/lib/useStickyScroll'
import { cn } from '@/lib/utils'
import { Empty, Panel } from './panel'

type Filter = 'all' | 'breach' | 'blocked'

function Call({ c }: { c: ToolCallRecord }) {
  const args = Object.entries(c.args)
  return (
    <code className="font-mono text-[12.5px] leading-relaxed text-kv-text">
      <span className="text-kv-brand-hover">{c.tool}</span>(
      {args.map(([k, v], i) => (
        <span key={k}>
          {i > 0 && ', '}
          <span className="text-kv-muted">{k}=</span>
          <span className="text-kv-verdict">{typeof v === 'string' ? `"${v}"` : String(v)}</span>
        </span>
      ))}
      )
    </code>
  )
}

function Stamp({ card }: { card: ToolCard }) {
  if (card.verdict === 'breach')
    return (
      <span className="rounded-md bg-kv-attack px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wide text-white">BREACH</span>
    )
  if (card.verdict === 'blocked') {
    const held = card.record?.result?.status === 'pending_human_approval'
    return (
      <span className="rounded-md border border-kv-defend/70 px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wide text-kv-defend">
        {held ? 'HELD' : 'BLOCKED'}
      </span>
    )
  }
  return <span className="rounded-md bg-kv-surface-2 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-kv-faint">OK</span>
}

function why(card: ToolCard) {
  if (card.verdict === 'breach') return RULE_LABEL[card.ruleId ?? ''] ?? card.ruleId ?? 'Breach'
  if (card.verdict === 'blocked') {
    if (card.record?.result?.status === 'pending_human_approval') return `Sent to a human by guardrail ${card.configVersion}`
    if (card.inputBlockedBy) return `Message stopped by ${card.inputBlockedBy}`
    return `Blocked by guardrail ${card.configVersion}`
  }
  return 'Allowed'
}

function CardRow({ card, attack, newest }: { card: ToolCard; attack?: AttackInfo; newest: boolean }) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -12, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className={cn(
        'relative overflow-hidden rounded-xl border bg-kv-bg/60 py-2.5 pr-3 pl-4',
        card.verdict === 'breach' && 'border-kv-attack/40',
        card.verdict === 'blocked' && 'border-kv-defend/30',
        card.verdict === 'ok' && 'border-kv-border',
      )}
    >
      <span
        className={cn(
          'absolute inset-y-0 left-0 w-1',
          card.verdict === 'breach' && 'bg-kv-attack',
          card.verdict === 'blocked' && 'bg-kv-defend',
          card.verdict === 'ok' && 'bg-kv-border-strong',
        )}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Stamp card={card} />
        <span className={cn('text-[12.5px] font-medium', card.verdict === 'breach' ? 'text-kv-attack' : card.verdict === 'blocked' ? 'text-kv-defend' : 'text-kv-muted')}>
          {why(card)}
        </span>
        <span className="ml-auto text-[11px] text-kv-faint">
          Round {card.round}, {card.kind === 'replay' ? 'exploit replay' : 'attack'}
        </span>
      </div>
      <div className="mt-1.5">{card.record ? <Call c={card.record} /> : <span className="text-[12.5px] text-kv-muted">No tool was called.</span>}</div>
      {attack && (
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-kv-muted">
          <span className="mr-1.5 rounded bg-kv-surface-2 px-1.5 py-px text-[11px] text-kv-faint">{TECHNIQUE_LABEL(attack.technique)}</span>
          {newest && card.verdict === 'breach' ? (
            <DecryptedText text={attack.message} animateOn="view" speed={18} maxIterations={8} sequential revealDirection="start" />
          ) : (
            attack.message
          )}
        </p>
      )}
    </motion.li>
  )
}

/** Every tool call the target made under attack, judged by code. */
export function ArenaPanel({ run }: { run: RunView }) {
  const [filter, setFilter] = useState<Filter>('all')
  const cards = run.toolCards
  const shown = useMemo(() => (filter === 'all' ? cards : cards.filter((c) => c.verdict === filter)), [cards, filter])
  const box = useStickyScroll([shown.length])
  const counts = {
    all: cards.length,
    breach: cards.filter((c) => c.verdict === 'breach').length,
    blocked: cards.filter((c) => c.verdict === 'blocked').length,
  }
  const live = run.status === 'running'

  return (
    <Panel
      title="Arena"
      hint="Every tool call under attack, judged by code"
      className="h-full"
      bodyClassName="flex flex-col"
      actions={
        <div className="flex rounded-lg bg-kv-bg/70 p-0.5 text-[12px]" role="tablist" aria-label="Filter tool calls">
          {(['all', 'breach', 'blocked'] as Filter[]).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-md px-2.5 py-1 transition-colors',
                filter === f ? 'bg-kv-surface-2 text-kv-text shadow-sm' : 'text-kv-muted hover:text-kv-text',
              )}
            >
              {f === 'all' ? 'All' : f === 'breach' ? 'Breaches' : 'Blocked'}{' '}
              <span className={cn('tabular-nums', f === 'breach' ? 'text-kv-attack' : f === 'blocked' ? 'text-kv-defend' : 'text-kv-faint')}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
      }
    >
      <div ref={box} className="min-h-0 flex-1 overflow-y-auto p-3">
        {shown.length === 0 ? (
          <Empty icon={filter === 'blocked' ? <ShieldCheck className="size-5" /> : <Swords className="size-5" />} title={filter === 'all' ? 'No tool calls yet' : `No ${filter === 'breach' ? 'breaches' : 'blocked calls'} yet`}>
            Each attack the red squad sends shows up here with the exact tool call it triggered.
          </Empty>
        ) : (
          <ul className="space-y-2">
            {shown.map((c, i) => (
              <CardRow key={c.seq} card={c} attack={run.attacks[c.ref]} newest={i === shown.length - 1} />
            ))}
          </ul>
        )}
      </div>
      {live && <BorderBeam size={140} duration={7} colorFrom="#ff4d6d" colorTo="#7c5cff" />}
    </Panel>
  )
}
