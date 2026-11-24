'use client';

import { Maximize2, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

/**
 * Renders a Mermaid chart on the client with the Kavach palette. Inline, the chart fits the column; a button opens it
 * at full size in an overlay that scrolls, for the wide ones.
 */
export function Mermaid({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, '');
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    import('mermaid').then(async ({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        // Draw at natural size; CSS fits it to the column inline and the overlay shows it full size.
        flowchart: { useMaxWidth: false, nodeSpacing: 36, rankSpacing: 44, padding: 10, htmlLabels: true },
        sequence: { useMaxWidth: false, actorMargin: 36, messageMargin: 30, boxMargin: 8 },
        fontFamily: 'var(--font-plex), system-ui, sans-serif',
        themeVariables: {
          background: '#f1f6f2',
          primaryColor: '#e6efe9',
          primaryTextColor: '#0e231c',
          primaryBorderColor: '#5f7a70',
          secondaryColor: '#f1f6f2',
          tertiaryColor: '#f1f6f2',
          lineColor: '#0b6e7f',
          textColor: '#0e231c',
          clusterBkg: '#f1f6f2',
          clusterBorder: '#b9cdc2',
          actorBkg: '#e6efe9',
          actorBorder: '#5f7a70',
          actorTextColor: '#0e231c',
          signalColor: '#3a574c',
          signalTextColor: '#0e231c',
          noteBkgColor: '#f1f6f2',
          noteTextColor: '#0e231c',
          noteBorderColor: '#b9cdc2',
          labelBoxBkgColor: '#e6efe9',
          loopTextColor: '#3a574c',
          edgeLabelBackground: '#f1f6f2',
          fontSize: '15px',
        },
      });
      try {
        const { svg } = await mermaid.render(`mmd-${id}`, chart);
        if (alive) setSvg(svg);
      } catch {
        if (alive) setError(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [chart, id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  if (error) return <pre className="overflow-x-auto rounded-lg border p-4 text-xs">{chart}</pre>;

  return (
    <figure className="not-prose group relative my-6 rounded-xl border border-rule bg-paper-2">
      {svg ? (
        <>
          <div
            role="img"
            aria-label="Diagram"
            className="overflow-hidden p-5 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 rounded-md border border-rule bg-paper px-2 py-1 text-[12.5px] text-ink-2 transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-hold focus-visible:outline-none"
          >
            <Maximize2 className="size-3.5" aria-hidden /> Full size
          </button>
        </>
      ) : (
        <div className="h-48 animate-pulse rounded-xl bg-paper-3/60" aria-label="Loading diagram" />
      )}

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Diagram, full size" className="fixed inset-0 z-[100] flex flex-col bg-paper">
          <div className="flex justify-end p-3">
            <button
              type="button"
              autoFocus
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-paper-2 px-3 py-1.5 text-[14px] text-ink focus-visible:ring-2 focus-visible:ring-hold focus-visible:outline-none"
            >
              <X className="size-4" aria-hidden /> Close
            </button>
          </div>
          <div className="flex-1 overflow-auto px-6 pb-10 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-none" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      )}
    </figure>
  );
}
