import { useCallback, useLayoutEffect, useRef, useState } from 'react'

/** Keeps a scroll container pinned to the bottom as items arrive, unless the viewer scrolled up.
 *  Scrolls the container itself (never the page), so phones and narrow windows don't jump.
 *  `behind` counts items that arrived while the viewer was reading further up; `jump` returns to the end. */
export function useStickyScroll(count: number) {
  const box = useRef<HTMLDivElement>(null)
  const pinned = useRef(true)
  const last = useRef(count)
  const [behind, setBehind] = useState(0)

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const onScroll = () => {
      pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
      if (pinned.current) setBehind(0)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useLayoutEffect(() => {
    const el = box.current
    const added = count - last.current
    last.current = count
    if (!el) return
    if (pinned.current || added < 0) el.scrollTop = el.scrollHeight
    else if (added > 0) setBehind((b) => b + added)
  }, [count])

  const jump = useCallback(() => {
    const el = box.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    pinned.current = true
    setBehind(0)
  }, [])

  return { box, behind, jump }
}
