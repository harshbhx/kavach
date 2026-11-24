import { useEffect, useReducer, useRef } from 'react'
import { api } from './api'
import { configsSoFar, loadDemo, playDemo, type DemoRun } from './demo'
import type {
  AgentMessage,
  AgentName,
  AttackInfo,
  AuditResult,
  KavachEvent,
  PatchProposed,
  RoundSummary,
  RunCompleted,
  Squad,
  ToolCallRecord,
  ToolCard,
} from './types'

export type LogoSignal = { state: 'attack' | 'breach' | 'secured'; at: number }

/** Phases of one round, in order. Probe only happens in round 1 (Recon's dossier is reused after that). */
export const PHASES = ['probe', 'attack', 'detect', 'patch', 'audit'] as const
export type Phase = (typeof PHASES)[number] | 'done'

export interface RoundProgress {
  phase: Phase
  /** highest phase index reached (5 = round finished) */
  reached: number
  attempts: number
  vetoes: number
  breachRate: number | null
}

export interface ChartPoint {
  round: number
  breach: number | null
  utility: number | null
  vetoed: { attempt: number; utility: number | null; reasons: string[] }[]
}

export interface RunView {
  runId: string | null
  mode: 'live' | 'replay' | 'demo' | null
  status: 'idle' | 'running' | 'completed' | 'failed' | 'stopped'
  currentRound: number
  deployedVersion: string
  messages: AgentMessage[]
  toolCards: ToolCard[]
  attacks: Record<string, AttackInfo>
  rounds: Record<number, RoundSummary>
  chart: Record<number, ChartPoint>
  patches: (PatchProposed & { round: number; audit?: AuditResult })[]
  final: RunCompleted | null
  reportReady: boolean
  bandUrl: string | null
  bandErrors: number
  errors: string[]
  logo: LogoSignal | null
  configsVersion: number
  lastSeq: number
  progress: Record<number, RoundProgress>
  /** wall-clock ms of the newest event and of the run start, for the 'last update Ns ago' heartbeat */
  lastEventAt: number | null
  startedAt: number | null
  speaker: { agent: AgentName; at: number } | null
}

export const emptyRun: RunView = {
  runId: null,
  mode: null,
  status: 'idle',
  currentRound: 0,
  deployedVersion: 'v1',
  messages: [],
  toolCards: [],
  attacks: {},
  rounds: {},
  chart: {},
  patches: [],
  final: null,
  reportReady: false,
  bandUrl: null,
  bandErrors: 0,
  errors: [],
  logo: null,
  configsVersion: 0,
  lastSeq: -1,
  progress: {},
  lastEventAt: null,
  startedAt: null,
  speaker: null,
}

type Action = { type: 'reset'; runId: string; mode: 'live' | 'replay' | 'demo' } | { type: 'event'; ev: KavachEvent } | { type: 'closed' }

const progressOf = (s: RunView, r: number): RoundProgress =>
  s.progress[r] ?? { phase: 'attack', reached: 0, attempts: 0, vetoes: 0, breachRate: null }

function advance(s: RunView, r: number, phase: Phase, patch: Partial<RoundProgress> = {}): Record<number, RoundProgress> {
  const cur = progressOf(s, r)
  const idx = phase === 'done' ? PHASES.length : PHASES.indexOf(phase)
  return { ...s.progress, [r]: { ...cur, ...patch, phase, reached: Math.max(cur.reached, idx) } }
}

const point = (s: RunView, round: number): ChartPoint => s.chart[round] ?? { round, breach: null, utility: null, vetoed: [] }

function reduce(s: RunView, a: Action): RunView {
  if (a.type === 'reset') return { ...emptyRun, runId: a.runId, mode: a.mode, status: 'running', startedAt: Date.now() }
  if (a.type === 'closed') return s.status === 'running' ? { ...s, status: s.final ? 'completed' : s.status } : s
  if (a.ev.seq <= s.lastSeq) return s // EventSource reconnects replay history; drop duplicates
  return { ...apply(s, a.ev), lastSeq: a.ev.seq, lastEventAt: Date.now() }
}

