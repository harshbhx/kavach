import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PanelProps {
  title: string
  hint?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

/** A sheet of security paper: guilloche edge, engraved title, hairline rules. */
export function Panel({ title, hint, actions, children, className, bodyClassName }: PanelProps) {
  return (
    <section
      data-panel={title}
      className={cn(
        'relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-kv-border-strong/70 bg-kv-surface shadow-[0_18px_40px_-28px_rgb(14_35_28/0.45),0_1px_2px_rgb(14_35_28/0.06)]',
        className,
      )}
    >
      <div className="kv-band h-2.5 border-b border-kv-border/80 opacity-80" aria-hidden />
      <header className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 border-b border-kv-border px-4 py-2">
        <div className="min-w-0 flex-1 basis-44">
          <h2 className="font-display text-[17px] leading-tight text-kv-text">{title}</h2>
          {hint && <p className="truncate text-[12px] text-kv-faint">{hint}</p>}
        </div>
        {actions}
      </header>
      <div className={cn('min-h-0 flex-1', bodyClassName)}>{children}</div>
    </section>
  )
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <div className="grid size-11 place-items-center rounded-full border border-dashed border-kv-border-strong text-kv-faint">{icon}</div>
      <p className="font-display text-[17px] text-kv-muted">{title}</p>
      {children && <p className="max-w-xs text-[13px] leading-relaxed text-kv-faint">{children}</p>}
    </div>
  )
}

/** Shimmering placeholder rows shown while a run is starting, so an empty panel never looks broken. */
export function SkeletonRows({ label, rows = 4 }: { label: string; rows?: number }) {
  return (
    <div role="status" aria-label={label} className="space-y-4 px-4 py-4">
      <p className="text-[13px] text-kv-faint">{label}</p>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex animate-pulse gap-3" style={{ animationDelay: `${i * 120}ms` }}>
          <div className="size-9 shrink-0 rounded-full bg-kv-border" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-1/4 rounded bg-kv-border" />
            <div className="h-3 w-11/12 rounded bg-kv-border/70" />
            <div className="h-3 w-2/3 rounded bg-kv-border/70" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Rubber stamp, slightly rotated, unevenly inked. */
export function Stamp({ tone, children, className }: { tone: 'attack' | 'defend' | 'secure' | 'verdict'; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'kv-ink inline-block -rotate-[4deg] rounded-[5px] border-2 px-1.5 py-px font-display text-[12px] leading-tight font-bold tracking-[0.09em] [font-stretch:85%]',
        tone === 'attack' && 'border-kv-attack text-kv-attack',
        tone === 'defend' && 'border-kv-defend text-kv-defend',
        tone === 'secure' && 'border-kv-secure text-kv-secure',
        tone === 'verdict' && 'border-kv-verdict text-kv-verdict',
        className,
      )}
      style={{ boxShadow: 'inset 0 0 0 1px currentColor' }}
    >
      {children}
    </span>
  )
}
