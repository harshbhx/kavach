import { Check, ChevronDown, ChevronUp, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { AGENTS, avatar, TECHNIQUE_LABEL } from '@/lib/format'
import { RULE_INFO, STAMP_TONE, stampOf, verdictExplained, verdictLine } from '@/lib/slips'
import type { AgentName, AttackInfo, ToolCard, ToolCallRecord } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Stamp } from './panel'

function callText(c: ToolCallRecord) {
  const args = Object.entries(c.args).map(([k, v]) => `  ${k}=${typeof v === 'string' ? `"${v}"` : String(v)}`)
  return `${c.tool}(\n${args.join(',\n')}\n)`
}

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="border-t border-dotted border-kv-border-strong/70 px-5 py-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-[12.5px] font-semibold text-kv-muted">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true)
          setTimeout(() => setDone(false), 1400)
        })
      }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] text-kv-muted transition-colors hover:bg-kv-surface-2 hover:text-kv-text"
    >
      {done ? <Check className="size-3.5 text-kv-secure" /> : <Copy className="size-3.5" />}
      {done ? 'Copied' : 'Copy'}
    </button>
  )
}

/**
 * Everything about one intercepted tool call: the verdict and the rule behind it, the exact call and what the tool
 * returned, and the attack message that caused it. Opens from a slip; ↑ and ↓ move through the list.
 */
export function SlipSheet({
  cards,
  attacks,
  index,
  onIndex,
}: {
  cards: ToolCard[]
  attacks: Record<string, AttackInfo>
  index: number | null
  onIndex: (i: number | null) => void
}) {
  const card = index != null ? cards[index] : undefined
  const attack = card ? attacks[card.ref] : undefined

  useEffect(() => {
    if (index == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') onIndex(Math.min(cards.length - 1, index + 1))
      if (e.key === 'ArrowUp' || e.key === 'k') onIndex(Math.max(0, index - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, cards.length, onIndex])

  const stamp = card ? stampOf(card) : 'ALLOWED'
  const rule = card?.ruleId ? RULE_INFO[card.ruleId] : undefined
  const agent = attack ? AGENTS[attack.agent as AgentName] : undefined

  return (
    <Sheet open={card != null} onOpenChange={(o) => !o && onIndex(null)}>
      <SheetContent side="right" className="w-full gap-0 border-kv-border-strong bg-kv-surface p-0 sm:max-w-[480px]">
        {card && (
          <>
            <div className="kv-band h-2.5 border-b border-kv-border" aria-hidden />
            <SheetHeader className="gap-2 px-5 pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Stamp tone={STAMP_TONE[stamp]} className="text-[14px]">
                  {stamp}
                </Stamp>
                <span className="font-mono text-[11.5px] text-kv-faint">
                  R{card.round} {card.kind}, guardrail {card.configVersion}
                </span>
              </div>
              <SheetTitle
                className={cn(
                  'font-display text-[20px] leading-snug',
                  card.verdict === 'breach' ? 'text-kv-attack' : card.verdict === 'blocked' ? 'text-kv-defend' : 'text-kv-text',
                )}
              >
                {verdictLine(card)}
              </SheetTitle>
              <SheetDescription className="text-[13.5px] leading-relaxed text-kv-muted">{verdictExplained(card)}</SheetDescription>
              {rule && (
                <span className="w-fit rounded-md border border-kv-border-strong/70 bg-kv-surface-2 px-2 py-0.5 font-mono text-[11.5px] text-kv-muted">
                  OWASP {rule.owasp}
                </span>
              )}
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <Section title="Tool call" aside={card.record && <CopyButton text={callText(card.record)} />}>
                {card.record ? (
                  <>
                    <pre className="overflow-x-auto rounded-lg border border-kv-border bg-kv-surface-2 p-3 font-mono text-[12.5px] leading-relaxed text-kv-text">
                      {callText(card.record)}
                    </pre>
                    <p className="mt-2 text-[12.5px] text-kv-muted">
                      Session <span className="font-mono text-kv-text">{card.record.session_user}</span>,{' '}
                      {card.record.executed ? (
                        <span className="font-semibold text-kv-attack">the tool ran</span>
                      ) : (
                        <span className="font-semibold text-kv-defend">the tool did not run</span>
                      )}
                      .
                    </p>
                  </>
                ) : (
                  <p className="text-[13px] text-kv-muted">No tool was called for this attack.</p>
                )}
              </Section>

              {card.record && Object.keys(card.record.result ?? {}).length > 0 && (
                <Section title="What the tool returned">
                  <pre className="max-h-48 overflow-auto rounded-lg border border-kv-border bg-kv-surface-2 p-3 font-mono text-[12px] leading-relaxed text-kv-muted">
                    {JSON.stringify(card.record.result, null, 2)}
                  </pre>
                </Section>
              )}

              {attack && (
                <Section title="The attack behind it">
                  <div className="flex items-center gap-2.5">
                    <img src={avatar(attack.agent)} alt="" className="size-8 rounded-full border border-kv-border" />
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-kv-attack">{agent?.name ?? attack.agent}</p>
                      <p className="text-[12px] text-kv-faint">{TECHNIQUE_LABEL(attack.technique)}</p>
                    </div>
                  </div>
                  <blockquote className="mt-3 rounded-lg border-l-[3px] border-kv-attack/60 bg-kv-attack-soft/40 py-2.5 pr-3 pl-3.5 text-[13.5px] leading-relaxed text-kv-text">
                    {attack.message}
                  </blockquote>
                  <p className="mt-2 text-[12.5px] text-kv-muted">
                    <span className="text-kv-faint">Goal: </span>
                    {attack.goal}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-kv-faint">
                    {attack.attack_id}, from the {attack.source === 'library' ? 'attack library' : 'agent'}
                  </p>
                </Section>
              )}
            </div>

            <SheetFooter className="flex-row items-center justify-between border-t border-kv-border bg-kv-surface-2/60 px-5 py-3">
              <span className="text-[12.5px] text-kv-faint">
                {index! + 1} of {cards.length}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="mr-1 hidden items-center gap-1 text-[11.5px] text-kv-faint sm:flex">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd>
                </span>
                <Button variant="outline" size="sm" disabled={index === 0} onClick={() => onIndex(index! - 1)} className="border-kv-border-strong bg-kv-surface">
                  <ChevronUp className="size-4" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={index === cards.length - 1}
                  onClick={() => onIndex(index! + 1)}
                  className="border-kv-border-strong bg-kv-surface"
                >
                  Next <ChevronDown className="size-4" />
                </Button>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
