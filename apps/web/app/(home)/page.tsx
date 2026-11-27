import Link from 'next/link';
import { AttackConsole } from '@/components/landing/attack-console';
import { AttackThread } from '@/components/landing/attack-thread';
import { ApprovalThread } from '@/components/landing/approval-thread';
import { AuditForms } from '@/components/landing/audit-forms';
import { CiGate } from '@/components/landing/ci-gate';
import { DemoGallery } from '@/components/landing/demo-gallery';
import { ModelScoreboard } from '@/components/landing/model-scoreboard';
import { Passbook } from '@/components/landing/passbook';
import { RefundSlip } from '@/components/landing/refund-slip';
import { RoundTimeline } from '@/components/landing/round-timeline';
import { RunMap } from '@/components/landing/run-map';
import { SecurityFeatures } from '@/components/landing/security-features';
import { RoomCast } from '@/components/landing/room-cast';
import { Signatories } from '@/components/landing/signatories';
import { WhatsReal } from '@/components/landing/whats-real';
import { AGENTS } from '@/components/landing/agents-data';
import { AgentAvatar } from '@kavach/brand/avatar';
import { GitHubIcon } from '@/components/landing/site-chrome';
import { links } from '@/lib/shared';

const SPONSORS = [
  ['Lyzr', 'Writes the agents’ minds. Each of the seven runs as a Lyzr Studio agent with its own role, instructions and memory.'],
  ['Band', 'Holds the room. Every handoff is a message that @mentions the next agent, the live Referee answers people, and a person approves each patch there.'],
  ['Finch', 'Carries the playbooks. Two skill packs, an OWASP attack pack and a hardening pack, are loaded into the squads on every run.'],
  ['AdaL', 'Reads the manual. The same skill packs ship as AdaL project skills, and AGENTS.md lets AdaL extend Kavach ticket by ticket.'],
  ['Agent37', 'Contains the blast. The target bot can run in a throwaway Agent37 sandbox; recorded run 10 attacked it there.'],
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
    <main id="main" className="kv-paper flex-1">
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
                  href="/dashboard/?demo=live"
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
              <ul className="mt-7 flex flex-wrap items-center gap-x-1.5 gap-y-2" aria-label="The seven agents">
                {AGENTS.map((a) => (
                  <li key={a.id} title={`${a.name}: ${a.job}`}>
                    <AgentAvatar agent={a.id} size={42} label={a.name} />
                  </li>
                ))}
                <li className="ml-2 text-[13px] leading-tight text-ink-3">
                  3 attack, 3 harden,
                  <br />1 keeps score
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12">
            <RefundSlip />
          </div>
        </div>
      </section>

      <AttackThread />

      {/* Try the attacks yourself */}
      <section>
        <div className="mx-auto max-w-[1200px] px-5 py-24">
          <Heading id="try" title="Send Diya an attack.">
            <p>
              Six messages Kavach’s attackers sent in round 1 of the offline sample run (scripted agents, scripted bot), and one from an ordinary customer. Pick one, then switch between
              the bot as Kavach found it, the first patch, which the Auditor threw out, and the patch that shipped.
            </p>
          </Heading>
          <div className="mt-12">
            <AttackConsole />
          </div>
        </div>
      </section>

      {/* One run, second by second */}
      <section className="border-t border-ink/15 bg-paper-2/60">
        <div className="mx-auto max-w-[1200px] px-5 py-24">
          <Heading id="round" title="Thirty-five seconds, from first probe to report.">
            <p>
              The offline sample run (scripted agents), step by step. Times are seconds after the Referee opened the room. Real
              runs with live models take longer: 36 to 87 seconds to harden in the recordings below.
            </p>
          </Heading>
          <div className="mt-14">
            <RoundTimeline />
          </div>
        </div>
      </section>

      {/* The round, as a passbook */}
      <section className="border-t border-ink/15">
        <div className="mx-auto max-w-[1200px] px-5 py-24">
          <Heading id="passbook" title="Every round goes into the passbook.">
            <p>
              Three rounds by default. Each one attacks whatever the last one shipped, and every entry says what went out, what
              was stopped and how much of the bot’s usefulness is left.
            </p>
          </Heading>
          <div className="mt-12">
            <Passbook />
          </div>
        </div>
      </section>

      {/* Real runs */}
      <section className="border-t border-ink/15">
        <div className="mx-auto max-w-[1200px] px-5 py-24">
          <Heading id="runs" title="Real runs. Pick one and watch.">
            <p>
              Different victim bots, different lengths, different outcomes: a small model breached in round one, a bigger one
              breached too, one that holds until round two, a frontier model that almost never breaks, and a hard mode with
              escalating attacks. Each opens in the dashboard.
            </p>
          </Heading>
          <div className="mt-12">
            <DemoGallery />
          </div>
        </div>
      </section>

      {/* Model scoreboard */}
      <section className="border-t border-ink/15">
        <div className="mx-auto max-w-[1200px] px-5 py-24">
          <Heading id="models" title="Bigger models refuse more. None of them is safe on its own.">
            <p>
              Eleven recorded live runs against four victim models. The bigger the model, the fewer tricks land in round one, but
              every one of them broke at least once, and every run ended hardened with real customers still served.
            </p>
          </Heading>
          <div className="mt-12">
            <ModelScoreboard />
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
            <p className="mt-4 max-w-[70ch] text-[14px] text-ink-3">
              These two forms are from the offline sample run (scripted agents), where the Auditor vetoes the first patch. In the
              recorded live runs the Auditor passed the first patch every time; the one rejection, in run 11, came from a person
              in the Band room.
            </p>
          </div>
        </div>
      </section>

      {/* A person in the loop */}
      <section className="border-t border-ink/15 bg-paper-2/60">
        <div className="mx-auto max-w-[1200px] px-5 py-24">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <Heading id="approval" title="A person signs off before a patch ships.">
              <p>
                Code decides whether a patch is good enough to ask about. A person decides whether it ships. Turn approval on and
                the Referee asks in the Band room, with the replay and utility numbers.
              </p>
              <p>
                Reply <code className="font-mono text-[16px] text-ink">@Referee approve v2</code>, or reject it with a reason. The
                reason goes back to the Patcher, and its next attempt has to answer it. The dashboard has the same two buttons.
              </p>
            </Heading>
            <ApprovalThread />
          </div>
        </div>
      </section>

      {/* Agents */}
      <section className="border-t border-ink/15 bg-paper-2/60">
        <div className="mx-auto max-w-[1200px] px-5 py-24">
          <Heading id="signatories" title="Seven agents in one room, every handoff signed.">
            <p>Press an agent to hear it. The lines come from the sample run in the repo, and on a real run each one is posted to Band.</p>
          </Heading>
          <div className="mt-12 space-y-8">
            <RoomCast />
            <Signatories />
          </div>
        </div>
      </section>

      {/* CI gate */}
      <section className="border-t border-ink/15 bg-paper-2/60">
        <div className="mx-auto max-w-[1200px] px-5 py-24">
          <Heading id="ci" title="Keep it fixed: a gate on every prompt change.">
            <p>
              A harmless-looking prompt edit can reopen a hole the last patch closed. The CI gate replays the attack library
              against your prompt and guard policy, runs the everyday requests, and fails the build if the breach rate rises or
              utility drops below 90%. It is a command, and a GitHub Action.
            </p>
          </Heading>
          <div className="mt-12">
            <CiGate />
          </div>
        </div>
      </section>

      {/* What is real */}
      <section className="border-t border-ink/15">
        <div className="mx-auto max-w-[1200px] px-5 py-24">
          <Heading id="real" title="What is real here, and what is not.">
            <p>A security tool that hides its own seams is not one to trust, so here they are.</p>
          </Heading>
          <div className="mt-12">
            <WhatsReal />
          </div>
        </div>
      </section>

      {/* Sponsors, as the printer's colophon */}
      <section className="relative bg-ink text-paper">
        <div className="kv-band h-5 opacity-60" aria-hidden />
        <div className="mx-auto max-w-[1200px] px-5 py-20">
          <h2 className="max-w-[50rem] font-display text-[2.4rem] leading-[1.05] text-paper-2 text-balance md:text-[3rem]">
            Built on Lyzr and Band, with Finch, AdaL and Agent37 support in the repo.
          </h2>
          <div className="mt-12">
            <RunMap />
          </div>
          <dl className="mt-10 grid gap-px overflow-hidden rounded-xl border border-paper/15 bg-paper/15 md:grid-cols-3 lg:grid-cols-5">
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
              and model keys, then creates the seven Lyzr agents and registers seven Band identities for you.{' '}
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
