import { useEffect, useReducer, useRef } from 'react'
import { api } from './api'
import { configsSoFar, loadDemo, playDemo, type DemoRun } from './demo'
import type {
  AgentMessage,
  ApprovalDecided,
  ApprovalRequested,
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

/** One line of the run's story: what a person would point at when telling it. Derived from events, in order. */
export interface Moment {
  seq: number
  /** ms since the run started */
  t: number
  round: number | null
  kind: 'start' | 'breach' | 'patch' | 'veto' | 'passed' | 'ask' | 'decided' | 'deployed' | 'round' | 'verdict' | 'report'
  tone: 'attack' | 'defend' | 'secure' | 'verdict' | 'neutral'
  title: string
  detail?: string
  /** attack id, config key or version, so a view can open the thing itself */
  ref?: string
  /** approve | reject for decided moments */
  decision?: 'approve' | 'reject'
}

const RULE_WORDS: Record<string, string> = {
  REFUND_LIMIT_EXCEEDED: 'a refund over ₹500 with no human',
  CROSS_ACCOUNT_ACTION: "an action on another customer's account",
  PII_LEAK: "another customer's PAN or phone in the reply",
  SYSTEM_PROMPT_EXFIL: 'the system prompt leaked',
  COUPON_ABUSE: 'the staff-only coupon applied',
}
const SOURCE_WORDS: Record<string, string> = { band: 'in the Band room', dashboard: 'from the dashboard', api: 'through the API' }
const pctOf = (v: unknown) => (typeof v === 'number' ? `${Math.round(v * 100)}%` : '–')

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
  /** skill packs the run loaded (name@version+digest), from run.started */
  skillPacks: string[]
  /** the patch waiting for a person, or the last decision */
  approval: (ApprovalRequested & { round: number; requestedAt: number; decided?: ApprovalDecided }) | null
  /** every approval this run, oldest first */
  approvals: (ApprovalRequested & { round: number; decided?: ApprovalDecided })[]
  /** the run's story, in order */
  moments: Moment[]
  /** victim model and brain, from run.started */
  targetModel: string | null
  brain: string | null
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
  skillPacks: [],
  approval: null,
  approvals: [],
  moments: [],
  targetModel: null,
  brain: null,
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
  const next = apply(s, a.ev)
  const m = momentOf(s, a.ev)
  return { ...next, moments: m ? [...next.moments, m] : next.moments, lastSeq: a.ev.seq, lastEventAt: Date.now() }
}

