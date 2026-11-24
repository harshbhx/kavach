import { SiteFooter, SiteHeader } from '@/components/landing/site-chrome';

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
