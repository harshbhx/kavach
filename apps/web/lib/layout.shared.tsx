import { Wordmark } from '@/components/landing/site-chrome';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { links } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <Wordmark size={22} />,
      url: '/',
    },
    githubUrl: links.github,
    themeSwitch: { enabled: false },
  };
}
