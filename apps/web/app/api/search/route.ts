import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

// A static index the browser searches itself, so search works on a static host (Cloudflare) too.
export const revalidate = false;
export const { staticGET: GET } = createFromSource(source);
