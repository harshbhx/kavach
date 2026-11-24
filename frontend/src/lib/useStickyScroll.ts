import { useLayoutEffect, useRef } from 'react'

/** Keeps a scroll container pinned to the bottom as items arrive, unless the viewer scrolled up.
 *  Scrolls the container itself (never the page), so phones and narrow windows don't jump. */
export function useStickyScroll(deps: unknown[]) {
  const box = useRef<HTMLDivElement>(null)
  const pinned = useRef(true)

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const onScroll = () => {
      pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useLayoutEffect(() => {
    const el = box.current
    if (el && pinned.current) el.scrollTop = el.scrollHeight
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return box
}
