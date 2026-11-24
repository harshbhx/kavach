import { KavachLogo, type KavachLogoState } from '@kavach/brand'
import { ExternalLink, LoaderCircle, Play, RotateCcw, Square } from 'lucide-react'
import { useEffect, useState } from 'react'
import ShinyText from '@/components/ShinyText'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { api } from '@/lib/api'
import type { Health } from '@/lib/types'
import type { RunView } from '@/lib/useRun'
import { Stamp } from './panel'

interface Props {
  run: RunView
  logoState: KavachLogoState
  /** label of the bundled recording when the dashboard runs without an API */
  demo: string | null
  /** true between the click on Start and the first event; the button locks so a second click cannot start twice */
  starting?: boolean
  onReplayDemo: (speed: number) => void
  onLive: () => void
  onReplay: (file: string, speed: number) => void
  onStop: () => void
}

function targetLabel(h: Health | null) {
  if (!h) return null
  if (h.target_url.includes('agent37')) return 'Agent37 sandbox'
  if (h.target_url === 'inprocess') return 'in-process'
  return 'localhost'
}

function brainLabel(p?: string) {
  if (p === 'lyzr') return 'Lyzr agents'
  if (p === 'direct') return 'direct model agents'
  if (p === 'fake') return 'scripted agents'
  return 'agents'
}

function runLabel(file: string) {
  const name = file.replace(/\.jsonl$/, '')
  if (name === 'demo_run') return 'Demo run (recorded live)'
  if (name === 'sample_simulated_run') return 'Sample run (simulated)'
  const m = /^kv-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})/.exec(name)
  return m ? `Run ${m[3]}/${m[2]} ${m[4]}:${m[5]}` : name
}

function SpeedSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-20 border-kv-border-strong bg-kv-surface text-sm" aria-label="Replay speed">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {['1', '1.5', '2', '4'].map((s) => (
          <SelectItem key={s} value={s}>
            {s}×
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function TopBar({ run, logoState, demo, starting = false, onReplayDemo, onLive, onReplay, onStop }: Props) {
  const [health, setHealth] = useState<Health | null>(null)
  const [apiDown, setApiDown] = useState(false)
  const [replays, setReplays] = useState<string[]>([])
  const [file, setFile] = useState('')
  const [speed, setSpeed] = useState('1.5')
  const running = run.status === 'running'

  // While the backend is down, check again every few seconds so the page recovers on its own.
  useEffect(() => {
    if (demo || !apiDown) return
    const t = setInterval(() => {
      api
        .health()
        .then((h) => {
          setHealth(h)
          setApiDown(false)
        })
        .catch(() => {})
    }, 4000)
    return () => clearInterval(t)
  }, [apiDown, demo])

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

  const title = demo ?? (run.runId ? `Run ${run.runId.replace(/^kv-/, '')}` : 'No run yet')
  const facts = demo
    ? ['played in your browser, no backend']
    : health
      ? [brainLabel(health.brain_provider), `target ${targetLabel(health)}`]
      : []

  return (
    <header data-film="header" className="relative">
      <div className="kv-band h-3 border-b border-kv-border" aria-hidden />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <KavachLogo size={30} state={logoState} wordmark />
          <span className="font-display text-xl leading-none text-kv-faint" lang="hi">
            कवच
          </span>
        </div>
        <Separator orientation="vertical" className="h-9 bg-kv-border-strong/60" />
        <div className="min-w-0">
          <p className="truncate font-display text-[19px] leading-tight text-kv-text">{title}</p>
          <p className="truncate text-[12.5px] text-kv-faint">
            DiwaliMart Support, deployed <span className="font-mono text-kv-secure">{run.deployedVersion}</span>
            {facts.map((f) => (
              <span key={f}>, {f}</span>
            ))}
          </p>
        </div>
        <StatusStamp run={run} apiDown={apiDown && !demo} />
        {run.bandUrl && (
          <a
            href={run.bandUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-kv-defend underline-offset-4 hover:underline"
          >
            Open the Band room <ExternalLink className="size-3" />
          </a>
        )}
        {run.bandErrors > 0 && (
          <span className="text-[12.5px] text-kv-verdict">
            Band missed {run.bandErrors} message{run.bandErrors === 1 ? '' : 's'}; the room below has all of them
          </span>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {demo ? (
            <>
              <SpeedSelect value={speed} onChange={setSpeed} />
              <Button variant="outline" onClick={() => onReplayDemo(Number(speed))} className="border-kv-border-strong bg-transparent">
                <RotateCcw className="size-3.5" /> Play again
              </Button>
              <Button asChild className="bg-kv-brand font-semibold text-kv-surface hover:bg-kv-brand-hover">
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
                <SelectTrigger className="h-9 w-56 border-kv-border-strong bg-kv-surface text-sm" aria-label="Recorded run">
                  <SelectValue placeholder="No recorded runs yet" />
                </SelectTrigger>
                <SelectContent>
                  {replays.map((r) => (
                    <SelectItem key={r} value={r}>
                      {runLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <SpeedSelect value={speed} onChange={setSpeed} />
              <Button variant="outline" disabled={!file || starting} onClick={() => onReplay(file, Number(speed))} className="border-kv-border-strong bg-transparent">
                <RotateCcw className="size-3.5" /> Replay
              </Button>
              <Button onClick={onLive} disabled={apiDown || starting} className="bg-kv-brand font-semibold text-kv-surface hover:bg-kv-brand-hover">
                {starting ? <LoaderCircle className="size-3.5 animate-spin" /> : <Play className="size-3.5 fill-current" />}
                {starting ? 'Starting…' : 'Start live run'}
              </Button>
            </>
          )}
        </div>
      </div>
      {apiDown && !demo && (
        <div role="status" className="mx-4 mb-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-kv-attack/30 bg-kv-attack-soft/50 px-4 py-2.5 text-[13.5px]">
          <span className="font-semibold text-kv-attack">The backend isn’t running.</span>
          <span className="text-kv-muted">
            Start it from the repo root with <code className="font-mono text-kv-text">pnpm dev</code>, or{' '}
            <code className="font-mono text-kv-text">pnpm dev:offline</code> with no keys. This page reconnects on its own.
          </span>
          <a href="?demo=live" className="font-semibold text-kv-defend hover:underline sm:ml-auto">
            Watch a recorded run instead
          </a>
        </div>
      )}
    </header>
  )
}

function StatusStamp({ run, apiDown }: { run: RunView; apiDown: boolean }) {
  if (apiDown) return <Stamp tone="attack">BACKEND OFFLINE</Stamp>
  if (run.status === 'running')
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-kv-defend/40 bg-kv-defend-soft px-3 py-1 text-[13px] font-semibold">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-kv-defend opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-kv-defend" />
        </span>
        <ShinyText
          text={`${run.mode === 'live' ? 'Live' : 'Replaying'}, round ${run.currentRound || 1}`}
          color="#0b6e7f"
          shineColor="#7fd6e2"
          speed={2.5}
        />
      </span>
    )
  if (run.status === 'completed') return <Stamp tone="secure">COMPLETE</Stamp>
  if (run.status === 'failed') return <Stamp tone="attack">FAILED</Stamp>
  if (run.status === 'stopped') return <Stamp tone="verdict">STOPPED</Stamp>
  return <span className="text-[13px] text-kv-faint">Ready</span>
}
