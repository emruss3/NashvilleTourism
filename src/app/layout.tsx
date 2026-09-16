import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { JsonLd } from '@/components/Ui';
import BottomNav from '@/components/BottomNav';
import { allowIndexing, asset, organizationSchema, websiteSchema, canonical } from '@/lib/seo';
import { site } from '@/lib/site';

/** GA4 measurement ID — public by design; override via NEXT_PUBLIC_GA_ID at build time. */
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-X1YXCSYL9B';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} | ${site.tagline} | ${site.titleSuffix}`,
    template: `%s | ${site.titleSuffix}`,
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
    title: `${site.name} | ${site.tagline} | ${site.titleSuffix}`,
    description: site.description,
    images: [
      {
        url: canonical('/media/social/og-default.jpg'),
        width: 1200,
        height: 630,
        alt: 'Downtown Nashville at sunset above the Cumberland River and Korean Veterans Memorial Bridge.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [canonical('/media/social/og-default.jpg')],
  },
  // Omit robots when indexable (browser/crawler default is index,follow).
  // Preview/staging builds still emit an explicit noindex.
  ...(allowIndexing ? {} : { robots: { index: false, follow: true } }),
  category: 'travel',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Lets the sticky bottom bar and the body padding extend under the home
  // indicator on notched phones; safe-area insets handle the offset.
  viewportFit: 'cover',
  themeColor: '#F5F3ED',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google tag (gtag.js) — single sitewide install; do not duplicate on child pages. */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        {/* Placeholder: no small-size NSVL derivative is approved yet (brand guide §3). */}
        <link rel="icon" href={asset('/brand/nsvl/favicon-placeholder.svg')} type="image/svg+xml" />
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
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}