function apply(s: RunView, ev: KavachEvent): RunView {
  const d = ev.data as Record<string, any>
  const r = ev.round ?? s.currentRound
  const now = Date.now()
  switch (ev.type) {
    case 'run.started':
      return { ...s, status: 'running' }
    case 'band.room':
      return { ...s, bandUrl: d.url ?? null }
    case 'round.started':
      return { ...s, currentRound: r, logo: { state: 'attack', at: now }, progress: advance(s, r, r === 1 ? 'probe' : 'attack') }
    case 'recon.dossier':
      return { ...s, progress: advance(s, r, 'attack') }
    case 'agent.message':
      return {
        ...s,
        messages: [
          ...s.messages,
          { seq: ev.seq, round: ev.round, agent: d.agent as AgentName, squad: d.squad as Squad, text: d.text, mentions: d.mentions ?? [] },
        ],
        speaker: { agent: d.agent as AgentName, at: now },
      }
    case 'attack.launched':
      return {
        ...s,
        attacks: { ...s.attacks, [d.attack_id]: d as AttackInfo },
        logo: { state: 'attack', at: now },
        progress: progressOf(s, r).reached > 1 ? s.progress : advance(s, r, 'attack'),
      }
    case 'toolcall.intercepted': {
      if (d.kind === 'probe' || d.kind === 'benign') return s
      const card: ToolCard = {
        seq: ev.seq,
        round: ev.round,
        kind: d.kind,
        ref: d.ref,
        verdict: d.verdict,
        ruleId: d.rule_id ?? null,
        configVersion: d.config_version,
        record: (d.record as ToolCallRecord) ?? null,
        inputBlockedBy: d.input_blocked_by ?? null,
      }
      return { ...s, toolCards: [...s.toolCards, card] }
    }
    case 'breach.detected':
      return { ...s, logo: { state: 'breach', at: now } }
    case 'round.breach_scored':
      return {
        ...s,
        chart: { ...s.chart, [r]: { ...point(s, r), breach: d.breach_rate } },
        progress: advance(s, r, d.breach_rate > 0 ? 'patch' : 'done', { breachRate: d.breach_rate }),
      }
    case 'patch.proposed':
      return {
        ...s,
        patches: [...s.patches, { ...(d as PatchProposed), round: r }],
        configsVersion: s.configsVersion + 1,
        progress: advance(s, r, 'audit', { attempts: d.attempt ?? progressOf(s, r).attempts + 1 }),
      }
    case 'audit.result': {
      const audit = d as AuditResult
      const patches = s.patches.map((p) =>
        p.candidate_version === audit.candidate_version && p.attempt === audit.attempt && p.round === r ? { ...p, audit } : p,
      )
      const pt = point(s, r)
      const chart =
        audit.decision === 'veto'
          ? { ...s.chart, [r]: { ...pt, vetoed: [...pt.vetoed, { attempt: audit.attempt, utility: audit.utility?.score ?? null, reasons: audit.reasons }] } }
          : { ...s.chart, [r]: { ...pt, utility: audit.utility?.score ?? null } }
      const pr = progressOf(s, r)
      const progress =
        audit.decision === 'veto' ? advance(s, r, 'patch', { vetoes: pr.vetoes + 1 }) : advance(s, r, 'done')
      return { ...s, patches, chart, progress }
    }
    case 'patch.applied':
      return { ...s, deployedVersion: d.version, logo: { state: 'secured', at: now }, configsVersion: s.configsVersion + 1 }
    case 'round.scored':
      return { ...s, rounds: { ...s.rounds, [r]: d as RoundSummary }, progress: advance(s, r, 'done') }
    case 'report.ready':
      return { ...s, reportReady: true }
    case 'run.completed':
      return { ...s, final: d as RunCompleted, status: 'completed', logo: { state: 'secured', at: now }, configsVersion: s.configsVersion + 1 }
    case 'band.error':
      return { ...s, bandErrors: s.bandErrors + 1 }
    case 'error':
      return { ...s, errors: [...s.errors, String(d.detail)], status: d.fatal ? (d.detail === 'stopped' ? 'stopped' : 'failed') : s.status }
    default:
      return s
  }
}

export function useRun(onEvent?: (ev: KavachEvent) => void) {
  const [state, dispatch] = useReducer(reduce, emptyRun)
  const source = useRef<EventSource | null>(null)
  const listener = useRef(onEvent)
  useEffect(() => {
    listener.current = onEvent
  })
  const seen = useRef(-1)
  const demo = useRef<{ run: DemoRun; events: KavachEvent[]; cancel: () => void } | null>(null)

  const stopDemo = () => {
    demo.current?.cancel()
    demo.current = null
  }

  const attach = (runId: string, mode: 'live' | 'replay') => {
    source.current?.close()
    stopDemo()
    dispatch({ type: 'reset', runId, mode })
    seen.current = -1
    const es = new EventSource(api.eventsUrl(runId))
    source.current = es
    const onMessage = (msg: MessageEvent) => {
      let ev: KavachEvent
      try {
        ev = JSON.parse(msg.data) as KavachEvent
      } catch {
        return
      }
      dispatch({ type: 'event', ev })
      if (ev.seq > seen.current) {
        seen.current = ev.seq
        listener.current?.(ev)
      }
    }
    es.onmessage = onMessage
    const types = [
      'run.started', 'band.room', 'round.started', 'agent.message', 'recon.dossier', 'attack.launched', 'target.response',
      'toolcall.intercepted', 'breach.detected', 'round.breach_scored', 'monitor.report', 'patch.proposed', 'audit.result',
      'patch.applied', 'round.scored', 'report.ready', 'run.completed', 'band.error', 'error',
    ]
    types.forEach((t) => es.addEventListener(t, onMessage as EventListener))
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) dispatch({ type: 'closed' })
    }
  }

  /** Play a recorded run bundled with the static build (no API). */
  const attachDemo = async (name: string, speed = 1.5) => {
    source.current?.close()
    stopDemo()
    const run = await loadDemo(name)
    dispatch({ type: 'reset', runId: `demo-${run.name}`, mode: 'demo' })
    const events: KavachEvent[] = []
    const cancel = playDemo(
      run,
      speed,
      (ev) => {
        events.push(ev)
        dispatch({ type: 'event', ev })
        listener.current?.(ev)
      },
      () => dispatch({ type: 'closed' }),
    )
    demo.current = { run, events, cancel }
  }

  /** In demo mode the patch panel and the report come from the recording instead of the API. */
  const demoData = () =>
    demo.current
      ? { configs: configsSoFar(demo.current.run, demo.current.events), reportMd: demo.current.run.reportMd }
      : null

  useEffect(
    () => () => {
      source.current?.close()
      demo.current?.cancel()
    },
    [],
  )
  useEffect(() => {
    if (state.status === 'completed' || state.status === 'failed' || state.status === 'stopped') source.current?.close()
  }, [state.status])

  return { state, attach, attachDemo, demoData }
}
