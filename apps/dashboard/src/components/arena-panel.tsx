import { ChevronRight, ShieldCheck, Swords } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import DecryptedText from '@/components/DecryptedText'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TECHNIQUE_LABEL } from '@/lib/format'
import { STAMP_TONE, stampOf, verdictLine } from '@/lib/slips'
import type { AttackInfo, ToolCallRecord, ToolCard } from '@/lib/types'
import type { RunView } from '@/lib/useRun'
import { useStickyScroll } from '@/lib/useStickyScroll'
import { cn } from '@/lib/utils'
import { JumpPill } from './jump-pill'
import { Empty, Panel, Stamp } from './panel'
import { SlipSheet } from './slip-sheet'

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

function Slip({ card, attack, newest, onOpen }: { card: ToolCard; attack?: AttackInfo; newest: boolean; onOpen: () => void }) {
  const stamp = stampOf(card)
  return (
    <motion.li initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'group relative grid w-full grid-cols-[6.5rem_1fr_auto] gap-x-4 border-b border-dotted border-kv-border-strong/70 px-4 py-3 text-left transition-colors',
          'hover:bg-kv-surface-2/80 focus-visible:bg-kv-surface-2 focus-visible:outline-none',
          newest && card.verdict === 'breach' && 'bg-kv-attack-soft/60',
        )}
      >
        <div className="flex flex-col items-start gap-1.5 pt-0.5">
          <Stamp tone={STAMP_TONE[stamp]}>{stamp}</Stamp>
          <span className="font-mono text-[10.5px] text-kv-faint">
            R{card.round} {card.kind === 'replay' ? 'replay' : 'attack'}
          </span>
        </div>
        <div className="min-w-0">
          <p
            className={cn(
              'text-[13px] font-semibold',
              card.verdict === 'breach' ? 'text-kv-attack' : card.verdict === 'blocked' ? 'text-kv-defend' : 'text-kv-muted',
            )}
          >
            {verdictLine(card)}
          </p>
          <div className="mt-0.5">
            {card.record ? <Call c={card.record} /> : <span className="text-[12.5px] text-kv-faint">No tool was called.</span>}
          </div>
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
        <ChevronRight
          className="mt-1 size-4 text-kv-faint opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden
        />
      </button>
    </motion.li>
  )
}

/** Every tool call the target made under attack, filed like slips in a ledger. Code decides the stamp. */
export function ArenaPanel({ run }: { run: RunView }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [round, setRound] = useState('all')
  const [open, setOpen] = useState<number | null>(null)
  const cards = run.toolCards
  const rounds = useMemo(() => [...new Set(cards.map((c) => c.round).filter((r): r is number => r != null))].sort(), [cards])
  const inRound = useMemo(() => (round === 'all' ? cards : cards.filter((c) => String(c.round) === round)), [cards, round])
  const shown = useMemo(() => (filter === 'all' ? inRound : inRound.filter((c) => c.verdict === filter)), [inRound, filter])
  const { box, behind, jump } = useStickyScroll(shown.length)
  const counts = {
    all: inRound.length,
    breach: inRound.filter((c) => c.verdict === 'breach').length,
    blocked: inRound.filter((c) => c.verdict === 'blocked').length,
  }

  return (
    <Panel
      title="Intercepted tool calls"
      hint="Select a slip to see the full call"
      className="h-full"
      bodyClassName="flex flex-col"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {rounds.length > 1 && (
            <Select value={round} onValueChange={setRound}>
              <SelectTrigger
                size="sm"
                className="h-8 w-[118px] border-kv-border-strong/70 bg-kv-surface-2 text-[12.5px]"
                aria-label="Filter by round"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All rounds</SelectItem>
                {rounds.map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    Round {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div
            className="flex rounded-lg border border-kv-border-strong/70 bg-kv-surface-2 p-0.5 text-[12.5px]"
            role="tablist"
            aria-label="Filter by verdict"
          >
            {(['all', 'breach', 'blocked'] as Filter[]).map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-md px-2.5 py-1 transition-colors',
                  filter === f ? 'bg-kv-surface text-kv-text shadow-sm' : 'text-kv-muted hover:text-kv-text',
                )}
              >
                {f === 'all' ? 'All' : f === 'breach' ? 'Breaches' : 'Blocked'}{' '}
                <span className={cn('font-mono', f === 'breach' ? 'text-kv-attack' : f === 'blocked' ? 'text-kv-defend' : 'text-kv-faint')}>
                  {counts[f]}
                </span>
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="relative min-h-0 flex-1">
        <div ref={box} className="h-full overflow-y-auto">
          {shown.length === 0 ? (
            <Empty
              icon={filter === 'blocked' ? <ShieldCheck className="size-5" /> : <Swords className="size-5" />}
              title={
                filter === 'all'
                  ? 'No tool calls yet'
                  : `No ${filter === 'breach' ? 'breaches' : 'blocked calls'}${round === 'all' ? ' yet' : ` in round ${round}`}`
              }
            >
              Each attack the red squad sends is filed here with the exact tool call it triggered.
            </Empty>
          ) : (
            <ul>
              {shown.map((c, i) => (
                <Slip key={c.seq} card={c} attack={run.attacks[c.ref]} newest={run.status === 'running' && i === shown.length - 1} onOpen={() => setOpen(i)} />
              ))}
            </ul>
          )}
        </div>
        <JumpPill count={behind} noun="tool call" onJump={jump} />
      </div>
      <SlipSheet cards={shown} attacks={run.attacks} index={open} onIndex={setOpen} />
    </Panel>
  )
}
