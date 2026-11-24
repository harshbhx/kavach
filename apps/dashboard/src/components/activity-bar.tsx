import { Check, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AgentAvatar } from '@kavach/brand/avatar'
import { api } from '@/lib/api'
import { AGENTS, pct } from '@/lib/format'
import type { AgentName } from '@/lib/types'
import type { Phase, RunView } from '@/lib/useRun'
import { cn } from '@/lib/utils'
import { Stamp } from './panel'

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

  if (run.status === 'completed' && !starting) return <VerdictBanner run={run} />
  if (run.status !== 'running' && !starting) return null

  const round = run.currentRound || 1
  const phase = run.progress[round]?.phase
  const waitedFor = Math.max(0, Math.round((now - (run.lastEventAt ?? run.startedAt ?? now)) / 1000))
  const first = run.messages.length === 0
  const headline = starting
    ? 'Starting the run: opening the Band room and waking the agents…'
    : first
      ? 'Run started. Waiting for the Referee to open the room…'
      : phase === 'done'
        ? `Round ${round} complete. The next round is warming up…`
        : `Round ${round}: ${phase ? PHASE_TEXT[phase] : 'working'}`
  const spokeThisRound = new Set(run.messages.filter((m) => m.round === round).map((m) => m.agent))
  const slow = waitedFor >= 20

  return (
    <div className="mx-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-kv-defend/30 bg-kv-defend-soft/60 px-4 py-2.5">
      <LoaderCircle className="size-4 animate-spin text-kv-defend" aria-hidden />
      <div className="min-w-0 flex-1 basis-64">
        <p role="status" className="text-[13.5px] font-semibold text-kv-text">
          {headline}
        </p>
        <p aria-hidden className="text-[12.5px] text-kv-muted">
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
              <AgentAvatar
                agent={a}
                size={36}
                expression={speaking ? 'talking' : 'idle'}
                className={cn('opacity-45 transition', spokeThisRound.has(a) && 'opacity-100', speaking && 'scale-110 opacity-100')}
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

/** The ending: what the run proved, in one line a viewer can read at a glance. */
function VerdictBanner({ run }: { run: RunView }) {
  const rounds = Object.values(run.rounds).sort((a, b) => a.round - b.round)
  const rates = rounds.map((r) => r.breach_rate)
  const worst = rates.length ? Math.max(...rates) : null
  const last = run.final?.final_breach_rate ?? rates[rates.length - 1] ?? null
  // Same rule as scripts/build_gallery.py: HELD only if no round was ever breached, HARDENED if the last round is below the worst.
  const held = worst === 0
  const hardened = worst !== null && worst > 0 && last !== null && last < worst
  const tone = hardened ? 'secure' : held ? 'defend' : 'attack'
  const word = hardened ? 'HARDENED' : held ? 'HELD' : 'STILL BREACHED'
  const tth = rounds.map((r) => r.tth_seconds).find((v) => v !== null && v !== undefined)
  const vetoes = rounds.reduce((n, r) => n + r.vetoes, 0)
  return (
    <div
      role="status"
      className={cn(
        'mx-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border px-4 py-3',
        hardened ? 'border-kv-secure/40 bg-kv-secure-soft/70' : held ? 'border-kv-defend/40 bg-kv-defend-soft/60' : 'border-kv-attack/35 bg-kv-attack-soft/50',
      )}
    >
      <AgentAvatar agent="referee" size={44} expression={hardened || held ? 'happy' : 'alert'} />
      <div className="min-w-0 flex-1 basis-72">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] font-semibold text-kv-text">
          <Stamp tone={tone}>{word}</Stamp>
          <span>
            Breach rate{' '}
            <span className="font-mono">
              {rounds.map((r, i) => (
                <span key={r.round}>
                  {i > 0 && <span className="text-kv-faint"> → </span>}
                  <b className={r.breach_rate > 0 ? 'text-kv-attack' : 'text-kv-secure'}>{pct(r.breach_rate)}</b>
                </span>
              ))}
            </span>
          </span>
        </p>
        <p className="mt-1 text-[13px] text-kv-muted">
          {run.final?.final_utility !== null && run.final?.final_utility !== undefined ? `Everyday requests still served: ${pct(run.final.final_utility)}. ` : ''}
          Deployed <span className="font-mono text-kv-text">{run.final?.deployed_version ?? run.deployedVersion}</span>
          {tth ? `, hardened in ${Math.round(tth)}s` : ''}
          {vetoes > 0 ? `, ${vetoes} patch${vetoes > 1 ? 'es' : ''} vetoed along the way` : ''}. Code scored every breach.
        </p>
      </div>
      {run.reportReady && run.mode !== 'demo' && run.runId && (
        <a
          href={api.reportUrl(run.runId)}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-kv-border-strong bg-kv-surface px-3.5 py-2 text-[13.5px] font-semibold text-kv-text transition-colors hover:bg-kv-surface-2"
        >
          Open the audit report
        </a>
      )}
    </div>
  )
}
