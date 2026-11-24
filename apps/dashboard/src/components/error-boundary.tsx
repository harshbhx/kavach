import { Component, type ErrorInfo, type ReactNode } from 'react'

/** If a panel throws while drawing, show a way forward instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Kavach dashboard crashed', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-screen place-items-center bg-kv-bg px-6">
        <div className="w-full max-w-md overflow-hidden rounded-xl border border-kv-border-strong bg-kv-surface shadow-[0_18px_40px_-28px_rgb(14_35_28/0.45)]">
          <div className="kv-band h-2.5 border-b border-kv-border" aria-hidden />
          <div className="space-y-3 p-6">
            <h1 className="font-display text-xl text-kv-text">The dashboard hit an error while drawing</h1>
            <p className="text-[14px] leading-relaxed text-kv-muted">
              The run itself is not affected: events are still saved under <code className="font-mono">runs/</code>. Reload to
              reconnect, or open the recorded run.
            </p>
            <pre className="overflow-x-auto rounded-lg border border-kv-border bg-kv-surface-2 p-3 font-mono text-[12px] text-kv-attack">
              {this.state.error.message}
            </pre>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="h-9 rounded-lg bg-kv-text px-4 text-[14px] font-semibold text-kv-surface hover:bg-kv-defend"
              >
                Reload
              </button>
              <a href="?demo=sample" className="inline-flex h-9 items-center rounded-lg border border-kv-border-strong px-4 text-[14px] font-semibold text-kv-text">
                Open the recorded run
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
