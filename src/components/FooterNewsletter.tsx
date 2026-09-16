'use client';

import { usePathname } from 'next/navigation';
import { site } from '@/lib/site';
import NewsletterForm from './NewsletterForm';

/**
 * The homepage and the newsletter page already carry a full signup module.
 * Repeating it in the footer directly below them reads as a mistake, so it is
 * suppressed on those two routes only.
 */
export default function FooterNewsletter() {
  const pathname = usePathname();
  const suppressed =
    pathname === '/' ||
    pathname === '/newsletter' ||
    pathname === '/newsletter/' ||
    pathname === '/homepage-v2' ||
    pathname === '/homepage-v2/';
  if (suppressed) return null;

  return (
    <div className="mt-12 border-t border-paper/15 pt-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-xl text-paper">{site.newsletter.heading}</h2>
          <p className="mt-1 text-sm text-paper/80">{site.newsletter.promise}</p>
        </div>
        <NewsletterForm location="footer" tone="dark" />
      </div>
    </div>
  );
}
