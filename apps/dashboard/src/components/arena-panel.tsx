import { ShieldCheck, Swords } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import DecryptedText from '@/components/DecryptedText'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { AGENTS, RULE_LABEL, TECHNIQUE_LABEL } from '@/lib/format'
import type { AgentName, AttackInfo, ToolCallRecord, ToolCard } from '@/lib/types'
import type { RunView } from '@/lib/useRun'
import { useStickyScroll } from '@/lib/useStickyScroll'
import { cn } from '@/lib/utils'
import { Empty, Panel, Stamp } from './panel'

type Filter = 'all' | 'breach' | 'blocked'

function Call({ c }: { c: ToolCallRecord }) {
  return (
    <code className="font-mono text-[12.5px] leading-relaxed text-kv-text">
      <span className="font-semibold text-kv-defend">{c.tool}</span>(
      {Object.entries(c.args).map(([k, v], i) => (
        <span key={k}>
          {i > 0 && ', '}
          <span className="text-kv-faint">{k}=</span>
          <span className="text-kv-verdict">{typeof v === 'string' ? `"${v}"` : String(v)}</span>
        </span>
      ))}
      )
    </code>
  )
}

function stamp(card: ToolCard) {
  if (card.verdict === 'breach') return <Stamp tone="attack">BREACH</Stamp>
  if (card.verdict === 'blocked')
    return <Stamp tone="defend">{card.record?.result?.status === 'pending_human_approval' ? 'HELD' : 'BLOCKED'}</Stamp>
  return <Stamp tone="verdict">ALLOWED</Stamp>
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

function Slip({ card, attack, newest }: { card: ToolCard; attack?: AttackInfo; newest: boolean }) {
  const body = (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className={cn(
        'relative grid grid-cols-[6.5rem_1fr] gap-x-4 border-b border-dotted border-kv-border-strong/70 px-4 py-3 last:border-b-0',
        newest && card.verdict === 'breach' && 'bg-kv-attack-soft/60',
      )}
    >
      <div className="flex flex-col items-start gap-1.5 pt-0.5">
        {stamp(card)}
        <span className="font-mono text-[10.5px] text-kv-faint">
          R{card.round} {card.kind === 'replay' ? 'replay' : 'attack'}
        </span>
      </div>
      <div className="min-w-0">
        <p className={cn('text-[13px] font-semibold', card.verdict === 'breach' ? 'text-kv-attack' : card.verdict === 'blocked' ? 'text-kv-defend' : 'text-kv-muted')}>
          {why(card)}
        </p>
        <div className="mt-0.5">{card.record ? <Call c={card.record} /> : <span className="text-[12.5px] text-kv-faint">No tool was called.</span>}</div>
        {attack && (
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-kv-muted">
            <span className="mr-1.5 text-kv-faint italic">{TECHNIQUE_LABEL(attack.technique)}:</span>
            {newest && card.verdict === 'breach' ? (
              <DecryptedText text={attack.message} animateOn="view" speed={16} maxIterations={8} sequential revealDirection="start" />
            ) : (
              attack.message
            )}
          </p>
        )}
      </div>
    </motion.li>
  )
  if (!attack) return body
  const agent = AGENTS[attack.agent as AgentName]
  return (
    <HoverCard openDelay={250} closeDelay={80}>
      <HoverCardTrigger asChild>{body}</HoverCardTrigger>
      <HoverCardContent side="left" align="start" className="w-96 border-kv-border-strong bg-kv-surface p-0">
        <div className="kv-band h-2 rounded-t-md border-b border-kv-border" />
        <div className="space-y-2 p-4">
          <p className="font-display text-[16px] text-kv-text">
            {agent?.name ?? attack.agent}, {TECHNIQUE_LABEL(attack.technique)}
          </p>
          <p className="text-[12.5px] text-kv-muted">
            <span className="text-kv-faint">Goal: </span>
            {attack.goal}
          </p>
          <p className="rounded-md border border-kv-border bg-kv-surface-2 p-2.5 text-[13px] leading-relaxed text-kv-text">“{attack.message}”</p>
          <p className="font-mono text-[11px] text-kv-faint">
            {attack.attack_id}, from the {attack.source === 'library' ? 'attack library' : 'agent'}
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

/** Every tool call the target made under attack, filed like slips in a ledger. Code decides the stamp. */
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

  return (
    <Panel
      title="Intercepted tool calls"
      hint="Hover a slip for the attack behind it"
      className="h-full"
      bodyClassName="flex flex-col"
      actions={
        <div className="flex rounded-lg border border-kv-border-strong/70 bg-kv-surface-2 p-0.5 text-[12.5px]" role="tablist" aria-label="Filter tool calls">
          {(['all', 'breach', 'blocked'] as Filter[]).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cn('rounded-md px-2.5 py-1 transition-colors', filter === f ? 'bg-kv-surface text-kv-text shadow-sm' : 'text-kv-muted hover:text-kv-text')}
            >
              {f === 'all' ? 'All' : f === 'breach' ? 'Breaches' : 'Blocked'}{' '}
              <span className={cn('font-mono', f === 'breach' ? 'text-kv-attack' : f === 'blocked' ? 'text-kv-defend' : 'text-kv-faint')}>{counts[f]}</span>
            </button>
          ))}
        </div>
      }
    >
      <div ref={box} className="min-h-0 flex-1 overflow-y-auto">
        {shown.length === 0 ? (
          <Empty
            icon={filter === 'blocked' ? <ShieldCheck className="size-5" /> : <Swords className="size-5" />}
            title={filter === 'all' ? 'No tool calls yet' : `No ${filter === 'breach' ? 'breaches' : 'blocked calls'} yet`}
          >
            Each attack the red squad sends is filed here with the exact tool call it triggered.
          </Empty>
        ) : (
          <ul>
            {shown.map((c, i) => (
              <Slip key={c.seq} card={c} attack={run.attacks[c.ref]} newest={i === shown.length - 1} />
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}
