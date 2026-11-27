import { KavachLogo } from '@kavach/brand'
import { Check, ChevronLeft, ChevronRight, Expand, Radio, Undo2, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { AGENTS, avatar, callLabel, pct, TECHNIQUE_LABEL } from '@/lib/format'
import type { AgentName } from '@/lib/types'
import type { Moment, RunView } from '@/lib/useRun'
import { cn } from '@/lib/utils'
import { markOf, verdictOf } from '@/lib/story'
import { Stamp } from './panel'

type Tone = 'attack' | 'defend' | 'secure' | 'verdict'
const toneOf = (m: Moment): Tone => (m.tone === 'neutral' ? 'defend' : m.tone)

function Kicker({ children }: { children: ReactNode }) {
  return <p className="text-[clamp(14px,1.4vw,20px)] font-medium text-kv-faint">{children}</p>
}
function Title({ children }: { children: ReactNode }) {
  return <h1 className="mt-3 max-w-[22ch] font-display text-[clamp(34px,5vw,76px)] leading-[1.05] font-semibold tracking-[-0.02em] text-kv-text">{children}</h1>
}
function Big({ children, tone }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={cn(
        'font-mono text-[clamp(48px,8vw,128px)] leading-none font-semibold',
        tone === 'attack' && 'text-kv-attack',
        tone === 'secure' && 'text-kv-secure',
        tone === 'defend' && 'text-kv-defend',
        tone === 'verdict' && 'text-kv-verdict',
      )}
    >
      {children}
    </span>
  )
}
function BigStamp({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <Stamp tone={tone} className="text-[clamp(18px,2.2vw,34px)]">{children}</Stamp>
}

function Intro({ run }: { run: RunView }) {
  const model = run.targetModel === 'fake' ? 'a scripted target (simulated run)' : run.targetModel?.split('/').pop()
  return (
    <div className="flex flex-col items-start">
      <KavachLogo size={64} state="idle" wordmark />
      <Title>Seven AI agents. One room. One support bot that can issue refunds.</Title>
      <p className="mt-5 max-w-3xl text-[clamp(16px,1.7vw,24px)] leading-snug text-kv-muted">
        Red attacks, blue hardens, code keeps score{model ? `. Victim model: ${model}` : ''}.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        {(Object.keys(AGENTS) as AgentName[]).map((a) => (
          <figure key={a} className="flex flex-col items-center gap-2">
            <img
              src={avatar(a)}
              alt=""
              className={cn('size-[clamp(56px,7vw,104px)] rounded-full bg-kv-surface ring-4', AGENTS[a].squad === 'red' ? 'ring-kv-attack/70' : AGENTS[a].squad === 'blue' ? 'ring-kv-defend/70' : 'ring-kv-verdict/70')}
            />
            <figcaption className="text-[clamp(12px,1.1vw,16px)] font-medium text-kv-muted">{AGENTS[a].name}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

function Slide({ run, m }: { run: RunView; m: Moment }) {
  const [busy, setBusy] = useState(false)
  switch (m.kind) {
    case 'start':
      return <Intro run={run} />
    case 'breach': {
      const card = run.toolCards.find((c) => c.ref === m.ref && c.verdict === 'breach')
      const attack = m.ref ? run.attacks[m.ref] : undefined
      return (
        <div>
          <BigStamp tone="attack">BREACH</BigStamp>
          <Title>{m.title.replace(/^First breach of round \d+: /, '').replace(/^./, (c) => c.toUpperCase())}</Title>
          {card?.record && <p className="mt-6 font-mono text-[clamp(18px,2.4vw,36px)] text-kv-attack">{callLabel(card.record)}</p>}
          {attack && (
            <blockquote className="mt-6 max-w-4xl border-l-4 border-kv-attack/50 pl-5 text-[clamp(15px,1.5vw,22px)] leading-snug text-kv-muted">
              <span className="mb-1 block text-[0.8em] font-medium text-kv-faint">
                {AGENTS[attack.agent as AgentName]?.name ?? attack.agent}, {TECHNIQUE_LABEL(attack.technique)}
              </span>
              “{attack.message.length > 240 ? `${attack.message.slice(0, 240)}…` : attack.message}”
            </blockquote>
          )}
          <p className="mt-6 text-[clamp(14px,1.3vw,20px)] text-kv-faint">Round {m.round}. Caught by code, read from the tool-call log.</p>
        </div>
      )
    }
    case 'patch': {
      const p = run.patches.find((x) => x.config_key === m.ref)
      const lines = p?.policy_changes?.length ? p.policy_changes : (p?.changelog ?? [])
      return (
        <div>
          <Kicker>The Patcher's fix</Kicker>
          <Title>{m.title.replace('The Patcher proposes ', 'Candidate ')}</Title>
          <ul className="mt-6 space-y-2 font-mono text-[clamp(16px,2vw,30px)] text-kv-defend">
            {lines.slice(0, 5).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <p className="mt-6 text-[clamp(14px,1.3vw,20px)] text-kv-faint">Guard policy enforced at the tool, plus a new system prompt.</p>
        </div>
      )
    }
    case 'veto':
      return (
        <div>
          <BigStamp tone="attack">VETOED</BigStamp>
          <Title>{m.title}</Title>
          {m.detail && <p className="mt-6 max-w-4xl font-mono text-[clamp(15px,1.7vw,26px)] leading-snug text-kv-attack">{m.detail}</p>}
          <p className="mt-6 text-[clamp(14px,1.3vw,20px)] text-kv-faint">A patch ships only if real customers still get help.</p>
        </div>
      )
    case 'passed': {
      const audit = run.patches.find((x) => `${x.candidate_version}-a${x.attempt}` === m.ref)?.audit
      return (
        <div>
          <BigStamp tone="secure">PASSED</BigStamp>
          <Title>{m.title}</Title>
          <div className="mt-8 flex flex-wrap gap-x-16 gap-y-6">
            <div>
              <Big tone={audit?.replay.still_breaching ? 'attack' : 'secure'}>
                {audit?.replay.still_breaching ?? 0}/{audit?.replay.total ?? 0}
              </Big>
              <p className="mt-2 text-[clamp(14px,1.3vw,20px)] text-kv-muted">exploits still land on replay</p>
            </div>
            <div>
              <Big tone="secure">{pct(audit?.utility?.score)}</Big>
              <p className="mt-2 text-[clamp(14px,1.3vw,20px)] text-kv-muted">of everyday requests still served</p>
            </div>
          </div>
        </div>
      )
    }
    case 'ask': {
      const live = run.mode === 'live' && run.approval && !run.approval.decided && run.approval.version === m.ref
      const decide = async (d: 'approve' | 'reject') => {
        if (!run.runId || !m.ref) return
        setBusy(true)
        try {
          await api.decideApproval(run.runId, m.ref, d)
        } finally {
          setBusy(false)
        }
      }
      return (
        <div>
          <BigStamp tone="verdict">WAITING FOR A PERSON</BigStamp>
          <Title>{m.ref} passed the Auditor. Should it ship?</Title>
          {live ? (
            <div className="mt-8 flex flex-wrap gap-4">
              <button type="button" disabled={busy} onClick={() => decide('approve')} className="inline-flex items-center gap-3 rounded-xl bg-kv-secure px-8 py-4 text-[clamp(18px,2vw,28px)] font-semibold text-kv-surface hover:opacity-90 disabled:opacity-60">
                <Check className="size-7" /> Approve {m.ref}
              </button>
              <button type="button" disabled={busy} onClick={() => decide('reject')} className="inline-flex items-center gap-3 rounded-xl border-2 border-kv-attack px-8 py-4 text-[clamp(18px,2vw,28px)] font-semibold text-kv-attack hover:bg-kv-attack-soft disabled:opacity-60">
                <Undo2 className="size-7" /> Reject {m.ref}
              </button>
            </div>
          ) : (
            <p className="mt-6 font-mono text-[clamp(16px,2vw,30px)] text-kv-text">@Referee approve {m.ref}</p>
          )}
          <p className="mt-6 text-[clamp(14px,1.3vw,20px)] text-kv-faint">Reply in the Band room or decide here. {m.detail}.</p>
        </div>
      )
    }
    case 'decided':
      return (
        <div>
          <BigStamp tone={toneOf(m)}>{markOf(m)}</BigStamp>
          <Title>{m.title}</Title>
          {m.detail && <p className="mt-6 max-w-4xl text-[clamp(18px,2vw,30px)] leading-snug text-kv-muted">“{m.detail}”</p>}
          {m.decision === 'reject' && <p className="mt-6 text-[clamp(14px,1.3vw,20px)] text-kv-faint">The reason goes back to the Patcher for its next attempt.</p>}
        </div>
      )
    case 'deployed':
      return (
        <div>
          <BigStamp tone="secure">DEPLOYED</BigStamp>
          <Title>{m.title}</Title>
          {m.detail && <p className="mt-6 text-[clamp(18px,2vw,30px)] text-kv-muted">{m.detail}.</p>}
        </div>
      )
    case 'round': {
      const r = m.round != null ? run.rounds[m.round] : undefined
      return (
        <div>
          <BigStamp tone={toneOf(m)}>{markOf(m)}</BigStamp>
          <Title>Round {m.round}</Title>
          <div className="mt-6">
            <Big tone={r && r.breaching > 0 ? 'attack' : 'secure'}>
              {r?.breaching ?? 0} of {r?.total_attacks ?? 0}
            </Big>
            <p className="mt-2 text-[clamp(16px,1.6vw,24px)] text-kv-muted">attacks landed. {m.detail}.</p>
          </div>
        </div>
      )
    }
    case 'verdict': {
      const rounds = Object.values(run.rounds).sort((a, b) => a.round - b.round)
      const v = verdictOf(run)
      return (
        <div>
          {v && <BigStamp tone={v.tone}>{v.word}</BigStamp>}
          <Title>Breach rate, round by round</Title>
          <p className="mt-6 flex flex-wrap items-baseline gap-x-4">
            {rounds.map((r, i) => (
              <span key={r.round} className="flex items-baseline gap-x-4">
                {i > 0 && <span className="font-mono text-[clamp(28px,4vw,64px)] text-kv-faint">→</span>}
                <Big tone={r.breach_rate > 0 ? 'attack' : 'secure'}>{pct(r.breach_rate)}</Big>
              </span>
            ))}
          </p>
          {m.detail && <p className="mt-6 text-[clamp(16px,1.6vw,24px)] text-kv-muted">{m.detail}</p>}
        </div>
      )
    }
    case 'report': {
      const owasp = run.final?.owasp_breakdown ?? {}
      return (
        <div>
          <Kicker>Every run ends with</Kicker>
          <Title>An audit report your team can read</Title>
          <ul className="mt-6 flex flex-wrap gap-x-10 gap-y-3">
            {Object.entries(owasp).map(([k, v]) => (
              <li key={k} className="font-mono text-[clamp(18px,2vw,30px)]">
                <span className="text-kv-faint">{k}</span> <span className="font-semibold text-kv-text">{v}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[clamp(14px,1.3vw,20px)] text-kv-faint">Findings by OWASP LLM Top 10 risk, every round, every patch.</p>
        </div>
      )
    }
  }
}

/** Full-screen slides that follow the run as it happens, or step through it by hand. For a projector. */
export function PresentMode({ run, onExit }: { run: RunView; onExit: () => void }) {
  const slides = run.moments
  const total = slides.length + 1 // the intro first
  const [index, setIndex] = useState(total - 1)
  const [follow, setFollow] = useState(true)
  const shown = follow ? total - 1 : Math.min(index, total - 1)

  const step = useCallback(
    (d: number) => {
      setFollow(false)
      setIndex((i) => Math.max(0, Math.min(total - 1, (follow ? total - 1 : i) + d)))
    },
    [follow, total],
  )

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit()
      else if (e.key === 'ArrowRight' || e.key === 'PageDown') step(1)
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') step(-1)
      else if (e.key === ' ') {
        e.preventDefault()
        setFollow((f) => !f)
      } else if (e.key.toLowerCase() === 'f') document.documentElement.requestFullscreen?.().catch(() => undefined)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [onExit, step])

  const m = shown === 0 ? null : slides[shown - 1]
  const running = run.status === 'running'

  return (
    <div role="dialog" aria-modal="true" aria-label="Present mode" className="fixed inset-0 z-50 flex flex-col bg-kv-bg">
      <div className="kv-band h-4 border-b border-kv-border" aria-hidden />
      <header className="flex items-center gap-4 px-[4vw] py-4">
        <KavachLogo size={30} state={running ? 'attack' : 'secured'} wordmark />
        <span className="text-[14px] text-kv-faint">{run.runId ? (run.mode === 'demo' ? 'Recorded run' : `Run ${run.runId.replace(/^kv-/, '')}`) : 'No run'}</span>
        <span className="ml-auto flex items-center gap-2">
          {running && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-kv-attack-soft px-3 py-1 text-[13px] font-semibold text-kv-attack">
              <Radio className="size-3.5 animate-pulse" /> Live, round {run.currentRound || 1}
            </span>
          )}
          <button type="button" onClick={() => document.documentElement.requestFullscreen?.().catch(() => undefined)} className="rounded-lg p-2 text-kv-faint hover:bg-kv-surface hover:text-kv-text" aria-label="Full screen">
            <Expand className="size-5" />
          </button>
          <button type="button" onClick={onExit} className="rounded-lg p-2 text-kv-faint hover:bg-kv-surface hover:text-kv-text" aria-label="Leave present mode">
            <X className="size-5" />
          </button>
        </span>
      </header>
      <main className="flex min-h-0 flex-1 items-center overflow-y-auto px-[6vw] py-6" aria-live="polite">
        <motion.div
          key={m?.seq ?? 'intro'}
          className="w-full"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {m ? <Slide run={run} m={m} /> : <Intro run={run} />}
        </motion.div>
      </main>
      <footer className="flex flex-wrap items-center gap-4 border-t border-kv-border px-[4vw] py-3 text-[13px] text-kv-faint">
        <button type="button" onClick={() => step(-1)} className="rounded-lg p-1.5 hover:bg-kv-surface hover:text-kv-text" aria-label="Previous slide">
          <ChevronLeft className="size-5" />
        </button>
        <div className="h-1.5 min-w-32 flex-1 overflow-hidden rounded-full bg-kv-border/70">
          <div className="h-full rounded-full bg-kv-text transition-all duration-500" style={{ width: `${((shown + 1) / total) * 100}%` }} />
        </div>
        <button type="button" onClick={() => step(1)} className="rounded-lg p-1.5 hover:bg-kv-surface hover:text-kv-text" aria-label="Next slide">
          <ChevronRight className="size-5" />
        </button>
        <span className="font-mono">
          {shown + 1} / {total}
        </span>
        <button
          type="button"
          onClick={() => setFollow((f) => !f)}
          className={cn('rounded-full px-3 py-1 font-medium', follow ? 'bg-kv-text text-kv-surface' : 'bg-kv-surface text-kv-muted ring-1 ring-kv-border-strong')}
        >
          {follow ? 'Following the run' : 'Follow the run'}
        </button>
        <span className="hidden lg:inline">← → step · Space follow · F full screen · Esc leave</span>
      </footer>
    </div>
  )
}
