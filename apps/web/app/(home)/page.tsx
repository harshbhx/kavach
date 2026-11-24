import Link from 'next/link';
import { AuditForms } from '@/components/landing/audit-forms';
import { Passbook } from '@/components/landing/passbook';
import { RefundSlip } from '@/components/landing/refund-slip';
import { SecurityFeatures } from '@/components/landing/security-features';
import { Signatories } from '@/components/landing/signatories';
import { GitHubIcon } from '@/components/landing/site-chrome';
import { links } from '@/lib/shared';

const SPONSORS = [
  ['Lyzr', 'Writes the agents’ minds. Each of the seven runs as a Lyzr Studio agent with its own role, instructions and memory.'],
  ['Band', 'Holds the room. Every agent is a Band remote agent, and every handoff is a message that @mentions the next one.'],
  ['Agent37', 'Contains the blast. The target bot can run in a throwaway Agent37 sandbox; the deploy script is in the repo.'],
  ['AdaL', 'Reads the manual. AGENTS.md and ticketed specs let a coding agent like AdaL extend Kavach one ticket at a time.'],
] as const;

const QUICKSTART = `git clone ${links.github}.git && cd kavach
pnpm install

# API, dashboard and this site, with scripted agents
pnpm dev:offline

# dashboard  http://localhost:5173
# site       http://localhost:3000`;

