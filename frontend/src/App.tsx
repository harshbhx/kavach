import { useEffect, useState } from 'react'
import type { KavachLogoState } from './brand/KavachLogo'
import { BreachChart } from './components/BreachChart'
import { DiffPanel } from './components/DiffPanel'
import { Feed } from './components/Feed'
import { Header } from './components/Header'
import { Scoreboard } from './components/Scoreboard'
import { ToolFeed } from './components/ToolFeed'
import { api } from './lib/api'
import { useRun } from './lib/useRun'

const HOLD_MS = { breach: 1500, secured: 2200 }

export default function App() {
  const { state: run, attach } = useRun()
  const [logo, setLogo] = useState<KavachLogoState>('idle')
  const [error, setError] = useState<string | null>(null)
  const totalRounds = 3

  // Logo state from the live run (see docs/assets/brand/BRAND.md → Logo states)
  useEffect(() => {
    const running = run.status === 'running'
    const sig = run.logo
    if (!sig) {
      setLogo(running ? 'attack' : run.status === 'completed' ? 'secured' : 'idle')
      return
    }
    if (sig.state === 'attack') {
      setLogo(running ? 'attack' : 'idle')
      return
    }
    setLogo(sig.state)
    const t = setTimeout(() => setLogo(running ? 'attack' : run.status === 'completed' ? 'secured' : 'idle'), HOLD_MS[sig.state])
    return () => clearTimeout(t)
  }, [run.logo, run.status])

  // ?run=<id>[&mode=replay] re-attaches to a run that is already going (or finished) on the API
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const id = q.get('run')
    if (id) attach(id, q.get('mode') === 'replay' ? 'replay' : 'live')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = async (fn: () => Promise<{ run_id: string }>, mode: 'live' | 'replay') => {
    setError(null)
    try {
      const { run_id } = await fn()
      window.history.replaceState(null, '', `?run=${run_id}${mode === 'replay' ? '&mode=replay' : ''}`)
      attach(run_id, mode)
    } catch (e) {
      setError(String(e))
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:h-screen">
      <Header
        run={run}
        logoState={logo}
        onLive={() => start(() => api.startLive(), 'live')}
        onReplay={(file, speed) => start(() => api.startReplay(file, speed), 'replay')}
        onStop={() => run.runId && api.stop(run.runId)}
      />
      {error && <div className="mx-5 mt-3 rounded-kv border border-kv-attack/50 bg-kv-attack-soft px-4 py-2 text-sm text-kv-attack">{error}</div>}
      {run.errors.length > 0 && (
        <div className="mx-5 mt-3 rounded-kv border border-kv-verdict/40 bg-kv-verdict-soft px-4 py-2 text-xs text-kv-verdict">{run.errors[run.errors.length - 1]}</div>
      )}
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-12">
        <div className="flex h-[480px] min-w-0 flex-col lg:col-span-4 lg:h-auto lg:min-h-0">
          <Feed messages={run.messages} />
        </div>
        <div className="flex min-h-0 min-w-0 flex-col gap-4 lg:col-span-5">
          <BreachChart points={run.chart} rounds={totalRounds} />
          <div className="flex h-[440px] flex-col lg:h-auto lg:min-h-0 lg:flex-1">
            <ToolFeed cards={run.toolCards} attacks={run.attacks} />
          </div>
        </div>
        <div className="flex h-[520px] min-w-0 flex-col lg:col-span-3 lg:h-auto lg:min-h-0">
          <DiffPanel run={run} />
        </div>
      </main>
      <footer className="px-4 pb-4">
        <Scoreboard run={run} totalRounds={totalRounds} />
      </footer>
    </div>
  )
}
