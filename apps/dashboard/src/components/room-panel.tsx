import { MessagesSquare } from 'lucide-react'
import { motion } from 'motion/react'
import { createRef, Fragment, type RefObject, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatedBeam } from '@/components/ui/animated-beam'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AGENTS, avatar } from '@/lib/format'
import type { AgentMessage, AgentName } from '@/lib/types'
import type { RunView } from '@/lib/useRun'
import { useStickyScroll } from '@/lib/useStickyScroll'
import { cn } from '@/lib/utils'
import { JumpPill } from './jump-pill'
import { Empty, Panel, Stamp } from './panel'

const ORDER: AgentName[] = ['recon', 'injection', 'social', 'referee', 'monitor', 'patcher', 'auditor']
const TONE = {
  red: 'text-kv-attack',
  blue: 'text-kv-defend',
  neutral: 'text-kv-verdict',
} as const
const RING = {
  red: 'ring-kv-attack',
  blue: 'ring-kv-defend',
  neutral: 'ring-kv-verdict',
} as const
const BEAM = {
  red: ['#c8203f', '#ef7f93'],
  blue: ['#0b6e7f', '#5fb8c6'],
  neutral: ['#9a6a0e', '#d7aa52'],
} as const
const NAME_TO_AGENT: Record<string, AgentName> = Object.fromEntries(
  (Object.keys(AGENTS) as AgentName[]).map((a) => [AGENTS[a].name.toLowerCase(), a]),
)

/** Leading status emoji from the backend ("🛰️ Dossier: …") is replaced by the seal and stamps here. */
function clean(text: string) {
  return text.replace(/^(\p{Extended_Pictographic}|️|‍|\s)+/u, '')
}

function verdict(text: string) {
  if (text.startsWith('✅')) return 'approved' as const
  if (text.startsWith('⛔')) return 'vetoed' as const
  return null
}

