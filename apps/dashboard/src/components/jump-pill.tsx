import { ArrowDown } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

/** Shown when new items arrive while the viewer is reading further up. */
export function JumpPill({ count, noun, onJump }: { count: number; noun: string; onJump: () => void }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          type="button"
          onClick={onJump}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-kv-text px-3.5 py-1.5 text-[12.5px] font-semibold text-kv-surface shadow-[0_10px_24px_-10px_rgb(14_35_28/0.7)] hover:bg-kv-defend"
        >
          <ArrowDown className="size-3.5" />
          {count} new {noun}
          {count === 1 ? '' : 's'}
        </motion.button>
      )}
    </AnimatePresence>
  )
}
