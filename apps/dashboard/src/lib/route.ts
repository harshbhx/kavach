import { useEffect, useState } from 'react'

/** The dashboard's views, addressed by the URL hash (#/room) so a link or a refresh keeps the place. */
export const VIEWS = ['overview', 'room', 'attacks', 'patches', 'report', 'models'] as const
export type View = (typeof VIEWS)[number] | 'present'

function read(): View {
  const v = window.location.hash.replace(/^#\/?/, '').split(/[?/]/)[0]
  if (v === 'present') return 'present'
  return (VIEWS as readonly string[]).includes(v) ? (v as View) : 'overview'
}

export function useView(): [View, (v: View) => void] {
  const [view, setView] = useState<View>(() => (new URLSearchParams(window.location.search).get('present') === '1' ? 'present' : read()))
  useEffect(() => {
    const on = () => setView(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const go = (v: View) => {
    if (v === view) return
    window.location.hash = `/${v}`
    setView(v)
  }
  return [view, go]
}
