import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { TextGenerateEffect } from '@/components/ui/text-generate-effect'
import type { KavachEvent } from '@/lib/types'

/**
 * Presenter captions (?narrate=1): one plain sentence for each moment that matters, for screen recordings and
 * live demos with no voice-over. Driven by the same events as the panels.
 */
export function narrationFor(ev: KavachEvent, simulated: boolean): string | null {
  const d = ev.data as Record<string, any>
  switch (ev.type) {
    case 'run.started':
      return `Seven agents, one room. Red attacks DiwaliMart's support bot, blue hardens it, the Referee keeps score.${simulated ? ' (Recorded offline run.)' : ''}`
    case 'recon.dossier':
      return 'Recon maps the bot with harmless questions: what it can do, which limits are soft.'
    case 'attack.launched':
      return ev.round === 1 ? 'Injector and Social Engineer send their attacks: overrides, fake system messages, VIP pressure.' : null
    case 'breach.detected':
      return 'Code reads every tool call. A refund over ₹500 or another customer’s data is a breach, no model involved.'
    case 'patch.proposed':
      return d.attempt === 1 ? 'Patcher rewrites the prompt and the guard policy. The Auditor replays every exploit and ten normal requests.' : null
    case 'audit.result':
      return d.decision === 'veto'
        ? `Vetoed: the patch also refused real customers (utility ${Math.round((d.utility?.score ?? 0) * 100)}%). Try again.`
        : `Approved: 0 exploits land and ${Math.round((d.utility?.score ?? 1) * 100)}% of normal requests still work.`
    case 'round.started':
      return ev.round && ev.round > 1 ? `Round ${ev.round}: new attacks against the patched bot. Base64, spoofed tool output, Hinglish.` : null
    case 'run.completed':
      return `Breach rate ${Math.round((d.final_breach_rate ?? 0) * 100)}% at the end, utility ${Math.round((d.final_utility ?? 0) * 100)}%. The audit report is ready.`
    default:
      return null
  }
}

export function Narration({ latest }: { latest: { text: string; key: number } | null }) {
  const [shown, setShown] = useState(latest)
  useEffect(() => {
    if (latest) setShown(latest)
  }, [latest])
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-7 z-50 flex justify-center px-6">
      <AnimatePresence mode="wait">
        {shown && (
          <motion.div
            key={shown.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl rounded-2xl bg-kv-text/95 px-7 py-4 text-center shadow-[0_24px_60px_-20px_rgb(14_35_28/0.6)]"
          >
            <TextGenerateEffect words={shown.text} duration={0.35} className="text-[23px] leading-snug font-medium text-kv-surface" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
