import { Fragment, type ReactNode } from 'react'

/**
 * A small Markdown renderer for Kavach's own audit report (backend/kavach/report/markdown.py): headings, paragraphs,
 * tables, lists, code blocks, bold, italics, inline code and links. It renders text only, never raw HTML.
 */
function inline(text: string, key = 0): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    const k = `${key}-${i++}`
    if (t.startsWith('**')) out.push(<strong key={k} className="font-semibold text-kv-text">{t.slice(2, -2)}</strong>)
    else if (t.startsWith('`')) out.push(<code key={k} className="rounded bg-kv-surface-2 px-1 py-px font-mono text-[0.88em]">{t.slice(1, -1)}</code>)
    else if (t.startsWith('[')) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(t) ?? []
      const safe = /^(https?:|mailto:|#|\/)/.test(href ?? '') ? href : undefined
      out.push(
        <a key={k} href={safe} target="_blank" rel="noreferrer" className="text-kv-defend underline underline-offset-2">
          {label}
        </a>,
      )
    } else out.push(<em key={k}>{t.slice(1, -1)}</em>)
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let k = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    if (line.startsWith('```')) {
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++])
      i++
      blocks.push(
        <pre key={k++} className="my-3 overflow-x-auto rounded-lg border border-kv-border bg-kv-surface-2 p-3 font-mono text-[12.5px] leading-5">
          {body.join('\n')}
        </pre>,
      )
      continue
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) {
      const level = h[1].length
      const cls =
        level === 1
          ? 'mb-3 mt-1 font-display text-[26px] font-semibold leading-tight text-kv-text'
          : level === 2
            ? 'mb-2 mt-7 border-b border-kv-border pb-1.5 font-display text-[19px] font-semibold text-kv-text'
            : 'mb-1.5 mt-5 text-[15px] font-semibold text-kv-text'
      const Tag = (`h${Math.min(level + 1, 6)}`) as 'h2'
      blocks.push(
        <Tag key={k++} className={cls}>
          {inline(h[2], k)}
        </Tag>,
      )
      i++
      continue
    }
    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const head = cells(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]))
      blocks.push(
        <div key={k++} className="my-3 overflow-x-auto rounded-lg border border-kv-border">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead className="bg-kv-surface-2 text-kv-muted">
              <tr>
                {head.map((c, j) => (
                  <th key={j} className="px-3 py-2 font-semibold whitespace-nowrap">
                    {inline(c, j)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-t border-kv-border">
                  {r.map((c, j) => (
                    <td key={j} className="px-3 py-1.5 align-top">
                      {inline(c, j)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line)
      const items: string[] = []
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ''))
      const List = ordered ? 'ol' : 'ul'
      blocks.push(
        <List key={k++} className={`my-2 space-y-1 pl-5 text-[14px] leading-relaxed ${ordered ? 'list-decimal' : 'list-disc'}`}>
          {items.map((it, j) => (
            <li key={j}>{inline(it, j)}</li>
          ))}
        </List>,
      )
      continue
    }
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\s*\||\s*([-*]|\d+\.)\s)/.test(lines[i])) para.push(lines[i++])
    if (!para.length) {
      para.push(lines[i++])
    }
    blocks.push(
      <p key={k++} className="my-2 text-[14px] leading-relaxed text-kv-muted">
        {para.map((p, j) => (
          <Fragment key={j}>
            {j > 0 && ' '}
            {inline(p, j)}
          </Fragment>
        ))}
      </p>,
    )
  }
  return <div>{blocks}</div>
}
