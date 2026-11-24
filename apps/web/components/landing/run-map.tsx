'use client';

import { useReducedMotion } from 'motion/react';

type Node = { x: number; y: number; name: string; line1: string; line2: string };

const W = 250;
const H = 100;

const NODES: Node[] = [
  { x: 30, y: 30, name: 'Lyzr Studio', line1: 'Seven agent brains, each with', line2: 'its own role and memory' },
  { x: 840, y: 30, name: 'Band', line1: 'The room. Every handoff is a', line2: 'message with an @mention' },
  { x: 30, y: 290, name: 'Target bot', line1: 'DiwaliMart Support, in an', line2: 'Agent37 sandbox or locally' },
  { x: 840, y: 290, name: 'Dashboard', line1: 'Live over server-sent events;', line2: 'this site runs on Cloudflare' },
];

// Edges leave the orchestrator (centre box) and end at each corner box.
const EDGES: { d: string; label: string; lx: number; ly: number; anchor: 'start' | 'end'; out: string; back: string | null }[] = [
  { d: 'M435 185 C 360 185, 355 80, 280 80', label: 'asks for attacks and patches', lx: 294, ly: 62, anchor: 'start', out: '#F1F6F2', back: '#B07D1A' },
  { d: 'M685 185 C 760 185, 765 80, 840 80', label: 'posts every handoff', lx: 826, ly: 62, anchor: 'end', out: '#B07D1A', back: null },
  { d: 'M435 235 C 360 235, 355 340, 280 340', label: 'sends attacks, reads the tool-call log', lx: 294, ly: 376, anchor: 'start', out: '#E2546E', back: '#3FB7C6' },
  { d: 'M685 235 C 760 235, 765 340, 840 340', label: 'streams every event', lx: 826, ly: 376, anchor: 'end', out: '#5CC08A', back: null },
];

function Box({ n }: { n: Node }) {
  return (
    <g>
      <rect x={n.x} y={n.y} width={W} height={H} rx={12} fill="#14302A" stroke="rgb(241 246 242 / 0.22)" />
      <text x={n.x + 20} y={n.y + 36} fill="#F1F6F2" fontSize={21} fontWeight={600}>
        {n.name}
      </text>
      <text x={n.x + 20} y={n.y + 62} fill="rgb(241 246 242 / 0.7)" fontSize={14.5}>
        {n.line1}
      </text>
      <text x={n.x + 20} y={n.y + 82} fill="rgb(241 246 242 / 0.7)" fontSize={14.5}>
        {n.line2}
      </text>
    </g>
  );
}

/**
 * Where a live run happens: the orchestrator in the middle, a sponsor platform at each corner, and dots for the traffic
 * on each edge. Decorative over the sponsor list below it, so it is hidden from screen readers and on small screens.
 */
export function RunMap() {
  const calm = useReducedMotion();
  return (
    <svg viewBox="0 0 1120 420" className="hidden h-auto w-full md:block" aria-hidden fontFamily="var(--font-plex), system-ui, sans-serif">
      {EDGES.map((e, i) => (
        <g key={e.d}>
          <path id={`kv-edge-${i}`} d={e.d} fill="none" stroke="rgb(241 246 242 / 0.28)" strokeWidth={1.5} strokeDasharray="5 6" />
          <text x={e.lx} y={e.ly} fill="rgb(241 246 242 / 0.66)" fontSize={14} textAnchor={e.anchor}>
            {e.label}
          </text>
          {!calm && (
            <>
              <circle r={5} fill={e.out}>
                <animateMotion dur="2.8s" begin={`${i * 0.5}s`} repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
                  <mpath href={`#kv-edge-${i}`} />
                </animateMotion>
              </circle>
              {e.back && (
                <circle r={4} fill={e.back}>
                  <animateMotion dur="2.8s" begin={`${i * 0.5 + 1.4}s`} repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" calcMode="linear">
                    <mpath href={`#kv-edge-${i}`} />
                  </animateMotion>
                </circle>
              )}
            </>
          )}
        </g>
      ))}

      {/* the orchestrator */}
      <rect x={435} y={140} width={250} height={140} rx={14} fill="#F1F6F2" />
      <text x={560} y={184} fill="#0E231C" fontSize={26} fontWeight={600} textAnchor="middle">
        Kavach
      </text>
      <text x={560} y={212} fill="#3A574C" fontSize={14.5} textAnchor="middle">
        Runs rounds and the guard policy
      </text>
      <line x1={460} x2={660} y1={232} y2={232} stroke="#B9CDC2" strokeDasharray="3 4" />
      <text x={560} y={258} fill="#C8203F" fontSize={14.5} fontWeight={600} textAnchor="middle">
        5 breach rules, in code
      </text>

      {NODES.map((n) => (
        <Box key={n.name} n={n} />
      ))}
    </svg>
  );
}
