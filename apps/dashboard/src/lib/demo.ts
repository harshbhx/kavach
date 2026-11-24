import type { KavachEvent, TargetConfig } from './types'

/**
 * Demo mode: plays a recorded run (runs/*.jsonl, bundled with the static build) in the browser, with the same pacing
 * as the backend's replay (backend/kavach/orchestrator/replay.py). No API needed, so the dashboard can live on any
 * static host next to the website.
 */

export interface DemoRun {
  name: string
  events: KavachEvent[]
  configs: Record<string, TargetConfig>
  reportMd: string | null
}

export const DEMO_RUNS: Record<string, { file: string; label: string }> = {
  live: { file: 'demo_run.jsonl', label: 'Recorded live run' },
  sample: { file: 'sample_simulated_run.jsonl', label: 'Sample run (simulated, scripted agents)' },
}

export function demoParam(): string | null {
  return new URLSearchParams(window.location.search).get('demo')
}

export async function loadDemo(name: string): Promise<DemoRun> {
  const entry = DEMO_RUNS[name] ?? DEMO_RUNS.sample
  const res = await fetch(`${import.meta.env.BASE_URL}runs/${entry.file}`)
  if (!res.ok) {
    if (name !== 'sample') return loadDemo('sample')
    throw new Error(`could not load ${entry.file} (${res.status})`)
  }
  const events = (await res.text())
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as KavachEvent)
  const extras = events.find((e) => e.type === 'replay.extras')?.data as
    | { report_md?: string; configs?: Record<string, TargetConfig> }
    | undefined
  return {
    name: DEMO_RUNS[name] ? name : 'sample',
    events: events.filter((e) => e.type !== 'replay.extras'),
    configs: extras?.configs ?? {},
    reportMd: extras?.report_md ?? null,
  }
}

/** Emits each event with the recorded timing (sped up, with a readable floor). Returns a cancel function. */
export function playDemo(run: DemoRun, speed: number, emit: (ev: KavachEvent) => void, done: () => void): () => void {
  let cancelled = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const runId = `demo-${run.name}`
  const s = Math.max(speed, 0.1)
  let i = 0
  let prev = 0
  const step = () => {
    if (cancelled) return
    if (i >= run.events.length) {
      done()
      return
    }
    const ev = run.events[i]
    const gap = (ev.t_rel_ms - prev) / 1000 / s
    const floor = (ev.type === 'agent.message' ? 0.8 : 0.05) / s
    prev = ev.t_rel_ms
    timer = setTimeout(
      () => {
        if (cancelled) return
        emit({ ...ev, run_id: runId, seq: i, ts: new Date().toISOString(), data: { ...ev.data, replayed: true } })
        i += 1
        step()
      },
      i === 0 ? 300 : Math.min(Math.max(gap, floor), 8) * 1000,
    )
  }
  step()
  return () => {
    cancelled = true
    if (timer) clearTimeout(timer)
  }
}

/** Configs the run has produced so far: v1, every proposed candidate, every deployed version. */
export function configsSoFar(run: DemoRun, seen: KavachEvent[]): Record<string, TargetConfig> {
  const keys = new Set(['v1'])
  for (const ev of seen) {
    const d = ev.data as Record<string, unknown>
    if (ev.type === 'patch.proposed' && typeof d.config_key === 'string') keys.add(d.config_key)
    if (ev.type === 'patch.applied' && typeof d.version === 'string') keys.add(d.version)
  }
  return Object.fromEntries(Object.entries(run.configs).filter(([k]) => keys.has(k)))
}
