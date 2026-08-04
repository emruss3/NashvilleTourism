import Link from 'next/link';
import { JsonLd, Breadcrumbs, PageHeader, SectionHeader } from '@/components/Ui';
import { EventCard, VenueCard } from '@/components/Cards';
import { HowWeChooseCallout } from '@/components/Trust';
import { venues, guides, upcomingEvents } from '@/lib/content';
import { buildMetadata, isIndexableRecord, itemListSchema } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Live Music in Nashville',
  description:
    'Nashville music venues by type: listening rooms, honky-tonks, and ticketed halls, plus upcoming shows and how to plan a music night.',
  path: '/music/',
});

export default function MusicIndex() {
  const musicGuides = guides.filter((g) => g.cluster === 'Music');
  const concerts = upcomingEvents().filter((e) => e.category === 'Concert').slice(0, 4);

  return (
    <div className="shell pb-16">
      <JsonLd
        data={itemListSchema(
          venues
            .filter(isIndexableRecord)
            .map((x) => ({ name: x.title, url: `/music/${x.slug}/`, description: x.summary })),
          'Nashville Live Music Venues',
        )}
      />
      <Breadcrumbs trail={[{ name: 'Music', href: '/music/' }]} />
      <PageHeader
        eyebrow="Live music"
        title="Live Music in Nashville"
        intro="Three kinds of rooms matter here: free honky-tonks where bands play for tips, small listening rooms built around songwriters, and ticketed halls. Pick the format first, then the night."
      />

      <section className="py-10">
        <SectionHeader title="Venues" description={`${venues.length} listings`} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((v) => (
            <VenueCard key={v.slug} item={v} />
          ))}
        </div>
      </section>

      {concerts.length > 0 && (
        <section className="py-6">
          <SectionHeader title="Upcoming shows" href="/events/" linkLabel="All events" />
          <div className="grid gap-5 lg:grid-cols-2">
            {concerts.map((e) => (
              <EventCard key={e.slug} item={e} />
            ))}
          </div>
        </section>
      )}

      {musicGuides.length > 0 && (
        <section className="py-8">
          <SectionHeader title="Music guides" href="/guides/" linkLabel="All guides" />
          <ul className="grid gap-3 sm:grid-cols-2">
            {musicGuides.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/guides/${g.slug}/`}
                  className="block rounded-card border border-paper-edge bg-white p-4 transition-shadow hover:shadow-lift"
                >
                  <span className="font-sans text-lg font-bold">{g.title}</span>
                  <span className="mt-1 block text-[15px] text-ink-soft">{g.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="py-8">
        <HowWeChooseCallout />
      </div>
    </div>
  );
}
