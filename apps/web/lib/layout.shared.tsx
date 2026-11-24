import { KavachLogo } from '@kavach/brand';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { links } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <KavachLogo size={24} wordmark />,
      url: '/',
    },
    githubUrl: links.github,
    themeSwitch: { enabled: false },
  };
}
