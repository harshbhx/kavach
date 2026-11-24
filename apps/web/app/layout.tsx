import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata, Viewport } from 'next';
import { Herr_Von_Muellerhoff, IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Devanagari } from 'next/font/google';
import './global.css';

// IBM Plex throughout: Sans for headings and text, Mono for tool calls and serials, Sans Devanagari for कवच.
// The script face is only for the signature on the refund slip.
const plex = IBM_Plex_Sans({ subsets: ['latin'], variable: '--font-plex', axes: ['wdth'] });
const deva = IBM_Plex_Sans_Devanagari({ subsets: ['devanagari'], variable: '--font-plex-deva', weight: ['500', '600'] });
const mono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-plex-mono', weight: ['400', '500', '600'] });
const sign = Herr_Von_Muellerhoff({ weight: '400', subsets: ['latin'], variable: '--font-sign' });

// Social cards need an absolute address. NEXT_PUBLIC_SITE_URL wins when set; otherwise production builds
// point at the live site and `next dev` at localhost.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://kavach.dualmindlab.tech' : 'http://localhost:3000');

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
      className={`${plex.variable} ${deva.variable} ${mono.variable} ${sign.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <RootProvider
          theme={{ forcedTheme: 'light', defaultTheme: 'light', enableSystem: false }}
          search={{ options: { type: 'static' } }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
