import { useEffect, useState } from 'react'
import { KavachLogo, type KavachLogoState } from '../brand/KavachLogo'
import { api } from '../lib/api'
import type { Health } from '../lib/types'
import type { RunView } from '../lib/useRun'

interface Props {
  run: RunView
  logoState: KavachLogoState
  onLive: () => void
  onReplay: (file: string, speed: number) => void
  onStop: () => void
}

const STATUS_STYLE: Record<RunView['status'], string> = {
  idle: 'text-kv-muted border-kv-border',
  running: 'text-kv-defend border-kv-defend/40 bg-kv-defend-soft',
  completed: 'text-kv-secure border-kv-secure/40 bg-kv-secure-soft',
  failed: 'text-kv-attack border-kv-attack/40 bg-kv-attack-soft',
  stopped: 'text-kv-verdict border-kv-verdict/40 bg-kv-verdict-soft',
}

function targetLabel(h: Health | null): string {
  if (!h) return 'Target: …'
  if (h.target_url.includes('agent37')) return 'Target: Agent37 sandbox'
  if (h.target_url === 'inprocess') return 'Target: in-process'
  return 'Target: local'
}

export function Header({ run, logoState, onLive, onReplay, onStop }: Props) {
  const [health, setHealth] = useState<Health | null>(null)
  const [replays, setReplays] = useState<string[]>([])
  const [file, setFile] = useState('')
  const [speed, setSpeed] = useState(1.5)
  const running = run.status === 'running'

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null))
    api
      .replays()
      .then((r) => {
        setReplays(r.map((x) => x.file))
        if (r[0]) setFile(r[0].file)
      })
      .catch(() => setReplays([]))
  }, [run.status])

  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-kv-border px-5 py-3">
      <div className="flex items-center gap-3">
        <KavachLogo size={34} state={logoState} wordmark />
        <span className="hidden text-sm text-kv-muted lg:inline">AI red vs blue for tool-using agents</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full border px-2.5 py-1 font-medium capitalize ${STATUS_STYLE[run.status]}`}>
          {run.status === 'running' ? `${run.mode === 'replay' ? 'Replaying' : 'Live'} · round ${run.currentRound || 1}` : run.status}
        </span>
        <span className="rounded-full border border-kv-border px-2.5 py-1 text-kv-muted">{targetLabel(health)}</span>
        <span className="rounded-full border border-kv-border px-2.5 py-1 text-kv-muted">Brains: {health?.brain_provider ?? '…'}</span>
        <span className="rounded-full border border-kv-border px-2.5 py-1 text-kv-muted">Deployed: {run.deployedVersion}</span>
        {run.bandUrl && (
          <a className="rounded-full border border-kv-brand/50 px-2.5 py-1 text-kv-brand-hover hover:bg-kv-brand-soft" href={run.bandUrl} target="_blank" rel="noreferrer">
            Open Band room ↗
          </a>
        )}
        {run.bandErrors > 0 && <span className="rounded-full border border-kv-verdict/40 px-2.5 py-1 text-kv-verdict">Band: {run.bandErrors} errors</span>}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {running ? (
          <button onClick={onStop} className="rounded-kv border border-kv-border-strong px-4 py-2 text-sm text-kv-text hover:bg-kv-surface-2">
            Stop
          </button>
        ) : (
          <>
            <select
              value={file}
              onChange={(e) => setFile(e.target.value)}
              className="max-w-52 rounded-kv border border-kv-border bg-kv-surface-2 px-3 py-2 text-sm text-kv-text"
              aria-label="Recorded run"
            >
              {replays.length === 0 && <option value="">No recorded runs</option>}
              {replays.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="rounded-kv border border-kv-border bg-kv-surface-2 px-2 py-2 text-sm text-kv-text"
              aria-label="Replay speed"
            >
              {[1, 1.5, 2, 4].map((s) => (
                <option key={s} value={s}>
                  {s}×
                </option>
              ))}
            </select>
            <button
              disabled={!file}
              onClick={() => onReplay(file, speed)}
              className="rounded-kv border border-kv-border-strong px-4 py-2 text-sm text-kv-text hover:bg-kv-surface-2 disabled:opacity-40"
            >
              Replay
            </button>
            <button onClick={onLive} className="rounded-kv bg-kv-brand px-4 py-2 text-sm font-semibold text-white hover:bg-kv-brand-hover">
              Start live run
            </button>
          </>
        )}
      </div>
    </header>
  )
}
