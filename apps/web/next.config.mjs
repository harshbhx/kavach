import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

// STATIC_EXPORT=1 (pnpm build:cf) writes a plain static site to out/ for Cloudflare. Every page, the docs search
// index, the llms files and the OG images are pre-rendered, and the dashboard demo is a static Vite build.
const STATIC = process.env.STATIC_EXPORT === '1';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: ['@kavach/brand'],
  // Next's built-in checker trips on pnpm-linked workspace TSX; `pnpm lint` runs tsc for the same check.
  typescript: { ignoreBuildErrors: true },
  ...(STATIC
    ? { output: 'export', images: { unoptimized: true } }
    : {
        async rewrites() {
          return [
            // the dashboard demo is a static Vite build copied into public/dashboard
            { source: '/dashboard', destination: '/dashboard/index.html' },
            { source: '/dashboard/', destination: '/dashboard/index.html' },
            { source: '/docs/:path*.md', destination: '/llms.mdx/docs/:path*.md' },
            { source: '/docs/:path*.txt', destination: '/llms.mdx/docs/:path*.txt' },
          ];
        },
      }),
};

export default withMDX(config);
