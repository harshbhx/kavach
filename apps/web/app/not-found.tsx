import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/landing/site-chrome';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="kv-paper flex flex-1 items-center">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-28">
          <div className="relative max-w-[40rem]">
            <span
              aria-hidden
              className="kv-ink absolute -top-6 right-0 -rotate-6 rounded-md border-[3px] border-stamp px-3 py-0.5 font-display text-[1.6rem] leading-tight font-bold tracking-[0.08em] text-stamp [font-stretch:85%] sm:right-10"
              style={{ boxShadow: 'inset 0 0 0 1.5px currentColor' }}
            >
              VOID
            </span>
            <p className="font-mono text-[14px] text-ink-3">404</p>
            <h1 className="mt-3 font-display text-[2.8rem] leading-[1.02] text-ink text-balance md:text-[3.6rem]">There is no page at this address.</h1>
            <p className="mt-5 max-w-[52ch] text-[18px] leading-relaxed text-ink-2">
              It may have moved when the docs were reorganised. The docs, the recorded run and the source are all one click away.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/docs" className="rounded-lg bg-ink px-5 py-3 text-[16px] font-semibold text-paper-2 transition-colors hover:bg-hold">
                Open the docs
              </Link>
              <a
                href="/dashboard/?demo=live"
                className="rounded-lg border-2 border-ink/80 px-5 py-[10px] text-[16px] font-semibold text-ink transition-colors hover:bg-paper-3"
              >
                Watch a recorded run
              </a>
              <Link href="/" className="rounded-lg px-4 py-3 text-[16px] font-semibold text-ink underline-offset-4 hover:underline">
                Back to the home page
              </Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