/** The story line an event adds, if any. Pure, so the same recording always tells the same story. */
export function momentOf(s: RunView, ev: KavachEvent): Moment | null {
  const d = ev.data as Record<string, any>
  const base = { seq: ev.seq, t: ev.t_rel_ms, round: ev.round }
  switch (ev.type) {
    case 'run.started': {
      const model = typeof d.target_model === 'string' ? d.target_model.split('/').pop() : null
      const agents = d.brain_provider === 'fake' ? 'scripted agents' : d.brain_provider === 'lyzr' ? 'agents on Lyzr' : `agents on ${d.brain_provider ?? '?'}`
      return { ...base, kind: 'start', tone: 'neutral', title: 'Seven agents enter the room', detail: [model && `Victim model ${model}`, agents].filter(Boolean).join(', ') }
    }
    case 'breach.detected': {
      if (s.moments.some((m) => m.kind === 'breach' && m.round === ev.round)) return null // the first breach tells the round
      const words = RULE_WORDS[d.rule_id] ?? d.rule_id
      return { ...base, kind: 'breach', tone: 'attack', title: `First breach of round ${ev.round}: ${words}`, detail: d.evidence, ref: d.attack_id }
    }
    case 'patch.proposed':
      return {
        ...base,
        kind: 'patch',
        tone: 'defend',
        title: `The Patcher proposes ${d.candidate_version}, attempt ${d.attempt}`,
        detail: ((d.policy_changes as string[] | undefined)?.length ? (d.policy_changes as string[]) : ((d.changelog as string[]) ?? [])).slice(0, 3).join('; '),
        ref: d.config_key,
      }
    case 'audit.result':
      return d.decision === 'veto'
        ? { ...base, kind: 'veto', tone: 'attack', title: `The Auditor vetoes ${d.candidate_version}`, detail: d.reasons?.[0], ref: `${d.candidate_version}-a${d.attempt}` }
        : {
            ...base,
            kind: 'passed',
            tone: 'secure',
            title: `${d.candidate_version} passes the Auditor`,
            detail: `${d.replay?.still_breaching ?? 0} of ${d.replay?.total ?? 0} exploits still land on replay, utility ${pctOf(d.utility?.score)}`,
            ref: `${d.candidate_version}-a${d.attempt}`,
          }
    case 'approval.requested':
      return { ...base, kind: 'ask', tone: 'verdict', title: `${d.version} waits for a person`, detail: `No answer in ${Math.round(d.timeout_s)} s means ${d.on_timeout}`, ref: d.version }
    case 'approval.decided': {
      const approve = d.decision === 'approve'
      const who = d.source === 'timeout' ? `No answer, so ${approve ? 'approved' : 'rejected'} by policy` : `${d.by} ${approve ? 'approves' : 'rejects'} ${d.version} ${SOURCE_WORDS[d.source] ?? ''}`.trim()
      return { ...base, kind: 'decided', tone: approve ? 'secure' : 'attack', title: who, detail: d.reason ?? undefined, ref: d.version, decision: approve ? 'approve' : 'reject' }
    }
    case 'patch.applied':
      return { ...base, kind: 'deployed', tone: 'secure', title: `${d.version} deployed`, detail: d.tth_seconds != null ? `Hardened ${Math.round(d.tth_seconds)} s into round ${ev.round}` : undefined, ref: d.version }
    case 'round.scored': {
      const held = d.breaching === 0
      return {
        ...base,
        kind: 'round',
        tone: held ? 'defend' : d.status === 'hardened' ? 'secure' : 'attack',
        title: `Round ${d.round} closes: ${d.breaching} of ${d.total_attacks} attacks landed`,
        detail: held ? `${d.config_attacked} held` : d.status === 'hardened' ? `Hardened to ${d.applied_version}` : 'No patch passed',
      }
    }
    case 'run.completed': {
      const trend = Object.values(s.rounds).sort((a, b) => a.round - b.round).map((r) => pctOf(r.breach_rate)).join(' → ')
      return { ...base, kind: 'verdict', tone: (d.final_breach_rate ?? 0) > 0 ? 'attack' : 'secure', title: `Verdict: breach rate ${trend}`, detail: `Everyday requests still served: ${pctOf(d.final_utility)}. Deployed ${d.deployed_version}.` }
    }
    case 'report.ready':
      return { ...base, kind: 'report', tone: 'neutral', title: 'The audit report is ready' }
    default:
      return null
  }
}

function apply(s: RunView, ev: KavachEvent): RunView {
  const d = ev.data as Record<string, any>
  const r = ev.round ?? s.currentRound
  const now = Date.now()
  switch (ev.type) {
    case 'run.started':
      return {
        ...s,
        status: 'running',
        skillPacks: Array.isArray(d.skill_packs) ? (d.skill_packs as string[]) : [],
        targetModel: typeof d.target_model === 'string' ? d.target_model : null,
        brain: typeof d.brain_provider === 'string' ? d.brain_provider : null,
      }
    case 'approval.requested':
      return {
        ...s,
        approval: { ...(d as ApprovalRequested), round: r, requestedAt: now },
        approvals: [...s.approvals, { ...(d as ApprovalRequested), round: r }],
      }
    case 'approval.decided': {
      const decided = d as ApprovalDecided
      const approvals = s.approvals.map((x, i) => (i === s.approvals.length - 1 && x.version === decided.version && !x.decided ? { ...x, decided } : x))
      return s.approval && s.approval.version === d.version ? { ...s, approvals, approval: { ...s.approval, decided } } : { ...s, approvals }
    }
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
  const demoToken = useRef(0)
  const demo = useRef<{ run: DemoRun; events: KavachEvent[]; cancel: () => void } | null>(null)

  const stopDemo = () => {
    demo.current?.cancel()
    demo.current = null
  }

  const attach = (runId: string, mode: 'live' | 'replay') => {
    demoToken.current++
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
      'patch.applied', 'round.scored', 'report.ready', 'run.completed', 'band.error', 'error', 'approval.requested',
      'approval.decided',
    ]
    types.forEach((t) => es.addEventListener(t, onMessage as EventListener))
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) dispatch({ type: 'closed' })
    }
  }

  /** Play a recorded run bundled with the static build (no API). */
  const attachDemo = async (name: string, speed = 1.5) => {
    const mine = ++demoToken.current
    source.current?.close()
    stopDemo()
    const run = await loadDemo(name)
    if (mine !== demoToken.current) return // a newer pick (or a live attach) took over while this one loaded
    source.current?.close()
    stopDemo()
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
