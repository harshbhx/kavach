import { ExternalLink } from 'lucide-react'
import { Panel } from '@/components/panel'
import { RoomPanel } from '@/components/room-panel'
import type { RunView } from '@/lib/useRun'

const ASK = [
  ['@Referee status', 'the score by round'],
  ['@Referee breaches', 'what broke, by rule'],
  ['@Referee patch', 'what the blue squad shipped'],
  ['@Referee report', 'where the audit report is'],
] as const

/** The Kavach room at reading size, with how to join the conversation in Band. */
export function RoomView({ run }: { run: RunView }) {
  const waiting = run.approval && !run.approval.decided ? run.approval.version : null
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="h-[calc(100vh-11rem)] min-h-[560px] min-w-0">
        <RoomPanel run={run} />
      </div>
      <aside className="space-y-3">
        <Panel title="Join in from Band" hint="Every message here is also a message in the Band room">
          <div className="space-y-3 px-4 py-3 text-[13px] text-kv-muted">
            {run.bandUrl && run.mode !== 'demo' ? (
              <a href={run.bandUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-kv-defend underline-offset-4 hover:underline">
                Open this run's Band room <ExternalLink className="size-3" />
              </a>
            ) : (
              <p>In a live run with Band connected, a link to the room appears here.</p>
            )}
            <div>
              <p className="mb-1.5 font-medium text-kv-text">Ask the live Referee</p>
              <ul className="space-y-1">
                {ASK.map(([cmd, what]) => (
                  <li key={cmd} className="flex flex-wrap gap-x-2">
                    <code className="font-mono text-[12.5px] text-kv-text">{cmd}</code>
                    <span className="text-kv-faint">{what}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1.5 font-medium text-kv-text">Approve a patch</p>
              <p>
                With approval on, a patch that passes the Auditor waits for you. Reply <code className="font-mono text-[12.5px] text-kv-text">@Referee approve {waiting ?? 'v2'}</code> or{' '}
                <code className="font-mono text-[12.5px] text-kv-text">@Referee reject {waiting ?? 'v2'} because …</code>
              </p>
            </div>
            <p className="text-[12px] text-kv-faint">The Referee answers from the run's numbers, computed by code. It needs `make referee` running next to the API.</p>
          </div>
        </Panel>
      </aside>
    </div>
  )
}
