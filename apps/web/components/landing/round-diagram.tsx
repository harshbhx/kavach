'use client';

import { forwardRef, useRef } from 'react';
import { AnimatedBeam } from '@/components/ui/animated-beam';
import { cn } from '@/lib/utils';

const Node = forwardRef<HTMLDivElement, { agent: string; name: string; tone: 'red' | 'blue' | 'gold' }>(
  ({ agent, name, tone }, ref) => (
    <div className="flex flex-col items-center gap-1.5">
      <div
        ref={ref}
        className={cn(
          'z-10 grid size-14 place-items-center rounded-full border bg-kv-surface',
          tone === 'red' && 'border-kv-attack/40',
          tone === 'blue' && 'border-kv-defend/40',
          tone === 'gold' && 'border-kv-verdict/40',
        )}
      >
        <img src={`/agents/${agent}.png`} alt="" className="size-10 rounded-full" />
      </div>
      <span className="text-xs text-kv-muted">{name}</span>
    </div>
  ),
);
Node.displayName = 'Node';

/** Who talks to whom in one round. The beams are the actual handoffs (Band @mentions + tool calls). */
export function RoundDiagram() {
  const box = useRef<HTMLDivElement>(null);
  const recon = useRef<HTMLDivElement>(null);
  const injector = useRef<HTMLDivElement>(null);
  const social = useRef<HTMLDivElement>(null);
  const target = useRef<HTMLDivElement>(null);
  const monitor = useRef<HTMLDivElement>(null);
  const patcher = useRef<HTMLDivElement>(null);
  const auditor = useRef<HTMLDivElement>(null);
  const referee = useRef<HTMLDivElement>(null);

  const red = { gradientStartColor: '#ff4d6d', gradientStopColor: '#ff8fa3', pathColor: '#3a3a55', pathOpacity: 0.5 };
  const blue = { gradientStartColor: '#22d3ee', gradientStopColor: '#7c5cff', pathColor: '#3a3a55', pathOpacity: 0.5 };

  return (
    <div ref={box} className="relative mx-auto flex w-full max-w-xl items-center justify-between gap-4 py-6">
      <div className="flex flex-col gap-7">
        <Node ref={recon} agent="recon" name="Recon" tone="red" />
        <Node ref={injector} agent="injection" name="Injector" tone="red" />
        <Node ref={social} agent="social" name="Social Engineer" tone="red" />
      </div>

      <div className="flex flex-col items-center gap-10">
        <Node ref={referee} agent="referee" name="Referee" tone="gold" />
        <div
          ref={target}
          className="z-10 w-40 rounded-xl border border-kv-border-strong bg-kv-surface-2 px-3 py-3 text-center"
        >
          <p className="text-sm font-semibold text-kv-text">DiwaliMart bot</p>
          <p className="mt-1 font-mono text-[11px] leading-relaxed text-kv-faint">
            get_order_status
            <br />
            issue_refund
            <br />
            get_customer_kyc
            <br />
            apply_coupon
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-7">
        <Node ref={monitor} agent="monitor" name="Monitor" tone="blue" />
        <Node ref={patcher} agent="patcher" name="Patcher" tone="blue" />
        <Node ref={auditor} agent="auditor" name="Auditor" tone="blue" />
      </div>

      <AnimatedBeam containerRef={box} fromRef={recon} toRef={target} curvature={30} duration={4} {...red} />
      <AnimatedBeam containerRef={box} fromRef={injector} toRef={target} duration={4} delay={0.6} {...red} />
      <AnimatedBeam containerRef={box} fromRef={social} toRef={target} curvature={-30} duration={4} delay={1.2} {...red} />
      <AnimatedBeam containerRef={box} fromRef={target} toRef={monitor} curvature={30} duration={4} delay={2} {...blue} />
      <AnimatedBeam containerRef={box} fromRef={monitor} toRef={patcher} duration={3} delay={2.8} {...blue} />
      <AnimatedBeam containerRef={box} fromRef={patcher} toRef={auditor} duration={3} delay={3.4} {...blue} />
      <AnimatedBeam
        containerRef={box}
        fromRef={auditor}
        toRef={target}
        curvature={-30}
        reverse
        duration={4}
        delay={4}
        gradientStartColor="#34d399"
        gradientStopColor="#22d3ee"
        pathColor="#3a3a55"
        pathOpacity={0.5}
      />
      <AnimatedBeam
        containerRef={box}
        fromRef={target}
        toRef={referee}
        duration={3}
        delay={4.6}
        gradientStartColor="#ffb020"
        gradientStopColor="#ffd27a"
        pathColor="#3a3a55"
        pathOpacity={0.5}
      />
    </div>
  );
}
