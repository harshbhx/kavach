import { KavachLogo, type KavachLogoState } from '@kavach/brand'
import { ExternalLink, Play, RotateCcw, Square } from 'lucide-react'
import { useEffect, useState } from 'react'
import ShinyText from '@/components/ShinyText'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import type { Health } from '@/lib/types'
import type { RunView } from '@/lib/useRun'
import { cn } from '@/lib/utils'

interface Props {
  run: RunView
  logoState: KavachLogoState
  /** label of the bundled recording when the dashboard runs without an API */
  demo: string | null
  onReplayDemo: (speed: number) => void
  onLive: () => void
  onReplay: (file: string, speed: number) => void
  onStop: () => void
}

function targetLabel(h: Health | null) {
  if (!h) return 'Target unknown'
  if (h.target_url.includes('agent37')) return 'Target in Agent37 sandbox'
  if (h.target_url === 'inprocess') return 'Target in-process'
  return 'Target on localhost'
}

function runLabel(file: string) {
  const name = file.replace(/\.jsonl$/, '')
  if (name === 'demo_run') return 'Demo run (recorded live)'
  if (name === 'sample_simulated_run') return 'Sample run (simulated)'
  const m = /^kv-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})/.exec(name)
  return m ? `Run ${m[3]}/${m[2]} ${m[4]}:${m[5]}` : name
}

function brainLabel(p?: string) {
  if (p === 'lyzr') return 'Lyzr agents'
  if (p === 'direct') return 'Direct model agents'
  if (p === 'fake') return 'Scripted agents (offline)'
  return 'Agents'
}

export function TopBar({ run, logoState, demo, onReplayDemo, onLive, onReplay, onStop }: Props) {
  const [health, setHealth] = useState<Health | null>(null)
  const [apiDown, setApiDown] = useState(false)
  const [replays, setReplays] = useState<string[]>([])
  const [file, setFile] = useState('')
  const [speed, setSpeed] = useState('1.5')
  const running = run.status === 'running'

  useEffect(() => {
    if (demo) return
    api
      .health()
      .then((h) => {
        setHealth(h)
        setApiDown(false)
      })
      .catch(() => setApiDown(true))
    api
      .replays()
      .then((r) => {
        const files = r.map((x) => x.file)
        setReplays(files)
        setFile((cur) => (cur && files.includes(cur) ? cur : (files[0] ?? '')))
      })
      .catch(() => setReplays([]))
  }, [run.status, demo])

  return (
    <header className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3">
      <KavachLogo size={30} state={logoState} wordmark />

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <StatusPill run={run} apiDown={apiDown && !demo} />
        {demo && <span className="rounded-full bg-kv-surface-2 px-2.5 py-1 text-kv-muted">{demo}, played in your browser</span>}
        {health && (
          <>
            <span className="rounded-full bg-kv-surface-2 px-2.5 py-1 text-kv-muted">{brainLabel(health.brain_provider)}</span>
            <span className="rounded-full bg-kv-surface-2 px-2.5 py-1 text-kv-muted">{targetLabel(health)}</span>
          </>
        )}
        <span className="rounded-full bg-kv-surface-2 px-2.5 py-1 font-medium text-kv-text">
          Deployed <span className="font-mono text-kv-secure">{run.deployedVersion}</span>
        </span>
        {run.bandUrl && (
          <a
            href={run.bandUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-kv-brand/40 px-2.5 py-1 text-kv-brand-hover hover:bg-kv-brand-soft"
          >
            Open the Band room <ExternalLink className="size-3" />
          </a>
        )}
        {run.bandErrors > 0 && (
          <span className="rounded-full bg-kv-verdict-soft px-2.5 py-1 text-kv-verdict">
            Band unavailable for {run.bandErrors} message{run.bandErrors === 1 ? '' : 's'}; the room below still has everything
          </span>
        )}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {demo ? (
          <>
            <Select value={speed} onValueChange={setSpeed}>
              <SelectTrigger className="h-9 w-20 border-kv-border bg-kv-surface-2 text-sm" aria-label="Replay speed">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-kv-border bg-kv-surface-2">
                {['1', '1.5', '2', '4'].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}×
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => onReplayDemo(Number(speed))} className="border-kv-border-strong bg-transparent">
              <RotateCcw className="size-3.5" /> Play again
            </Button>
            <Button asChild className="bg-kv-brand font-semibold text-kv-bg hover:bg-kv-brand-hover">
              <a href="https://github.com/harshbhx/kavach#quickstart">Run it yourself</a>
            </Button>
          </>
        ) : running ? (
          <Button variant="outline" onClick={onStop} className="border-kv-border-strong bg-transparent">
            <Square className="size-3.5 fill-current" /> Stop run
          </Button>
        ) : (
          <>
            <Select value={file} onValueChange={setFile} disabled={replays.length === 0}>
              <SelectTrigger className="h-9 w-56 border-kv-border bg-kv-surface-2 text-sm" aria-label="Recorded run">
                <SelectValue placeholder="No recorded runs yet" />
              </SelectTrigger>
              <SelectContent className="border-kv-border bg-kv-surface-2">
                {replays.map((r) => (
                  <SelectItem key={r} value={r}>
                    {runLabel(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={speed} onValueChange={setSpeed}>
              <SelectTrigger className="h-9 w-20 border-kv-border bg-kv-surface-2 text-sm" aria-label="Replay speed">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-kv-border bg-kv-surface-2">
                {['1', '1.5', '2', '4'].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}×
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              disabled={!file}
              onClick={() => onReplay(file, Number(speed))}
              className="border-kv-border-strong bg-transparent"
            >
              <RotateCcw className="size-3.5" /> Replay
            </Button>
            <Button onClick={onLive} disabled={apiDown} className="bg-kv-brand font-semibold text-kv-bg hover:bg-kv-brand-hover">
              <Play className="size-3.5 fill-current" /> Start live run
            </Button>
          </>
        )}
      </div>
    </header>
  )
}

function StatusPill({ run, apiDown }: { run: RunView; apiDown: boolean }) {
  if (apiDown)
    return (
      <span className="rounded-full bg-kv-attack-soft px-2.5 py-1 font-medium text-kv-attack">
        API offline: start it with make api
      </span>
    )
  if (run.status === 'running')
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-kv-defend/30 bg-kv-defend-soft px-2.5 py-1 font-medium">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-kv-defend opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-kv-defend" />
        </span>
        <ShinyText
          text={`${run.mode === 'live' ? 'Live' : 'Replaying'}, round ${run.currentRound || 1}`}
          color="#67e8f9"
          shineColor="#ecfeff"
          speed={2.5}
        />
      </span>
    )
  const map = {
    idle: ['Ready', 'bg-kv-surface-2 text-kv-muted'],
    completed: ['Run complete', 'bg-kv-secure-soft text-kv-secure'],
    failed: ['Run failed', 'bg-kv-attack-soft text-kv-attack'],
    stopped: ['Stopped', 'bg-kv-verdict-soft text-kv-verdict'],
  } as const
  const [label, cls] = map[run.status as keyof typeof map]
  return <span className={cn('rounded-full px-2.5 py-1 font-medium', cls)}>{label}</span>
}
