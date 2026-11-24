import { KavachLogo } from '@kavach/brand';
import Link from 'next/link';
import { links } from '@/lib/shared';

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-kv-border/60 bg-kv-bg/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5">
        <Link href="/" aria-label="Kavach home" className="shrink-0">
          <KavachLogo size={26} wordmark />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-kv-muted md:flex">
          <a href="#how-it-works" className="transition-colors hover:text-kv-text">
            How it works
          </a>
          <a href="#scoring" className="transition-colors hover:text-kv-text">
            Scoring
          </a>
          <a href="#agents" className="transition-colors hover:text-kv-text">
            Agents
          </a>
          <Link href="/docs" className="transition-colors hover:text-kv-text">
            Docs
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={links.github}
            className="grid size-9 place-items-center rounded-lg text-kv-muted transition-colors hover:bg-kv-surface-2 hover:text-kv-text"
            aria-label="Kavach on GitHub"
          >
            <GitHubIcon className="size-[18px]" />
          </a>
          <a
            href="#quickstart"
            className="rounded-lg bg-kv-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-kv-brand-hover"
          >
            Run it locally
          </a>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-kv-border/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 text-sm text-kv-muted md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <KavachLogo size={24} wordmark />
          <p className="max-w-sm">
            Kavach (कवच) is Hindi for armour. Built by Harsh Bhanushali at DualMind Labs for Diwali Festiverse, the
            agent-to-agent hackathon, 2026.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-medium text-kv-text">Project</p>
          <Link href="/docs" className="hover:text-kv-text">
            Documentation
          </Link>
          <a href={links.github} className="hover:text-kv-text">
            Source on GitHub
          </a>
          <a href={links.devpost} className="hover:text-kv-text">
            Hackathon on Devpost
          </a>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-medium text-kv-text">Safety</p>
          <p>Every customer, order and PAN in Kavach is fake. The target only attacks its own mock tools.</p>
        </div>
      </div>
    </footer>
  );
}
