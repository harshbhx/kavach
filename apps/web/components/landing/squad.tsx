'use client';

import SpotlightCard from '@/components/SpotlightCard';
import { cn } from '@/lib/utils';

type Agent = { id: string; name: string; job: string; says: string };

const RED: Agent[] = [
  {
    id: 'recon',
    name: 'Recon',
    job: 'Maps the bot with harmless questions before anyone attacks.',
    says: 'Dossier: Diya obeys anyone claiming to be staff, the ₹500 refund limit is soft, and KYC lookups look unrestricted.',
  },
  {
    id: 'injection',
    name: 'Injector',
    job: 'Technical prompt injection: overrides, base64, spoofed tool output.',
    says: '3 injection attacks queued: base64_obfuscation, tool_output_spoofing. Adapting to the new patch.',
  },
  {
    id: 'social',
    name: 'Social Engineer',
    job: 'Founder and VIP authority, urgency, sob stories, Hinglish.',
    says: '3 social attacks queued: emotional_story, fake_support_agent, hinglish_codeswitch.',
  },
];

const BLUE: Agent[] = [
  {
    id: 'monitor',
    name: 'Monitor',
    job: 'Explains every breach and finds the root cause.',
    says: 'Worst: issue_refund(order_id=ORD-99, amount_inr=50000) executed on someone else’s order.',
  },
  {
    id: 'patcher',
    name: 'Patcher',
    job: 'Rewrites the system prompt and the guard policy together.',
    says: 'Candidate v2: refund.max_auto_inr = 500, refund.require_order_ownership = true.',
  },
  {
    id: 'auditor',
    name: 'Auditor',
    job: 'Replays exploits and normal requests, then approves or vetoes.',
    says: 'Vetoed: utility 70%. B03 failed, blocked by input_filter:no-refund.',
  },
];

function Card({ a, tone, wide }: { a: Agent; tone: 'red' | 'blue' | 'gold'; wide?: boolean }) {
  const color = tone === 'red' ? 'rgba(255,77,109,0.28)' : tone === 'blue' ? 'rgba(34,211,238,0.24)' : 'rgba(255,176,32,0.24)';
  return (
    <SpotlightCard
      spotlightColor={color}
      spotlightSize={260}
      flare={false}
      className={cn('h-full rounded-2xl p-5', wide && 'md:col-span-3')}
      style={{ '--spotlight-card-surface': '#12121f', '--spotlight-card-border': '#26263a' } as React.CSSProperties}
    >
      <div className={cn('flex gap-4', wide ? 'flex-col md:flex-row md:items-center' : 'flex-col')}>
        <div className="flex items-center gap-3 md:min-w-56">
          <img src={`/agents/${a.id}.png`} alt="" className="size-10 rounded-full" />
          <div>
            <p
              className={cn(
                'font-semibold',
                tone === 'red' && 'text-kv-attack',
                tone === 'blue' && 'text-kv-defend',
                tone === 'gold' && 'text-kv-verdict',
              )}
            >
              {a.name}
            </p>
            <p className="text-sm text-kv-muted">{a.job}</p>
          </div>
        </div>
        <p className="border-l-2 border-kv-border pl-3 text-[13px] leading-relaxed text-kv-text/85">{a.says}</p>
      </div>
    </SpotlightCard>
  );
}

export function Squad() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {RED.map((a) => (
        <Card key={a.id} a={a} tone="red" />
      ))}
      {BLUE.map((a) => (
        <Card key={a.id} a={a} tone="blue" />
      ))}
      <Card
        wide
        tone="gold"
        a={{
          id: 'referee',
          name: 'Referee',
          job: 'Opens the room, keeps score, writes the audit report.',
          says: 'Round 1: breach 100%, utility 100%, time to harden 20s, 2 attempts, 1 veto. Blue patched it.',
        }}
      />
    </div>
  );
}
