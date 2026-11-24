import type { KavachLogoState } from '@kavach/brand'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ArenaPanel } from '@/components/arena-panel'
import { KpiStrip } from '@/components/kpi-strip'
import { PatchPanel } from '@/components/patch-panel'
import { RoomPanel } from '@/components/room-panel'
import { RoundRail } from '@/components/round-rail'
import { TopBar } from '@/components/top-bar'
import { TrendPanel } from '@/components/trend-panel'
import { Toaster } from '@/components/ui/sonner'
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

export default function App() {
  const onEvent = useRunToasts()
  const { state: run, attach, attachDemo, demoData } = useRun(onEvent)
  const demo = demoParam()
  const [logo, setLogo] = useState<KavachLogoState>('idle')

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

  // ?run=<id>[&mode=replay] re-attaches after a refresh
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (demo) {
      attachDemo(demo).catch((e) => toast.error('Could not load the recorded run', { description: String(e) }))
      return
    }
    const id = q.get('run')
    if (id) attach(id, q.get('mode') === 'replay' ? 'replay' : 'live')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = async (fn: () => Promise<{ run_id: string }>, mode: 'live' | 'replay') => {
    try {
      const { run_id } = await fn()
      window.history.replaceState(null, '', `?run=${run_id}${mode === 'replay' ? '&mode=replay' : ''}`)
      attach(run_id, mode)
    } catch (e) {
      toast.error('Could not start the run', { description: String(e).replace(/^Error:\s*/, '') })
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen flex-col gap-3 pb-4 xl:h-screen">
        <TopBar
          run={run}
          logoState={logo}
          demo={demo ? (DEMO_RUNS[demo] ?? DEMO_RUNS.sample).label : null}
          onReplayDemo={(speed) => demo && attachDemo(demo, speed)}
          onLive={() => start(() => api.startLive(), 'live')}
          onReplay={(file, speed) => start(() => api.startReplay(file, speed), 'replay')}
          onStop={() => run.runId && api.stop(run.runId)}
        />
        <RoundRail run={run} total={ROUNDS} />
        {run.errors.length > 0 && (
          <p className="mx-4 rounded-xl border border-kv-verdict/40 bg-kv-verdict-soft px-4 py-2 text-xs text-kv-verdict">{run.errors[run.errors.length - 1]}</p>
        )}
        <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 px-4 xl:grid-cols-12">
          <div className="h-[520px] min-w-0 xl:col-span-4 xl:h-auto xl:min-h-0">
            <RoomPanel run={run} />
          </div>
          <div className="flex min-h-0 min-w-0 flex-col gap-3 xl:col-span-5">
            <KpiStrip run={run} />
            <div className="h-[480px] min-h-0 xl:h-auto xl:flex-1">
              <ArenaPanel run={run} />
            </div>
          </div>
          <div className="flex min-h-0 min-w-0 flex-col gap-3 xl:col-span-3">
            <TrendPanel run={run} rounds={ROUNDS} />
            <div className="h-[460px] min-h-0 xl:h-auto xl:flex-1">
              <PatchPanel run={run} demoData={demoData} />
            </div>
          </div>
        </main>
      </div>
      <Toaster position="bottom-right" richColors closeButton />
    </TooltipProvider>
  )
}
