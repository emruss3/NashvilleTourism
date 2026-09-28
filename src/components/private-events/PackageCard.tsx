'use client';

import { ANALYTICS_EVENTS, track } from '@/lib/analytics';
import { formatUsd, type EventPackage } from '@/lib/events/types';
import { occasionByValue } from '@/lib/private-events';

/**
 * An instant answer: a fixed offer, its price and a link into the venue's
 * own booking page. The only place "From $X" appears. The deposit, if any,
 * is taken by the venue; nothing is paid here.
 */
export default function PackageCard({ pkg, venueName, venueSlug }: { pkg: EventPackage; venueName: string; venueSlug: string }) {
  const href = pkg.bookUrl ? `${pkg.bookUrl}${pkg.bookUrl.includes('?') ? '&' : '?'}ref=nashville&client_reference=${encodeURIComponent(`nsh:package:${venueSlug}:${pkg.slug}`)}` : undefined;
  const guests = pkg.minGuests && pkg.maxGuests ? `${pkg.minGuests} to ${pkg.maxGuests} guests` : pkg.maxGuests ? `up to ${pkg.maxGuests} guests` : undefined;
  return (
    <article className="flex h-full flex-col rounded-card border-2 border-ink bg-paper p-5">
      <p className="eyebrow">Book now</p>
      <h3 className="mt-1 font-sans text-[17px] font-bold text-ink">{pkg.name}</h3>
      {pkg.summary ? <p className="mt-1 text-[15px] leading-snug text-ink-soft">{pkg.summary}</p> : null}
      <p className="mt-3 text-[17px] text-ink">
        From <strong className="font-semibold">{formatUsd(pkg.priceCents / 100)}</strong>
        {pkg.priceBasis === 'per_person' ? ' a person' : ''}
        {guests ? <span className="text-ink-soft"> · {guests}</span> : null}
      </p>
      {pkg.includes.length ? (
        <ul className="mt-3 grid gap-1 text-[15px] text-ink">
          {pkg.includes.map((line) => (
            <li key={line}>• {line}</li>
          ))}
        </ul>
      ) : null}
      {pkg.forOccasions.length ? <p className="mt-2 text-sm text-ink-soft">Good for {pkg.forOccasions.map((o) => occasionByValue(o)?.title.toLowerCase() ?? o).join(', ')}.</p> : null}
      <div className="mt-auto pt-4">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            onClick={() => track(ANALYTICS_EVENTS.EVENTS_PACKAGE_CLICKED, { item_id: `${venueSlug}:${pkg.slug}`, item_name: pkg.name, item_type: 'event_package', partner: venueName, placement: 'editorial', value: pkg.priceCents / 100, client_reference: `nsh:package:${venueSlug}:${pkg.slug}` })}
          >
            Book with {venueName}
            <span className="sr-only"> (opens in a new tab)</span>
            <span aria-hidden="true">→</span>
          </a>
        ) : null}
        <p className="mt-2 text-2xs text-ink-soft">{pkg.depositNote ? `${pkg.depositNote} ` : ''}Booking and any deposit happen on {venueName}&rsquo;s own page.</p>
      </div>
    </article>
  );
}
