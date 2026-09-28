import { notFound } from 'next/navigation';
import BrowsePage from '@/components/private-events/BrowsePage';
import { listVenues } from '@/lib/events/venues';
import { parseShortlist, sizeBandBySlug, venueFitsBand } from '@/lib/private-events';
import { buildMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;

export async function generateMetadata(props: { params: Promise<{ band: string }> }) {
  const { band } = await props.params;
  const b = sizeBandBySlug(band);
  if (!b) return buildMetadata({ title: 'Not found', description: '', path: '/private-events/', noindex: true });
  return buildMetadata({
    title: `Nashville private event venues for ${b.label.toLowerCase()} guests`,
    description: `Rooms and buyouts sized for ${b.label.toLowerCase()} guests, with published capacities and minimums. Send one brief to up to five venues.`,
    path: `/private-events/size/${b.slug}/`,
    canonicalPath: '/private-events/',
  });
}

export default async function SizePage(props: { params: Promise<{ band: string }>; searchParams?: Promise<Params> }) {
  const { band } = await props.params;
  const query = (await props.searchParams) ?? {};
  const b = sizeBandBySlug(band);
  if (!b) notFound();
  const all = await listVenues();
  const venues = all.filter((v) => venueFitsBand(v, b));
  return (
    <BrowsePage
      crumb={{ name: `${b.label} guests`, href: `/private-events/size/${b.slug}/` }}
      eyebrow="Private events by size"
      title={`${b.label} guests`}
      line={`Spaces whose published capacity fits a group of ${b.label.toLowerCase()}.`}
      venues={venues}
      allVenues={all}
      shortlist={parseShortlist(query.v)}
      emptyDescription={`No published space fits ${b.label.toLowerCase()} guests yet. Send a brief with your headcount and the events desk matches you by hand.`}
    />
  );
}