function Text({ text }: { text: string }) {
  const parts = clean(text)
    .replace(/^(APPROVED|VETOED):\s*/, '')
    .split(/(@[A-Za-z][\w-]*(?: Engineer)?|`[^`]+`)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} className="font-semibold text-kv-defend">
            {part}
          </span>
        ) : part.startsWith('`') ? (
          <code key={i} className="font-mono text-[12.5px]">
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

/** The next agent a message hands off to: its first @mention, else the agent named in the mentions list. */
function target(m: AgentMessage): AgentName | null {
  for (const raw of m.mentions) {
    const key = raw.toLowerCase()
    if (key in AGENTS) return key as AgentName
    if (NAME_TO_AGENT[key]) return NAME_TO_AGENT[key]
  }
  return null
}

/** Seven seals in a row; a beam travels from whoever just spoke to whoever they @mentioned. */
function Handoffs({
  last,
  speaking,
  only,
  onOnly,
}: {
  last: AgentMessage | null
  speaking: AgentName | null
  only: AgentName | null
  onOnly: (a: AgentName | null) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const refs = useMemo(
    () => Object.fromEntries(ORDER.map((a) => [a, createRef<HTMLDivElement>()])) as Record<AgentName, RefObject<HTMLDivElement | null>>,
    [],
  )
  const to = last ? target(last) : null
  const from = last?.agent ?? null
  const tone = from ? AGENTS[from].squad : 'neutral'

  return (
    <div ref={box} className="relative flex items-end justify-between gap-1 border-b border-kv-border bg-kv-surface-2/60 px-4 pt-3 pb-2">
      {ORDER.map((a) => {
        const meta = AGENTS[a]
        return (
          <Tooltip key={a}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onOnly(only === a ? null : a)}
                aria-pressed={only === a}
                className={cn(
                  'z-10 flex w-12 flex-col items-center gap-1 rounded-lg pt-0.5 pb-1 transition-opacity focus-visible:outline-2 focus-visible:outline-kv-defend',
                  only && only !== a && 'opacity-40 hover:opacity-80',
                )}
              >
                <div
                  ref={refs[a]}
                  className={cn(
                    'grid size-9 place-items-center rounded-full border border-kv-border-strong bg-kv-surface transition-all duration-300',
                    speaking === a && cn('scale-110 ring-2 ring-offset-2 ring-offset-kv-surface-2', RING[meta.squad]),
                  )}
                >
                  <img src={avatar(a)} alt="" className="size-7 rounded-full" />
                </div>
                <span
                  className={cn(
                    'text-[10.5px] leading-none',
                    speaking === a || only === a ? cn('font-semibold', TONE[meta.squad]) : 'text-kv-faint',
                  )}
                >
                  {meta.name.split(' ')[0]}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {meta.name}, {meta.role}. {only === a ? 'Show everyone' : 'Show only this agent'}
            </TooltipContent>
          </Tooltip>
        )
      })}
      {from && to && from !== to && (
        <AnimatedBeam
          key={last?.seq}
          containerRef={box}
          fromRef={refs[from]}
          toRef={refs[to]}
          curvature={-38}
          startYOffset={-6}
          endYOffset={-6}
          duration={1.6}
          repeat={1}
          pathColor="#94b0a3"
          pathOpacity={0.35}
          pathWidth={1.5}
          gradientStartColor={BEAM[tone][0]}
          gradientStopColor={BEAM[tone][1]}
        />
      )}
    </div>
  )
}

function Message({ m, first }: { m: AgentMessage; first: boolean }) {
  const meta = AGENTS[m.agent]
  const v = verdict(m.text)
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={cn('grid grid-cols-[2.25rem_1fr] gap-x-3 px-4', first ? 'pt-3' : 'pt-0.5')}
    >
      <div>{first && <img src={avatar(m.agent)} alt="" className="size-9 rounded-full border border-kv-border bg-kv-surface" />}</div>
      <div className="min-w-0">
        {first && (
          <p className="flex items-baseline gap-2">
            <span className={cn('text-[14px] font-semibold', TONE[meta.squad])}>{meta.name}</span>
            <span className="text-[11.5px] text-kv-faint">{meta.role}</span>
          </p>
        )}
        <p className="text-[14px] leading-[1.55] break-words text-kv-text">
          {v && (
            <Stamp tone={v === 'approved' ? 'secure' : 'attack'} className="mr-2 align-[1px]">
              {v === 'approved' ? 'APPROVED' : 'VETOED'}
            </Stamp>
          )}
          <Text text={m.text} />
        </p>
      </div>
    </motion.li>
  )
}

/** Who spoke in the last couple of seconds. */
function useSpeaking(speaker: RunView['speaker']) {
  const [active, setActive] = useState<AgentName | null>(null)
  useEffect(() => {
    if (!speaker) return
    setActive(speaker.agent)
    const t = setTimeout(() => setActive(null), 2400)
    return () => clearTimeout(t)
  }, [speaker])
  return active
}

export function RoomPanel({ run }: { run: RunView }) {
  const [only, setOnly] = useState<AgentName | null>(null)
  const messages = only ? run.messages.filter((m) => m.agent === only) : run.messages
  const { box, behind, jump } = useStickyScroll(messages.length)
  const speaking = useSpeaking(run.speaker)
  const last = run.messages[run.messages.length - 1] ?? null

  return (
    <Panel
      title="The Kavach room"
      hint="Every handoff is a message that @mentions the next agent"
      className="h-full"
      bodyClassName="flex flex-col"
    >
      <Handoffs last={last} speaking={speaking} only={only} onOnly={setOnly} />
      {only && (
        <div className="flex items-center justify-between gap-3 border-b border-kv-border bg-kv-defend-soft/40 px-4 py-1.5 text-[12.5px]">
          <span className="text-kv-muted">
            Showing <b className={TONE[AGENTS[only].squad]}>{AGENTS[only].name}</b> only, {messages.length} message
            {messages.length === 1 ? '' : 's'}
          </span>
          <button type="button" onClick={() => setOnly(null)} className="font-semibold text-kv-defend hover:underline">
            Show everyone
          </button>
        </div>
      )}
      <div className="relative min-h-0 flex-1">
        <div ref={box} className="kv-ruled h-full overflow-y-auto pb-4">
          {messages.length === 0 ? (
            <Empty icon={<MessagesSquare className="size-5" />} title="The room is quiet">
              Start a live run or replay a recorded one. The Referee opens the room, then Recon speaks.
            </Empty>
          ) : (
            <ul>
              {messages.map((m, i) => {
                const prev = messages[i - 1]
                const newRound = m.round != null && m.round !== prev?.round
                return (
                  <Fragment key={m.seq}>
                    {newRound && (
                      <li className="flex items-center gap-3 px-4 pt-4 pb-1">
                        <span className="h-px flex-1 bg-kv-border-strong/60" />
                        <span className="font-display text-[14px] text-kv-muted">Round {m.round}</span>
                        <span className="h-px flex-1 bg-kv-border-strong/60" />
                      </li>
                    )}
                    <Message m={m} first={newRound || !prev || prev.agent !== m.agent} />
                  </Fragment>
                )
              })}
            </ul>
          )}
        </div>
        <JumpPill count={behind} noun="message" onJump={jump} />
      </div>
    </Panel>
  )
}
