import type { View } from './route'
import type { Moment, RunView } from './useRun'

/** Shared words for the run's story: the clock, the verdict, each moment's stamp and where it leads. */
export const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `+${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function verdictOf(run: RunView): { word: string; tone: 'attack' | 'defend' | 'secure' | 'verdict' } | null {
  const rounds = Object.values(run.rounds)
  if (run.status === 'running') return { word: `${run.mode === 'live' ? 'LIVE' : 'REPLAYING'} · ROUND ${run.currentRound || 1}`, tone: 'verdict' }
  if (!rounds.length) return null
  const last = rounds.sort((a, b) => a.round - b.round)[rounds.length - 1]
  if (last.breach_rate > 0) return { word: 'STILL BREACHED', tone: 'attack' }
  return rounds.some((r) => r.breach_rate > 0) ? { word: 'HARDENED', tone: 'secure' } : { word: 'HELD', tone: 'defend' }
}

const MARK: Record<Moment['kind'], string> = {
  start: 'ROOM',
  breach: 'BREACH',
  patch: 'PATCH',
  veto: 'VETOED',
  passed: 'PASSED',
  ask: 'WAITING',
  decided: 'DECIDED',
  deployed: 'DEPLOYED',
  round: 'ROUND',
  verdict: 'VERDICT',
  report: 'REPORT',
}

export function markOf(m: Moment): string {
  if (m.kind === 'decided') return m.decision === 'approve' ? 'APPROVED' : 'REJECTED'
  if (m.kind === 'round') return m.tone === 'defend' ? 'HELD' : m.tone === 'secure' ? 'HARDENED' : 'BREACHED'
  return MARK[m.kind]
}

export function viewFor(m: Moment): View {
  if (m.kind === 'breach') return 'attacks'
  if (m.kind === 'start') return 'room'
  if (m.kind === 'report' || m.kind === 'verdict') return 'report'
  if (m.kind === 'round') return 'attacks'
  return 'patches'
}

