import { KavachLogo } from '@kavach/brand';
import Link from 'next/link';
import { links } from '@/lib/shared';

export function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <KavachLogo size={size} wordmark />
      <span className="font-display text-[1.05em] leading-none text-ink-3" lang="hi">
        कवच
      </span>
    </span>
  );
}

const NAV = [
  ['#passbook', 'How a round runs'],
  ['#features', 'What counts as a breach'],
  ['#signatories', 'The agents'],
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/15 bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-8 px-5">
        <Link href="/" aria-label="Kavach home" className="shrink-0">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-6 text-[15px] text-ink-2 lg:flex">
          {NAV.map(([href, label]) => (
            <a key={href} href={href} className="underline-offset-[6px] transition-colors hover:text-ink hover:underline">
              {label}
            </a>
          ))}
          <Link href="/docs" className="underline-offset-[6px] transition-colors hover:text-ink hover:underline">
            Docs
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <a
            href={links.github}
            className="grid size-10 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-paper-3 hover:text-ink"
            aria-label="Kavach on GitHub"
          >
            <GitHubIcon className="size-[19px]" />
          </a>
          <a
            href="/dashboard/?demo=sample"
            className="rounded-lg bg-ink px-4 py-2.5 text-[15px] font-semibold text-paper-2 transition-colors hover:bg-hold"
          >
            Watch a run
          </a>
        </div>
      </div>
      <p className="kv-microprint border-t border-ink/10 py-[2px] text-center" aria-hidden>
        {'KAVACH RED VS BLUE FOR TOOL USING AGENTS BREACHES ARE CAUGHT BY CODE '.repeat(30)}
      </p>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-paper">
      <div className="kv-band h-5 border-y border-ink/15" aria-hidden />
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 py-14 text-[15px] text-ink-2 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-4">
          <Wordmark size={24} />
          <p className="max-w-sm leading-relaxed">
            Kavach is Hindi for armour. Built by Harsh Bhanushali at DualMind Labs for Diwali Festiverse, the agent-to-agent
            hackathon, 2026.
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          <p className="font-semibold text-ink">Project</p>
          <Link href="/docs" className="hover:text-ink">
            Documentation
          </Link>
          <a href={links.github} className="hover:text-ink">
            Source on GitHub
          </a>
          <a href={links.devpost} className="hover:text-ink">
            The hackathon on Devpost
          </a>
        </div>
        <div className="flex flex-col gap-2.5">
          <p className="font-semibold text-ink">Safety</p>
          <p className="leading-relaxed">
            Every customer, order and PAN in Kavach is invented. The target bot only attacks its own mock tools, and no
            money moves anywhere.
          </p>
        </div>
      </div>
    </footer>
  );
}
