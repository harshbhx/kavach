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

/** The one container used by every panel, so the four panels read as one console. */
export function Panel({ title, hint, actions, children, className, bodyClassName }: PanelProps) {
  return (
    <section className={cn('relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-kv-border bg-kv-surface/80', className)}>
      <header className="flex min-h-12 items-center gap-3 border-b border-kv-border/80 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <h2 className="text-[13px] font-semibold text-kv-text">{title}</h2>
          {hint && <p className="truncate text-[11.5px] text-kv-faint">{hint}</p>}
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
      <div className="grid size-10 place-items-center rounded-xl border border-kv-border bg-kv-surface-2 text-kv-faint">{icon}</div>
      <p className="text-sm font-medium text-kv-muted">{title}</p>
      {children && <p className="max-w-xs text-xs leading-relaxed text-kv-faint">{children}</p>}
    </div>
  )
}
