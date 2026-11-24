import type { KavachLogoState } from '@kavach/brand'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ArenaPanel } from '@/components/arena-panel'
import { KpiStrip } from '@/components/kpi-strip'
import { Narration, narrationFor } from '@/components/narration'
import { PatchPanel } from '@/components/patch-panel'
import { RoomPanel } from '@/components/room-panel'
import { RoundRail } from '@/components/round-rail'
import { ActivityBar } from '@/components/activity-bar'
import { TopBar } from '@/components/top-bar'
import { TrendPanel } from '@/components/trend-panel'
import { Toaster } from '@/components/ui/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { api } from '@/lib/api'
import { DEMO_RUNS, demoParam } from '@/lib/demo'
import { RULE_LABEL } from '@/lib/format'
import type { KavachEvent } from '@/lib/types'
import { useRun } from '@/lib/useRun'

const HOLD_MS = { breach: 1500, secured: 2200 }
const ROUNDS = 3

/** Toasts answer what just happened: a breach, a veto, a deployed patch. Old events (a page refresh) stay quiet. */
function useRunToasts() {
  const breachedRounds = useRef(new Set<number>())
  return useCallback((ev: KavachEvent) => {
    if (Date.now() - Date.parse(ev.ts) > 15000) return
    const d = ev.data as Record<string, any>
    if (ev.type === 'run.started') breachedRounds.current.clear()
    if (ev.type === 'breach.detected' && ev.round != null && !breachedRounds.current.has(ev.round)) {
      breachedRounds.current.add(ev.round)
      toast.error(`Breach in round ${ev.round}`, { description: `${RULE_LABEL[d.rule_id] ?? d.rule_id}. Caught by code.` })
    }
    if (ev.type === 'audit.result' && d.decision === 'veto')
      toast.warning(`Patch ${d.candidate_version} vetoed`, { description: d.reasons?.[0] ?? 'Utility fell below 90%.' })
    if (ev.type === 'patch.applied') toast.success(`Guardrail ${d.version} deployed`, { description: 'Exploits replayed and blocked, utility kept.' })
    if (ev.type === 'run.completed') toast.success('Run complete', { description: 'The audit report is ready to download.' })
  }, [])
}

