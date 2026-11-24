import type { Health, TargetConfig } from './types'

export const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? ''

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, init)
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
  return (await r.json()) as T
}

export const api = {
  health: () => json<Health>('/api/health'),
  replays: () => json<{ file: string; size: number }[]>('/api/replays'),
  startLive: (rounds?: number) =>
    json<{ run_id: string }>('/api/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'live', rounds }),
    }),
  startReplay: (file: string, speed: number) =>
    json<{ run_id: string }>('/api/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'replay', replay_file: file, speed }),
    }),
  stop: (runId: string) => json<{ stopped: boolean }>(`/api/runs/${runId}/stop`, { method: 'POST' }),
  configs: (runId: string) => json<Record<string, TargetConfig>>(`/api/runs/${runId}/configs`),
  eventsUrl: (runId: string) => `${API_BASE}/api/runs/${runId}/events`,
  reportUrl: (runId: string) => `${API_BASE}/api/runs/${runId}/report.md`,
}