function Heading({ id, title, children }: { id: string; title: string; children?: React.ReactNode }) {
  return (
    <div id={id} className="max-w-[46rem] scroll-mt-28">
      <h2 className="font-display text-[2.6rem] leading-[1.02] text-ink text-balance md:text-[3.4rem]">{title}</h2>
      {children && <div className="mt-5 max-w-[62ch] space-y-4 text-[18px] leading-relaxed text-ink-2">{children}</div>}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="kv-paper flex-1">
      {/* First viewport: the exploit as the refund it tried to cash */}
      <section className="relative overflow-hidden">
        <img
          src="/print/rosette-large.svg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -top-56 -right-60 w-[880px] max-w-none opacity-80"
        />
        <div className="relative mx-auto max-w-[1200px] px-5 pt-14 pb-20 md:pt-20">
          <div className="grid items-end gap-x-12 gap-y-8 lg:grid-cols-12">
            <h1 className="font-display text-[3.1rem] leading-[0.98] text-ink text-balance sm:text-[4.4rem] lg:col-span-8 lg:text-[5.3rem]">
              Your support bot can issue refunds. So can anyone who talks to it.
            </h1>
            <div className="lg:col-span-4 lg:pb-3">
              <p className="text-[18px] leading-relaxed text-ink-2">
                Kavach puts seven AI agents in a room with your tool-using bot. Three attack it, three harden it, one keeps
                score. Code catches every breach, and a patch ships only if real customers still get help.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/dashboard/?demo=sample"
                  className="rounded-lg bg-ink px-5 py-3 text-[16px] font-semibold text-paper-2 transition-colors hover:bg-hold"
                >
                  Watch a recorded run
                </a>
                <a
                  href="#quickstart"
                  className="rounded-lg border-2 border-ink/80 px-5 py-[10px] text-[16px] font-semibold text-ink transition-colors hover:bg-paper-3"
                >
                  Run it locally
                </a>
              </div>
            </div>
          </div>
          <div className="mt-12">
            <RefundSlip />
          </div>
        </div>
      </section>

      {/* The round, as a passbook */}
      <section className="border-t border-ink/15">
        <div className="mx-auto max-w-[1200px] px-5 py-24">
          <Heading id="passbook" title="Every round goes into the passbook.">
            <p>
              Three rounds per run. Each one attacks whatever the last one shipped, and every entry says what went out, what
              was stopped and how much of the bot’s usefulness is left.
            </p>
          </Heading>
          <div className="mt-12">
            <Passbook />
          </div>
        </div>
      </section>

      {/* Detectors as security features */}
      <section className="border-t border-ink/15 bg-paper-2/60">
        <div className="mx-auto max-w-[1200px] px-5 py-24">
          <Heading id="features" title="Five security features, checked in code.">
            <p>
              Models attack, patch and explain. They never mark their own work. Kavach reads the bot’s tool-call log and its
              reply, and five fixed rules decide what counts as a breach.
            </p>
          </Heading>
          <div className="mt-12">
            <SecurityFeatures />
          </div>
        </div>
      </section>

      {/* Utility trap */}
      <section className="border-t border-ink/15">
        <div className="mx-auto max-w-[1200px] px-5 py-24">
          <Heading id="utility" title="A vault that never opens is not a bank.">
            <p>
              The cheapest way to stop every attack is to stop helping anyone. So the Auditor replays every exploit and ten
              everyday requests against each patch. Below 90% it vetoes the patch in the room, and the Patcher has to try
              again.
            </p>
          </Heading>
          <div className="mt-12">
            <AuditForms />
          </div>
        </div>
      </section>

      {/* Agents */}
      <section className="border-t border-ink/15 bg-paper-2/60">
        <div className="mx-auto max-w-[1200px] px-5 py-24">
          <Heading id="signatories" title="Seven agents in one room, every handoff signed.">
            <p>The lines below come from the sample run in the repo.</p>
          </Heading>
          <div className="mt-12">
            <Signatories />
          </div>
        </div>
      </section>

      {/* Sponsors, as the printer's colophon */}
      <section className="relative bg-ink text-paper">
        <div className="kv-band h-5 opacity-60" aria-hidden />
        <div className="mx-auto max-w-[1200px] px-5 py-20">
          <h2 className="max-w-[50rem] font-display text-[2.4rem] leading-[1.05] text-paper-2 text-balance md:text-[3rem]">
            Printed with four sponsor platforms, each doing a real job.
          </h2>
          <dl className="mt-12 grid gap-px overflow-hidden rounded-xl border border-paper/15 bg-paper/15 md:grid-cols-4">
            {SPONSORS.map(([name, text]) => (
              <div key={name} className="bg-ink p-6">
                <dt className="font-display text-[2rem] leading-none text-paper-2">{name}</dt>
                <dd className="mt-3 text-[15px] leading-relaxed text-paper/75">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Quickstart on a counterfoil */}
      <section className="mx-auto max-w-[1200px] px-5 py-24">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <Heading id="quickstart" title="Run it in two minutes. No keys.">
            <p>
              Offline mode swaps in scripted agents and a scripted target, so the whole loop runs on a laptop. Open
              localhost:5173 and press Start live run.
            </p>
            <p>
              For a real run, <code className="font-mono text-[0.92em] text-ink">pnpm bootstrap</code> asks for your Lyzr, Band
              and model keys, then creates all fourteen agents for you.{' '}
              <Link href="/docs" className="font-semibold text-hold underline underline-offset-4 hover:text-ink">
                The docs walk through it.
              </Link>
            </p>
          </Heading>
          <div className="self-start">
            <div className="relative rounded-xl border border-ink/25 bg-paper-2 shadow-[0_24px_50px_-30px_rgb(14_35_28/0.4)]">
              <div className="flex items-center justify-between border-b border-dashed border-ink/30 px-5 py-3">
                <span className="font-display text-lg text-ink">Counterfoil</span>
                <span className="font-mono text-xs text-ink-3">keep for your records</span>
              </div>
              <pre className="overflow-x-auto px-5 py-4 font-mono text-[13.5px] leading-7 text-ink">
                <code>{QUICKSTART}</code>
              </pre>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={links.github}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-ink/80 px-4 py-2.5 text-[15px] font-semibold text-ink transition-colors hover:bg-paper-3"
              >
                <GitHubIcon className="size-4" /> Source on GitHub
              </a>
              <Link
                href="/docs"
                className="rounded-lg px-4 py-2.5 text-[15px] font-semibold text-ink underline-offset-4 hover:underline"
              >
                Read the docs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
