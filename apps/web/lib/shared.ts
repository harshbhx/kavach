import { createGetUrl } from 'fumadocs-core/source';

export const appName = 'Kavach';
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';

export const gitConfig = {
  user: 'harshbhx',
  repo: 'kavach',
  branch: 'main',
};

export const links = {
  github: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  devpost: 'https://theagent-to-agent-hackathon.devpost.com/',
};

const getImageUrl = createGetUrl(docsImageRoute);

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'image.png'];

  return { segments, url: getImageUrl(segments, page.locale) };
}
