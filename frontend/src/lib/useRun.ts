import { useEffect, useReducer, useRef } from 'react'
import { api } from './api'
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

export interface ChartPoint {
  round: number
  breach: number | null
  utility: number | null
  vetoed: { attempt: number; utility: number | null; reasons: string[] }[]
}

export interface RunView {
  runId: string | null
  mode: 'live' | 'replay' | null
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
}

type Action = { type: 'reset'; runId: string; mode: 'live' | 'replay' } | { type: 'event'; ev: KavachEvent } | { type: 'closed' }

const point = (s: RunView, round: number): ChartPoint => s.chart[round] ?? { round, breach: null, utility: null, vetoed: [] }

function reduce(s: RunView, a: Action): RunView {
  if (a.type === 'reset') return { ...emptyRun, runId: a.runId, mode: a.mode, status: 'running' }
  if (a.type === 'closed') return s.status === 'running' ? { ...s, status: s.final ? 'completed' : s.status } : s
  if (a.ev.seq <= s.lastSeq) return s // EventSource reconnects replay history; drop duplicates
  return { ...apply(s, a.ev), lastSeq: a.ev.seq }
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
      return { ...s, currentRound: r, logo: { state: 'attack', at: now } }
    case 'agent.message':
      return {
        ...s,
        messages: [
          ...s.messages,
          { seq: ev.seq, round: ev.round, agent: d.agent as AgentName, squad: d.squad as Squad, text: d.text, mentions: d.mentions ?? [] },
        ],
      }
    case 'attack.launched':
      return { ...s, attacks: { ...s.attacks, [d.attack_id]: d as AttackInfo }, logo: { state: 'attack', at: now } }
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
      return { ...s, chart: { ...s.chart, [r]: { ...point(s, r), breach: d.breach_rate } } }
    case 'patch.proposed':
      return { ...s, patches: [...s.patches, { ...(d as PatchProposed), round: r }], configsVersion: s.configsVersion + 1 }
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
      return { ...s, patches, chart }
    }
    case 'patch.applied':
      return { ...s, deployedVersion: d.version, logo: { state: 'secured', at: now }, configsVersion: s.configsVersion + 1 }
    case 'round.scored':
      return { ...s, rounds: { ...s.rounds, [r]: d as RoundSummary } }
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

export function useRun() {
  const [state, dispatch] = useReducer(reduce, emptyRun)
  const source = useRef<EventSource | null>(null)

  const attach = (runId: string, mode: 'live' | 'replay') => {
    source.current?.close()
    dispatch({ type: 'reset', runId, mode })
    const es = new EventSource(api.eventsUrl(runId))
    source.current = es
    const onMessage = (msg: MessageEvent) => {
      try {
        dispatch({ type: 'event', ev: JSON.parse(msg.data) as KavachEvent })
      } catch {
        /* ignore malformed */
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

  useEffect(() => () => source.current?.close(), [])
  useEffect(() => {
    if (state.status === 'completed' || state.status === 'failed' || state.status === 'stopped') source.current?.close()
  }, [state.status])

  return { state, attach }
}
