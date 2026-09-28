import { notFound } from 'next/navigation';
import BrowsePage from '@/components/private-events/BrowsePage';
import { rankVenues } from '@/lib/events/venue-rank';
import { listVenues } from '@/lib/events/venues';
import { occasionBySlug, parseShortlist } from '@/lib/private-events';
import { buildMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;

export async function generateMetadata(props: { params: Promise<{ occasion: string }> }) {
  const { occasion } = await props.params;
  const o = occasionBySlug(occasion);
  if (!o) return buildMetadata({ title: 'Not found', description: '', path: '/private-events/', noindex: true });
  return buildMetadata({
    title: `${o.title} in Nashville: venues with published capacities`,
    description: `${o.line} Nashville venues that publish seated and standing capacity and minimums, ordered by fit. Send one brief to up to five.`,
    path: `/private-events/occasions/${o.slug}/`,
    // A filtered view until a person writes the editorial intro; then it stands on its own.
    canonicalPath: o.intro?.length ? undefined : '/private-events/',
  });
}

export default async function OccasionPage(props: { params: Promise<{ occasion: string }>; searchParams?: Promise<Params> }) {
  const { occasion } = await props.params;
  const query = (await props.searchParams) ?? {};
  const o = occasionBySlug(occasion);
  if (!o) notFound();
  const all = await listVenues();
  const venues = rankVenues(all, { needs: o.needs }).map((r) => r.venue);
  return (
    <BrowsePage
      crumb={{ name: o.title, href: `/private-events/occasions/${o.slug}/` }}
      eyebrow="Private events by occasion"
      title={o.title}
      line={o.line}
      intro={o.intro}
      venues={venues}
      allVenues={all}
      shortlist={parseShortlist(query.v)}
      emptyDescription={`No venue is published yet. Send a brief for your ${o.title.toLowerCase().replace(/s$/, '')} and the events desk matches you by hand.`}
    />
  );
}
