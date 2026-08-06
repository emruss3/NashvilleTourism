import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { JsonLd } from '@/components/Ui';
import { DemoDataNotice } from '@/components/Trust';
import StickyCta from '@/components/StickyCta';
import { allowIndexing, asset, organizationSchema, websiteSchema, canonical } from '@/lib/seo';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} | ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  alternates: {
    canonical: canonical('/'),
    types: { 'application/rss+xml': canonical('/feed.xml') },
  },
  openGraph: {
    type: 'website',
    siteName: site.name,
    locale: site.locale,
    url: canonical('/'),
    title: `${site.name} | ${site.tagline}`,
    description: site.description,
    images: [
      {
        url: canonical('/media/hero/nashroam-skyline-hero.jpg'),
        width: 2400,
        height: 1350,
        alt: 'Downtown Nashville at sunset above the Cumberland River and Korean Veterans Memorial Bridge.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [canonical('/media/hero/nashroam-skyline-hero.jpg')],
  },
  // Omit robots when indexable (browser/crawler default is index,follow).
  // Preview/staging builds still emit an explicit noindex.
  ...(allowIndexing ? {} : { robots: { index: false, follow: true } }),
  category: 'travel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href={asset('/brand/star.png')} type="image/png" />
        <link rel="apple-touch-icon" href={asset('/brand/nsh.png')} />
        <meta name="theme-color" content="#F8F3E9" />
        {/* Impact requires its non-standard `value` attribute for site verification. */}
        <meta
          name="impact-site-verification"
          {...({ value: '55f0a64c-3f65-40dc-99dc-344896f7b8ed' } as Record<string, string>)}
        />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
        <DemoDataNotice />
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <StickyCta />
      </body>
    </html>
  );
}
