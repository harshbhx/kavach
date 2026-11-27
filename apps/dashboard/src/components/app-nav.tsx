import { Crosshair, FileText, GitCompareArrows, LayoutDashboard, MessagesSquare, Presentation, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'
import type { View } from '@/lib/route'
import type { RunView } from '@/lib/useRun'
import { cn } from '@/lib/utils'

interface Item {
  view: View
  label: string
  icon: ReactNode
  count?: number | null
  dot?: 'attack' | 'verdict' | 'secure' | null
}

/** The ledger's index: one entry per view, with what's waiting there. A rail on wide screens, a tab row on narrow ones. */
export function AppNav({ run, view, onView }: { run: RunView; view: View; onView: (v: View) => void }) {
  const breaches = run.toolCards.filter((c) => c.verdict === 'breach' && c.kind === 'attack').length
  const waiting = !!run.approval && !run.approval.decided
  const groups: { title: string; items: Item[] }[] = [
    {
      title: 'Watch',
      items: [
        { view: 'overview', label: 'Overview', icon: <LayoutDashboard className="size-4" />, dot: waiting ? 'verdict' : null },
        { view: 'room', label: 'Agent room', icon: <MessagesSquare className="size-4" />, count: run.messages.length || null },
        { view: 'attacks', label: 'Attacks', icon: <Crosshair className="size-4" />, count: breaches || null, dot: breaches ? 'attack' : null },
        { view: 'patches', label: 'Patches', icon: <GitCompareArrows className="size-4" />, count: run.patches.length || null, dot: waiting ? 'verdict' : null },
      ],
    },
    {
      title: 'Results',
      items: [
        { view: 'report', label: 'Audit report', icon: <FileText className="size-4" />, dot: run.reportReady ? 'secure' : null },
        { view: 'models', label: 'Model scoreboard', icon: <Trophy className="size-4" /> },
      ],
    },
  ]

  const entry = (it: Item, compact = false) => {
    const active = view === it.view
    return (
      <button
        key={it.view}
        type="button"
        onClick={() => onView(it.view)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group relative flex items-center gap-2.5 rounded-lg text-left text-[13.5px] transition-colors',
          compact ? 'shrink-0 px-3 py-1.5' : 'w-full px-3 py-2',
          active ? 'bg-kv-surface text-kv-text shadow-[0_1px_2px_rgb(14_35_28/0.08)] ring-1 ring-kv-border-strong/60' : 'text-kv-muted hover:bg-kv-surface/60 hover:text-kv-text',
        )}
      >
        {active && !compact && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-kv-text" aria-hidden />}
        <span className={cn(active ? 'text-kv-text' : 'text-kv-faint group-hover:text-kv-muted')}>{it.icon}</span>
        <span className="flex-1 whitespace-nowrap">{it.label}</span>
        {it.dot && (
          <span
            className={cn('size-2 rounded-full', it.dot === 'attack' && 'bg-kv-attack', it.dot === 'verdict' && 'animate-pulse bg-kv-verdict', it.dot === 'secure' && 'bg-kv-secure')}
            aria-hidden
          />
        )}
        {it.count ? <span className="font-mono text-[11.5px] text-kv-faint">{it.count}</span> : null}
      </button>
    )
  }

  const present = (compact = false) => (
    <button
      type="button"
      onClick={() => onView('present')}
      className={cn(
        'flex items-center justify-center gap-2 rounded-lg bg-kv-text font-semibold text-kv-surface transition-colors hover:bg-kv-defend',
        compact ? 'shrink-0 px-3 py-1.5 text-[13px]' : 'w-full px-3 py-2.5 text-[13.5px]',
      )}
    >
      <Presentation className="size-4" /> Present
      {!compact && <kbd className="ml-1 rounded border border-kv-surface/30 px-1 font-mono text-[10.5px] text-kv-surface/70">P</kbd>}
    </button>
  )

  return (
    <>
      <nav aria-label="Dashboard views" className="sticky top-3 hidden w-56 shrink-0 self-start lg:block">
        <div className="space-y-5 rounded-xl border border-kv-border-strong/60 bg-kv-surface-2/60 p-2.5">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="px-3 pb-1.5 text-[11.5px] font-medium text-kv-faint">{g.title}</p>
              <div className="space-y-0.5">{g.items.map((it) => entry(it))}</div>
            </div>
          ))}
          <div className="border-t border-kv-border pt-3">{present()}</div>
          <p className="px-2 text-[11.5px] leading-snug text-kv-faint">Present mode turns the run into full-screen slides for a projector.</p>
        </div>
      </nav>
      <nav aria-label="Dashboard views" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:hidden">
        {groups.flatMap((g) => g.items).map((it) => entry(it, true))}
        {present(true)}
      </nav>
    </>
  )
}
