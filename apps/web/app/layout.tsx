import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from 'next/font/google';
import './global.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  axes: ['opsz', 'wdth'],
});
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Kavach: AI red vs blue for tool-using agents', template: '%s | Kavach' },
  description:
    'Seven AI agents attack and harden a refund-issuing support bot. Breaches are caught by code, and a patch only ships if real customers can still get help.',
  icons: { icon: '/favicon.svg' },
  openGraph: { images: '/social-card.png', title: 'Kavach', siteName: 'Kavach' },
  twitter: { card: 'summary_large_image', images: '/social-card.png' },
};

export const viewport: Viewport = { themeColor: '#0A0A16' };

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${bricolage.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <RootProvider theme={{ forcedTheme: 'dark', defaultTheme: 'dark', enableSystem: false }}>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