/** True at and above the given width, kept in sync with resizes. */
function useMinWidth(px: number) {
  const query = `(min-width: ${px}px)`
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

const ANNOUNCED = new Set(['breach.detected', 'audit.result', 'patch.applied', 'round.started', 'run.completed'])

const params = new URLSearchParams(window.location.search)
const NARRATE = params.get('narrate') === '1'
const DEMO_SPEED = Number(params.get('speed')) || 1.5

export default function App() {
  const toasts = useRunToasts()
  const [caption, setCaption] = useState<{ text: string; key: number } | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const wide = useMinWidth(1280)
  // Which recording actually played: ?demo=live falls back to the sample until a live run is recorded.
  const played = useRef<string | null>(null)
  const onEvent = useCallback(
    (ev: KavachEvent) => {
      const text = narrationFor(ev, played.current === 'sample')
      // Screen readers hear the moments that matter, in the same words as the presenter captions.
      if (text && ANNOUNCED.has(ev.type)) setAnnouncement((prev) => (prev === text ? prev : text))
      if (!NARRATE) return toasts(ev)
      if (text) setCaption({ text, key: ev.seq })
    },
    [toasts],
  )
  const { state: run, attach, attachDemo, demoData } = useRun(onEvent)
  const demo = demoParam()
  const playedName = run.runId?.startsWith('demo-') ? run.runId.slice(5) : null
  useEffect(() => {
    played.current = playedName
  }, [playedName])
  // Label the recording that loaded, never the one asked for, so a fallback to the sample never reads as live.
  const demoLabel = demo ? (playedName ? DEMO_RUNS[playedName]?.label : null) ?? 'Loading the recorded run' : null
  const [logo, setLogo] = useState<KavachLogoState>('idle')
  const [starting, setStarting] = useState(false)

  // Logo follows the run (docs/assets/brand/BRAND.md, "Logo states")
  useEffect(() => {
    const running = run.status === 'running'
    const rest: KavachLogoState = running ? 'attack' : run.status === 'completed' ? 'secured' : 'idle'
    const sig = run.logo
    if (!sig || sig.state === 'attack') {
      setLogo(rest)
      return
    }
    setLogo(sig.state)
    const t = setTimeout(() => setLogo(rest), HOLD_MS[sig.state])
    return () => clearTimeout(t)
  }, [run.logo, run.status])

  // The tab title says where the run is, so a backgrounded tab still shows progress.
  useEffect(() => {
    const where =
      run.status === 'running'
        ? `Round ${run.currentRound || 1}, ${run.mode === 'live' ? 'live' : 'replaying'}`
        : run.status === 'completed'
          ? 'Run complete'
          : run.status === 'failed'
            ? 'Run failed'
            : null
    document.title = where ? `${where} | Kavach` : 'Kavach dashboard'
  }, [run.status, run.currentRound, run.mode])

  // ?run=<id>[&mode=replay] re-attaches after a refresh
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (demo) {
      attachDemo(demo, DEMO_SPEED).catch((e) => toast.error('Could not load the recorded run', { description: String(e) }))
      return
    }
    const id = q.get('run')
    if (id) attach(id, q.get('mode') === 'replay' ? 'replay' : 'live')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = async (fn: () => Promise<{ run_id: string }>, mode: 'live' | 'replay') => {
    if (starting) return // one click is enough; ignore the rest while the API answers
    setStarting(true)
    try {
      const { run_id } = await fn()
      window.history.replaceState(null, '', `?run=${run_id}${mode === 'replay' ? '&mode=replay' : ''}`)
      attach(run_id, mode)
    } catch (e) {
      toast.error('Could not start the run', { description: String(e).replace(/^Error:\s*/, '') })
    } finally {
      setStarting(false)
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen flex-col gap-3 pb-4 xl:h-screen">
        <TopBar
          run={run}
          logoState={logo}
          starting={starting}
          demo={demoLabel}
          onReplayDemo={(speed) => demo && attachDemo(demo, speed)}
          onLive={() => start(() => api.startLive(), 'live')}
          onReplay={(file, speed) => start(() => api.startReplay(file, speed), 'replay')}
          onStop={() => run.runId && api.stop(run.runId)}
        />
        <ActivityBar run={run} starting={starting} />
        <div className="grid gap-3 px-4 min-[2200px]:grid-cols-[1.5fr_1fr]">
          <RoundRail run={run} total={ROUNDS} />
          <KpiStrip run={run} />
        </div>
        {run.errors.length > 0 && (
          <p className="mx-4 rounded-xl border border-kv-verdict/40 bg-kv-verdict-soft px-4 py-2 text-xs text-kv-verdict">{run.errors[run.errors.length - 1]}</p>
        )}
        {wide ? (
          <main className="grid min-h-0 flex-1 grid-cols-12 gap-3 px-4">
            <div className="col-span-4 min-h-0 min-w-0">
              <RoomPanel run={run} />
            </div>
            <div className="col-span-5 min-h-0 min-w-0">
              <ArenaPanel run={run} />
            </div>
            <div className="col-span-3 flex min-h-0 min-w-0 flex-col gap-3">
              <TrendPanel run={run} rounds={ROUNDS} />
              <div className="min-h-0 flex-1">
                <PatchPanel run={run} demoData={demoData} />
              </div>
            </div>
          </main>
        ) : (
          <Tabs defaultValue="calls" className="px-4">
            <TabsList className="grid h-10 w-full grid-cols-3 rounded-xl border border-kv-border-strong/60 bg-kv-surface-2 p-1">
              {[
                ['room', 'Room', run.messages.length],
                ['calls', 'Tool calls', run.toolCards.length],
                ['scores', 'Scores', null],
              ].map(([value, label, count]) => (
                <TabsTrigger
                  key={value as string}
                  value={value as string}
                  className="rounded-lg text-[13.5px] text-kv-muted data-[state=active]:bg-kv-surface data-[state=active]:text-kv-text data-[state=active]:shadow-sm"
                >
                  {label}
                  {count ? <span className="ml-1 font-mono text-[11.5px] text-kv-faint">{count}</span> : null}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="room" forceMount className="h-[75vh] data-[state=inactive]:hidden">
              <RoomPanel run={run} />
            </TabsContent>
            <TabsContent value="calls" forceMount className="h-[75vh] data-[state=inactive]:hidden">
              <ArenaPanel run={run} />
            </TabsContent>
            <TabsContent value="scores" forceMount className="space-y-3 data-[state=inactive]:hidden">
              <TrendPanel run={run} rounds={ROUNDS} />
              <div className="h-[70vh]">
                <PatchPanel run={run} demoData={demoData} />
              </div>
            </TabsContent>
          </Tabs>
        )}
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>
      {NARRATE ? <Narration latest={caption} /> : <Toaster position="bottom-center" richColors closeButton />}
    </TooltipProvider>
  )
}
