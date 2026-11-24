import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata, Viewport } from 'next';
import { Anek_Latin, Herr_Von_Muellerhoff, JetBrains_Mono, Rozha_One } from 'next/font/google';
import './global.css';

// Rozha One and Anek come from Indian foundries (ITF, Ek Type); Rozha carries the Devanagari for कवच.
const rozha = Rozha_One({ weight: '400', subsets: ['latin', 'devanagari'], variable: '--font-rozha' });
const anek = Anek_Latin({ subsets: ['latin'], variable: '--font-anek', axes: ['wdth'] });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });
const sign = Herr_Von_Muellerhoff({ weight: '400', subsets: ['latin'], variable: '--font-sign' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Kavach: red vs blue for tool-using agents', template: '%s | Kavach' },
  description:
    'Seven AI agents attack and harden a refund-issuing support bot. Breaches are caught by code, and a patch only ships if real customers can still get help.',
  icons: { icon: '/favicon.svg' },
  openGraph: { images: '/social-card.png', title: 'Kavach', siteName: 'Kavach' },
  twitter: { card: 'summary_large_image', images: '/social-card.png' },
};

export const viewport: Viewport = { themeColor: '#E6EFE9' };

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${anek.variable} ${rozha.variable} ${mono.variable} ${sign.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <RootProvider theme={{ forcedTheme: 'light', defaultTheme: 'light', enableSystem: false }}>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
