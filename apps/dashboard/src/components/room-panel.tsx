import { MessagesSquare } from 'lucide-react'
import { motion } from 'motion/react'
import { Fragment, useEffect, useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AGENTS, avatar } from '@/lib/format'
import type { AgentMessage, AgentName } from '@/lib/types'
import type { RunView } from '@/lib/useRun'
import { useStickyScroll } from '@/lib/useStickyScroll'
import { cn } from '@/lib/utils'
import { Empty, Panel } from './panel'

const ORDER: AgentName[] = ['recon', 'injection', 'social', 'monitor', 'patcher', 'auditor', 'referee']
const TONE = { red: 'text-kv-attack', blue: 'text-kv-defend', neutral: 'text-kv-verdict' } as const
const RING = { red: 'ring-kv-attack', blue: 'ring-kv-defend', neutral: 'ring-kv-verdict' } as const

/** Leading status emoji from the backend ("🛰️ Dossier: …") is replaced by the avatar and badges here. */
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
          <span key={i} className="rounded bg-kv-brand-soft px-1 font-medium text-kv-brand-hover">
            {part}
          </span>
        ) : part.startsWith('`') ? (
          <code key={i} className="font-mono text-[12px] text-kv-text">
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

function Message({ m, first }: { m: AgentMessage; first: boolean }) {
  const meta = AGENTS[m.agent]
  const v = verdict(m.text)
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn('flex gap-3 px-4', first ? 'pt-3' : 'pt-1')}
    >
      <div className="w-8 shrink-0">{first && <img src={avatar(m.agent)} alt="" className="size-8 rounded-full" />}</div>
      <div className="min-w-0 flex-1">
        {first && (
          <div className="mb-0.5 flex items-baseline gap-2">
            <span className={cn('text-[13px] font-semibold', TONE[meta.squad])}>{meta.name}</span>
            <span className="text-[11px] text-kv-faint">{meta.role}</span>
          </div>
        )}
        <div
          className={cn(
            'rounded-xl px-3 py-2 text-[13px] leading-relaxed break-words text-kv-text/90',
            v === 'approved' && 'border border-kv-secure/30 bg-kv-secure-soft',
            v === 'vetoed' && 'border border-kv-verdict/40 bg-kv-verdict-soft',
            !v && 'bg-kv-surface-2/70',
          )}
        >
          {v && (
            <span className={cn('mr-2 rounded-md px-1.5 py-0.5 text-[11px] font-bold', v === 'approved' ? 'bg-kv-secure text-kv-bg' : 'bg-kv-attack text-white')}>
              {v === 'approved' ? 'Approved' : 'Vetoed'}
            </span>
          )}
          <Text text={m.text} />
        </div>
      </div>
    </motion.li>
  )
}

/** Who spoke in the last couple of seconds glows in the roster. */
function useSpeaking(speaker: RunView['speaker']) {
  const [active, setActive] = useState<AgentName | null>(null)
  useEffect(() => {
    if (!speaker) return
    setActive(speaker.agent)
    const t = setTimeout(() => setActive(null), 2200)
    return () => clearTimeout(t)
  }, [speaker])
  return active
}

export function RoomPanel({ run }: { run: RunView }) {
  const box = useStickyScroll([run.messages.length])
  const speaking = useSpeaking(run.speaker)

  return (
    <Panel
      title="Kavach room"
      hint="Every handoff is a message that @mentions the next agent"
      className="h-full"
      bodyClassName="flex flex-col"
      actions={
        <div className="flex -space-x-1.5">
          {ORDER.map((a) => (
            <Tooltip key={a}>
              <TooltipTrigger asChild>
                <span className="relative">
                  <img
                    src={avatar(a)}
                    alt={AGENTS[a].name}
                    className={cn(
                      'size-6 rounded-full border-2 border-kv-surface transition-all duration-300',
                      speaking === a ? cn('z-10 scale-125 ring-2', RING[AGENTS[a].squad]) : speaking ? 'opacity-40' : '',
                    )}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {AGENTS[a].name}, {AGENTS[a].role}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      }
    >
      <div ref={box} className="min-h-0 flex-1 overflow-y-auto pb-4">
        {run.messages.length === 0 ? (
          <Empty icon={<MessagesSquare className="size-5" />} title="The room is quiet">
            Start a live run or replay a recorded one. Recon speaks first.
          </Empty>
        ) : (
          <ul>
            {run.messages.map((m, i) => {
              const prev = run.messages[i - 1]
              const newRound = m.round != null && m.round !== prev?.round
              return (
                <Fragment key={m.seq}>
                  {newRound && (
                    <li className="flex items-center gap-3 px-4 pt-4 pb-1 text-[11px] font-medium text-kv-faint">
                      <span className="h-px flex-1 bg-kv-border" />
                      Round {m.round}
                      <span className="h-px flex-1 bg-kv-border" />
                    </li>
                  )}
                  <Message m={m} first={newRound || !prev || prev.agent !== m.agent} />
                </Fragment>
              )
            })}
          </ul>
        )}
      </div>
    </Panel>
  )
}
