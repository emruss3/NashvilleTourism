'use client';

import { usePathname } from 'next/navigation';
import NewsletterForm from './NewsletterForm';

/**
 * The homepage and the newsletter page already carry a full signup module.
 * Repeating it in the footer directly below them reads as a mistake, so it is
 * suppressed on those two routes only.
 */
export default function FooterNewsletter() {
  const pathname = usePathname();
  const suppressed = pathname === '/' || pathname === '/newsletter' || pathname === '/newsletter/';
  if (suppressed) return null;

  return (
    <div className="mt-12 border-t border-paper-edge pt-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-lg">Nashville plans, once a week.</h2>
          <p className="mt-1 text-sm text-ink-soft">
            New openings, weekend events, restaurant recommendations, and practical local guidance.
          </p>
        </div>
        <NewsletterForm location="footer" />
      </div>
    </div>
  );
}
