import { Check, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AGENTS, avatar } from '@/lib/format'
import type { AgentName } from '@/lib/types'
import type { Phase, RunView } from '@/lib/useRun'
import { cn } from '@/lib/utils'

const ORDER: AgentName[] = ['referee', 'recon', 'injection', 'social', 'monitor', 'patcher', 'auditor']

const PHASE_TEXT: Record<Phase, string> = {
  probe: 'Recon is mapping the target',
  attack: 'Red squad is attacking',
  detect: 'Code is checking for breaches',
  patch: 'Patcher is writing a fix',
  audit: 'Auditor is testing the fix against real customers',
  done: 'Round complete',
}

/** One line that says what is happening right now, and a heartbeat so a slow model never looks like a frozen page. */
export function ActivityBar({ run, starting }: { run: RunView; starting: boolean }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (run.status !== 'running' && !starting) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [run.status, starting])

  if (run.status !== 'running' && !starting) return null

  const round = run.currentRound || 1
  const phase = run.progress[round]?.phase
  const waitedFor = Math.max(0, Math.round((now - (run.lastEventAt ?? run.startedAt ?? now)) / 1000))
  const first = run.messages.length === 0
  const headline = starting
    ? 'Starting the run: opening the Band room and waking the agents…'
    : first
      ? 'Run started. Waiting for the Referee to open the room…'
      : `Round ${round}: ${phase ? PHASE_TEXT[phase] : 'working'}`
  const spokeThisRound = new Set(run.messages.filter((m) => m.round === round).map((m) => m.agent))
  const slow = waitedFor >= 20

  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-kv-defend/30 bg-kv-defend-soft/60 px-4 py-2.5"
    >
      <LoaderCircle className="size-4 animate-spin text-kv-defend" aria-hidden />
      <div className="min-w-0 flex-1 basis-64">
        <p className="text-[13.5px] font-semibold text-kv-text">{headline}</p>
        <p className="text-[12.5px] text-kv-muted">
          {starting
            ? 'This takes a few seconds. You only need to click once.'
            : slow
              ? `Last update ${waitedFor}s ago. The agents are thinking; each model call can take up to a minute, so this is normal.`
              : `Last update ${waitedFor}s ago`}
        </p>
      </div>
      <ul className="flex items-center gap-1.5" aria-label="Agents">
        {ORDER.map((a) => {
          const speaking = run.speaker?.agent === a && now - run.speaker.at < 15000
          return (
            <li key={a} title={`${AGENTS[a].name}: ${AGENTS[a].role}`} className="relative">
              <img
                src={avatar(a)}
                alt={AGENTS[a].name}
                className={cn(
                  'size-8 rounded-full border-2 border-kv-border-strong object-cover opacity-45 transition',
                  spokeThisRound.has(a) && 'opacity-100',
                  speaking && 'scale-110 border-kv-defend opacity-100 ring-2 ring-kv-defend/40',
                )}
              />
              {speaking ? (
                <span className="absolute -right-0.5 -bottom-0.5 size-2.5 animate-ping rounded-full bg-kv-defend" />
              ) : spokeThisRound.has(a) ? (
                <Check className="absolute -right-1 -bottom-1 size-3.5 rounded-full bg-kv-secure p-0.5 text-white" aria-hidden />
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
