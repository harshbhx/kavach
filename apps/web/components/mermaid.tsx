'use client';

import { useEffect, useId, useState } from 'react';

/** Renders a Mermaid chart on the client with the Kavach palette. */
export function Mermaid({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, '');
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    import('mermaid').then(async ({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        themeVariables: {
          darkMode: true,
          background: '#0a0a16',
          primaryColor: '#1a1a2b',
          primaryTextColor: '#f5f5fa',
          primaryBorderColor: '#3a3a55',
          secondaryColor: '#12121f',
          tertiaryColor: '#12121f',
          lineColor: '#7c5cff',
          textColor: '#d6d6e2',
          clusterBkg: '#12121f',
          clusterBorder: '#26263a',
          actorBkg: '#1a1a2b',
          actorBorder: '#3a3a55',
          actorTextColor: '#f5f5fa',
          signalColor: '#a1a1b5',
          signalTextColor: '#f5f5fa',
          noteBkgColor: '#1a1a2b',
          noteTextColor: '#f5f5fa',
          noteBorderColor: '#3a3a55',
          labelBoxBkgColor: '#1a1a2b',
          loopTextColor: '#a1a1b5',
          edgeLabelBackground: '#12121f',
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

  if (error) return <pre className="overflow-x-auto rounded-lg border p-4 text-xs">{chart}</pre>;
  return (
    <div
      className="not-prose my-6 flex justify-center overflow-x-auto rounded-xl border border-kv-border bg-kv-surface/60 p-4 [&_svg]:h-auto [&_svg]:max-w-full"
      aria-label="Diagram"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
