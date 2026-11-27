import type { KavachLogoState } from '@kavach/brand'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ActivityBar } from '@/components/activity-bar'
import { AppNav } from '@/components/app-nav'
import { ApprovalBanner } from '@/components/approval-card'
import { Narration, narrationFor } from '@/components/narration'
import { PresentMode } from '@/components/present'
import { TopBar } from '@/components/top-bar'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useView } from '@/lib/route'
import { AttacksView } from '@/views/attacks'
import { ModelsView } from '@/views/models'
import { OverviewView } from '@/views/overview'
import { PatchesView } from '@/views/patches'
import { ReportView } from '@/views/report'
import { RoomView } from '@/views/room'
import { api } from '@/lib/api'
import { demoLabel as labelOfDemo, demoParam, loadGallery, type GalleryEntry } from '@/lib/demo'
import { RULE_LABEL } from '@/lib/format'
import type { KavachEvent } from '@/lib/types'
import { useRun } from '@/lib/useRun'

const HOLD_MS = { breach: 1500, secured: 2200 }

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

const ANNOUNCED = new Set(['breach.detected', 'audit.result', 'patch.applied', 'round.started', 'run.completed'])

const params = new URLSearchParams(window.location.search)
const NARRATE = params.get('narrate') === '1'
const DEMO_SPEED = Number(params.get('speed')) || 1.5

export default function App() {
  const toasts = useRunToasts()
  const [caption, setCaption] = useState<{ text: string; key: number } | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [view, setView] = useView()
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
  const demoLabel = demo ? (playedName ? labelOfDemo(playedName) : null) ?? 'Loading the recorded run' : null
  const [gallery, setGallery] = useState<GalleryEntry[]>([])
  useEffect(() => {
    if (demo) loadGallery().then(setGallery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const pickDemo = (key: string, speed: number) => {
    window.history.replaceState(null, '', `?demo=${key}${window.location.hash}`)
    loadGallery().then(setGallery)
    attachDemo(key, speed).catch((e) => toast.error('Could not load that recording', { description: String(e) }))
  }

  // P opens present mode from anywhere except a text field
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return
      if (e.key.toLowerCase() === 'p' && !e.metaKey && !e.ctrlKey && !e.altKey && view !== 'present') setView('present')
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [view, setView])
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
      <div className="flex min-h-screen flex-col gap-3 pb-6">
        <TopBar
          run={run}
          logoState={logo}
          starting={starting}
          demo={demoLabel}
          gallery={gallery}
          demoKey={playedName}
          onPickDemo={pickDemo}
          onReplayDemo={(speed) => demo && attachDemo(demo, speed)}
          onLive={(requireApproval) => start(() => api.startLive(undefined, { require_approval: requireApproval }), 'live')}
          onCustom={(custom) => start(() => api.startLive(undefined, custom), 'live')}
          onReplay={(file, speed) => start(() => api.startReplay(file, speed), 'replay')}
          onStop={() => run.runId && api.stop(run.runId)}
        />
        <div className="flex gap-4 px-4 max-lg:flex-col">
          <AppNav run={run} view={view} onView={setView} />
          <main className="min-w-0 flex-1 space-y-3">
            {run.approval && !run.approval.decided ? (
              <ApprovalBanner key={`${run.approval.version}-${run.approval.attempt}`} run={run} />
            ) : view === 'overview' && run.status === 'completed' ? null : (
              <ActivityBar run={run} starting={starting} />
            )}
            {run.errors.length > 0 && (
              <p className="rounded-xl border border-kv-verdict/40 bg-kv-verdict-soft px-4 py-2 text-xs text-kv-verdict">{run.errors[run.errors.length - 1]}</p>
            )}
            {(view === 'overview' || view === 'present') && <OverviewView run={run} onView={setView} onPickDemo={(k) => pickDemo(k, DEMO_SPEED)} />}
            {view === 'room' && <RoomView run={run} />}
            {view === 'attacks' && <AttacksView run={run} />}
            {view === 'patches' && <PatchesView run={run} demoData={demoData} />}
            {view === 'report' && <ReportView run={run} demoData={demoData} />}
            {view === 'models' && (
              <ModelsView
                onPlay={(id) => {
                  pickDemo(id, DEMO_SPEED)
                  setView('overview')
                }}
              />
            )}
          </main>
        </div>
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>
      {view === 'present' && <PresentMode run={run} onExit={() => setView('overview')} />}
      {NARRATE ? <Narration latest={caption} /> : view !== 'present' && <Toaster position="bottom-right" richColors closeButton />}
    </TooltipProvider>
  )
}
