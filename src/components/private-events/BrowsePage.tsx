import Link from 'next/link';
import type { ReactNode } from 'react';
import { Breadcrumbs } from '@/components/Ui';
import type { EventVenue } from '@/lib/events/types';
import { withShortlist } from '@/lib/private-events';
import EventsDisclosure from './EventsDisclosure';
import ShortlistBar from './Shortlist';
import { VenueGrid } from './VenueCard';

/**
 * Shared layout for the occasion, neighborhood and size browse pages. The
 * editorial intro is human-written content; until it exists the page carries
 * only the one-line functional description and canonicals to the hub.
 */
export default function BrowsePage({
  crumb,
  eyebrow,
  title,
  line,
  intro,
  venues,
  allVenues,
  shortlist,
  emptyDescription,
  aside,
}: {
  crumb: { name: string; href: string };
  eyebrow: string;
  title: string;
  line: string;
  intro?: string[];
  venues: EventVenue[];
  allVenues: EventVenue[];
  shortlist: string[];
  emptyDescription: string;
  aside?: ReactNode;
}) {
  return (
    <>
      <div className="shell">
        <Breadcrumbs trail={[{ name: 'Private events', href: '/private-events/' }, crumb]} />
      </div>
      <header className="shell pt-4">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 text-[2.25rem] leading-[0.98] sm:text-[3rem]">{title}</h1>
        <p className="mt-3 max-w-xl text-[17px] text-ink-soft">{line}</p>
        {intro?.length ? (
          <div className="prose-editorial mt-6 max-w-prose">
            {intro.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>
        ) : null}
        {aside ? <div className="mt-5">{aside}</div> : null}
      </header>
      <section className="shell py-8" aria-label="Venues">
        <p className="mb-4 text-sm text-ink-soft">
          {venues.length ? `${venues.length} ${venues.length === 1 ? 'venue' : 'venues'}, ordered by fit. ` : ''}
          <Link href={withShortlist('/private-events/', shortlist)} className="font-semibold text-ink underline underline-offset-[0.2em]">
            All private event venues
          </Link>
        </p>
        <VenueGrid venues={venues} shortlist={shortlist} empty={{ title: 'Nothing listed here yet.', description: emptyDescription }} />
      </section>
      <section id="inquiry" className="shell scroll-mt-20 pb-24">
        <div className="grid gap-4 rounded-card border-2 border-ink bg-paper p-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <h2 className="font-display text-[1.5rem] font-extrabold tracking-[-0.03em]">Send one brief to up to five venues.</h2>
            <p className="mt-1 text-[15px] text-ink-soft">They reply within 24 business hours. You confirm with the venue.</p>
          </div>
          <Link href={withShortlist('/private-events/#inquiry', shortlist)} className="btn-primary">
            Start a brief
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="mt-6">
          <EventsDisclosure compact />
        </div>
      </section>
      <ShortlistBar venues={allVenues.map((v) => ({ slug: v.slug, name: v.name }))} />
    </>
  );
}
