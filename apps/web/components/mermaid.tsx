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
      className="not-prose my-6 flex justify-center overflow-x-auto rounded-xl border border-rule bg-paper-2 p-4 [&_svg]:h-auto [&_svg]:max-w-full"
      aria-label="Diagram"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
