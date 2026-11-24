'use client';

import { KavachLogo } from '@kavach/brand';
import { Menu, Play, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { links } from '@/lib/shared';

export function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

/** The lockup: Guardrail K, the Latin wordmark, a hairline, then कवच. */
export function Wordmark({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-3">
      <KavachLogo size={size} wordmark />
      <span aria-hidden className="h-[0.95em] w-px bg-rule max-[400px]:hidden" style={{ fontSize: size }} />
      <span className="font-medium leading-none text-ink-3 max-[400px]:hidden" style={{ fontSize: size * 0.68 }} lang="hi">
        कवच
      </span>
    </span>
  );
}

const NAV = [
  ['passbook', 'How a round runs'],
  ['features', 'Breach rules'],
  ['signatories', 'The agents'],
  ['quickstart', 'Run it'],
] as const;

/** Which landing section is on screen, for the nav underline. */
function useActiveSection() {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const els = NAV.map(([id]) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (seen[0]) setActive(seen[0].target.id);
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return active;
}

export function SiteHeader() {
  const active = useActiveSection();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  return (
    <header className="sticky top-0 z-40">
      <div className="border-b border-ink/12 bg-paper/88 backdrop-blur-md backdrop-saturate-150">
        <div className="mx-auto flex h-[68px] max-w-[1200px] items-center px-5">
          <Link href="/" aria-label="Kavach home" className="-ml-1 shrink-0 rounded-md p-1 focus-visible:outline-2 focus-visible:outline-hold">
            <Wordmark size={24} />
          </Link>

          <nav aria-label="Sections" className="ml-10 hidden items-center gap-0.5 lg:flex">
            {NAV.map(([id, label]) => (
              <a
                key={id}
                href={`/#${id}`}
                aria-current={active === id ? 'true' : undefined}
                className="group relative rounded-md px-3 py-2 text-[14.5px] text-ink-2 transition-colors hover:bg-ink/[0.045] hover:text-ink aria-[current]:text-ink"
              >
                {label}
                <span className="absolute inset-x-3 -bottom-[13px] h-[2px] origin-left scale-x-0 rounded-full bg-hold transition-transform duration-300 group-aria-[current]:scale-x-100" />
              </a>
            ))}
            <Link href="/docs" className="rounded-md px-3 py-2 text-[14.5px] text-ink-2 transition-colors hover:bg-ink/[0.045] hover:text-ink">
              Docs
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <a
              href={links.github}
              className="hidden h-10 items-center gap-2 rounded-lg border border-ink/15 px-3.5 text-[14.5px] font-medium text-ink-2 transition-colors hover:border-ink/30 hover:text-ink sm:flex"
            >
              <GitHubIcon className="size-[17px]" />
              GitHub
            </a>
            <a
              href="/dashboard/?demo=live"
              className="flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-[14.5px] font-semibold whitespace-nowrap text-paper-2 shadow-[0_1px_0_rgb(255_255_255/0.12)_inset,0_6px_18px_-10px_rgb(14_35_28/0.7)] transition-colors hover:bg-hold"
            >
              <Play className="size-3.5 fill-current" aria-hidden />
              Watch a run
            </a>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              className="grid size-10 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-ink/[0.06] hover:text-ink lg:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </div>
      <p className="kv-microprint border-b border-ink/10 bg-paper/88 py-[2px] text-center backdrop-blur-md" aria-hidden>
        {'KAVACH RED VS BLUE FOR TOOL USING AGENTS BREACHES ARE CAUGHT BY CODE '.repeat(30)}
      </p>

      {open && (
        <div id="site-menu" className="border-b border-ink/12 bg-paper-2 shadow-[0_24px_40px_-24px_rgb(14_35_28/0.4)] lg:hidden">
          <nav aria-label="Sections" className="mx-auto flex max-w-[1200px] flex-col px-5 py-3">
            {NAV.map(([id, label]) => (
              <a key={id} href={`/#${id}`} onClick={() => setOpen(false)} className="border-b border-dotted border-rule py-3.5 text-[17px] text-ink">
                {label}
              </a>
            ))}
            <Link href="/docs" onClick={() => setOpen(false)} className="border-b border-dotted border-rule py-3.5 text-[17px] text-ink">
              Docs
            </Link>
            <a href={links.github} className="flex items-center gap-2 py-3.5 text-[17px] text-ink">
              <GitHubIcon className="size-[18px]" /> Source on GitHub
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

const FOOTER: { title: string; items: [string, string][] }[] = [
  {
    title: 'Product',
    items: [
      ['/dashboard/?demo=live', 'Watch a recorded run'],
      ['/#quickstart', 'Run it locally'],
      ['/#passbook', 'How a round runs'],
      ['/#features', 'Breach rules'],
    ],
  },
  {
    title: 'Docs',
    items: [
      ['/docs', 'Overview'],
      ['/docs/architecture', 'Architecture'],
      ['/docs/scoring', 'Scoring'],
      ['/docs/agents', 'The seven agents'],
      ['/docs/api', 'API'],
    ],
  },
  {
    title: 'Project',
    items: [
      [links.github, 'Source on GitHub'],
      [`${links.github}/blob/main/SECURITY.md`, 'Security policy'],
      [`${links.github}/blob/main/LICENSE`, 'MIT license'],
      [links.devpost, 'Diwali Festiverse on Devpost'],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-auto overflow-hidden bg-paper-2">
      <div className="kv-band h-5 border-y border-ink/15" aria-hidden />

      <div className="relative mx-auto grid max-w-[1200px] gap-12 px-5 pt-16 pb-14 md:grid-cols-[1.35fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <Wordmark size={24} />
          <p className="mt-5 text-[15px] leading-relaxed text-ink-2">
            Seven AI agents attack and harden your tool-using bot. Code keeps score, and a patch ships only if real customers
            still get help.
          </p>
          <a
            href="/dashboard/?demo=live"
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg border border-ink/20 bg-paper px-4 text-[14.5px] font-semibold text-ink transition-colors hover:border-ink/40"
          >
            <Play className="size-3.5 fill-current" aria-hidden />
            Watch a recorded run
          </a>
        </div>
        {FOOTER.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="text-[13px] font-semibold text-ink">{col.title}</p>
            <ul className="mt-4 space-y-3">
              {col.items.map(([href, label]) => (
                <li key={href}>
                  <a href={href} className="text-[15px] text-ink-2 transition-colors hover:text-ink hover:underline hover:underline-offset-4">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="relative border-t border-dashed border-ink/25">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-5 py-6 text-[13.5px] text-ink-3 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Harsh Bhanushali, DualMind Labs. Kavach is Hindi for armour.</p>
          <p>Every customer, order and PAN in Kavach is invented. No money moves.</p>
        </div>
      </div>
    </footer>
  );
}
