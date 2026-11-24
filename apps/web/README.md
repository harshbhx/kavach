# Kavach site

Landing page (`/`) and docs (`/docs`), built with Next.js 16 and Fumadocs. Components come from Aceternity (spotlight), Magic UI (animated beam, border beam) and React Bits (shiny text, spotlight card).

```bash
# from the repo root
pnpm install
pnpm dev:web          # http://localhost:3000
```

The docs pages are generated from the repo's `docs/*.md` by `scripts/sync-docs.mjs`, which runs before `dev` and `build`. Edit the files in `docs/`, not `content/docs/` (only `index.mdx` and `meta.json` live here).

Deploy: import the repo in Vercel with root directory `apps/web` (framework Next.js). Set `NEXT_PUBLIC_SITE_URL` to the final URL so social cards resolve.
