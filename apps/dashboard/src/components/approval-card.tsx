import { Check, Hourglass, Undo2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { RunView } from '@/lib/useRun'
import { cn } from '@/lib/utils'

const SOURCE: Record<string, string> = { band: 'in the Band room', dashboard: 'from the dashboard', api: 'through the API' }

/**
 * A patch the Auditor passed, waiting for a person. It takes the activity bar's place at the top of the page while it
 * waits. The same decision can come from the Band room (@Referee approve v2). Key it by version and attempt so its
 * state resets for each request.
 */
export function ApprovalBanner({ run }: { run: RunView }) {
  const a = run.approval
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pending = !!a && !a.decided

  useEffect(() => {
    if (!pending) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [pending])

  if (!a || a.decided) return null
  const left = Math.max(0, Math.ceil(a.timeout_s - (now - a.requestedAt) / 1000))
  const canDecide = run.mode === 'live' && !!run.runId

  const decide = async (decision: 'approve' | 'reject') => {
    if (!run.runId) return
    setBusy(decision)
    setError(null)
    try {
      await api.decideApproval(run.runId, a.version, decision)
    } catch (e) {
      setBusy(null)
      setError(String(e).includes('409') ? 'That patch is no longer waiting.' : 'Could not reach the Kavach API. Try again.')
    }
  }

  return (
    <section
      aria-label="Patch approval"
      className="mx-4 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-kv-verdict/50 bg-kv-verdict-soft px-4 py-3"
    >
      <Hourglass className="size-4 text-kv-verdict" aria-hidden />
      <div className="min-w-0 flex-1 basis-80">
        <p role="status" className="text-[14px] font-semibold text-kv-text">
          Round {a.round}: <span className="font-mono">{a.version}</span> passed the Auditor and is waiting for you
        </p>
        <p className="text-[12.5px] text-kv-muted">
          {a.replay.still_breaching} of {a.replay.total} exploits still land, utility {Math.round(a.utility * 100)}%. No answer in {left} s
          means {a.on_timeout}. You can also reply <span className="font-mono">@Referee approve {a.version}</span> in the Band room.
        </p>
        {error && <p className="mt-1 text-[12px] text-kv-attack">{error}</p>}
      </div>
      {canDecide && (
        <div className="flex gap-2">
          <Button size="sm" className="bg-kv-secure text-kv-surface hover:bg-kv-secure/90" disabled={!!busy} onClick={() => decide('approve')}>
            <Check className="size-3.5" /> {busy === 'approve' ? 'Approving…' : `Approve ${a.version}`}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-kv-attack/50 bg-kv-surface text-kv-attack hover:bg-kv-attack-soft"
            disabled={!!busy}
            onClick={() => decide('reject')}
          >
            <Undo2 className="size-3.5" /> {busy === 'reject' ? 'Rejecting…' : `Reject ${a.version}`}
          </Button>
        </div>
      )}
    </section>
  )
}

/** The last decision, kept in the patch panel so the record stays next to the diff. */
export function ApprovalNote({ run }: { run: RunView }) {
  const a = run.approval
  if (!a?.decided) return null
  const d = a.decided
  const approved = d.decision === 'approve'
  const who =
    d.source === 'timeout'
      ? `no answer in ${Math.round(a.timeout_s)} s, so ${approved ? 'approved' : 'rejected'} by policy`
      : `${approved ? 'approved' : 'rejected'}${d.by && d.by !== d.source ? ` by ${d.by}` : ''} ${SOURCE[d.source] ?? ''}`.trim()
  return (
    <p
      role="status"
      className={cn('flex items-start gap-2 border-t border-kv-border/80 px-4 py-2.5 text-[12.5px]', approved ? 'text-kv-secure' : 'text-kv-attack')}
    >
      {approved ? <Check className="mt-0.5 size-3.5 shrink-0" /> : <Undo2 className="mt-0.5 size-3.5 shrink-0" />}
      <span>
        <span className="font-mono">{a.version}</span> {who}
        {d.reason && d.source !== 'timeout' ? ` (${d.reason})` : ''}.
      </span>
    </p>
  )
}
