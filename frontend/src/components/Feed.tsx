import { useStickyScroll } from '../lib/useStickyScroll'
import { AGENTS, SQUAD_COLOR, avatar } from '../lib/format'
import type { AgentMessage } from '../lib/types'

function renderText(text: string) {
  return text.split(/(@[A-Za-z][\w-]*(?: Engineer)?)/g).map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="font-medium text-kv-brand-hover">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

function Badge({ text }: { text: string }) {
  if (text.startsWith('✅')) return <span className="rounded-md bg-kv-secure-soft px-1.5 py-0.5 text-[11px] font-semibold text-kv-secure">APPROVED</span>
  if (text.startsWith('⛔')) return <span className="rounded-md border border-kv-verdict/50 bg-kv-verdict-soft px-1.5 py-0.5 text-[11px] font-semibold text-kv-attack">VETOED</span>
  return null
}

export function Feed({ messages }: { messages: AgentMessage[] }) {
  const box = useStickyScroll([messages.length])

  return (
    <section className="flex min-h-0 flex-col rounded-kv border border-kv-border bg-kv-surface">
      <div className="flex items-center justify-between border-b border-kv-border px-4 py-3">
        <h2 className="text-sm font-semibold">Kavach room</h2>
        <span className="text-xs text-kv-faint">agent-to-agent · mirrored from Band</span>
      </div>
      <div ref={box} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && <p className="pt-10 text-center text-sm text-kv-faint">Start a run to watch the 7 agents talk.</p>}
        {messages.map((m) => {
          const meta = AGENTS[m.agent]
          return (
            <div key={m.seq} className="kv-fade-in flex gap-3">
              <img src={avatar(m.agent)} alt="" className="mt-0.5 h-8 w-8 flex-none rounded-full" />
              <div className="min-w-0 flex-1 border border-kv-border bg-kv-surface-2 px-3 py-2" style={{ borderLeft: `3px solid ${SQUAD_COLOR[meta.squad]}`, borderRadius: '4px 12px 12px 4px' }}>
                <div className="mb-0.5 flex items-center gap-2 text-xs">
                  <span className="font-semibold" style={{ color: SQUAD_COLOR[meta.squad] }}>
                    {meta.name}
                  </span>
                  {m.round && <span className="text-kv-faint">R{m.round}</span>}
                  <Badge text={m.text} />
                </div>
                <p className="text-sm leading-relaxed break-words text-kv-text">{renderText(m.text)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
