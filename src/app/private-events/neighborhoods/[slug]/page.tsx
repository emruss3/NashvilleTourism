import Link from 'next/link';
import { notFound } from 'next/navigation';
import BrowsePage from '@/components/private-events/BrowsePage';
import { getNeighborhood } from '@/lib/content/neighborhoods';
import { listVenues } from '@/lib/events/venues';
import { parseShortlist } from '@/lib/private-events';
import { buildMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const n = getNeighborhood(slug);
  if (!n) return buildMetadata({ title: 'Not found', description: '', path: '/private-events/', noindex: true });
  return buildMetadata({
    title: `Private event venues in ${n.name}`,
    description: `${n.name} venues that publish seated and standing capacity and minimums for private events. Send one brief to up to five.`,
    path: `/private-events/neighborhoods/${n.slug}/`,
    // A filtered view of the hub until the neighborhood intro is written by a person.
    canonicalPath: '/private-events/',
  });
}

export default async function NeighborhoodVenuesPage(props: { params: Promise<{ slug: string }>; searchParams?: Promise<Params> }) {
  const { slug } = await props.params;
  const query = (await props.searchParams) ?? {};
  const n = getNeighborhood(slug);
  if (!n) notFound();
  const all = await listVenues();
  const venues = all.filter((v) => v.neighborhoodSlug === n.slug);
  return (
    <BrowsePage
      crumb={{ name: n.name, href: `/private-events/neighborhoods/${n.slug}/` }}
      eyebrow="Private events by neighborhood"
      title={n.name}
      line={`Venues in ${n.name} that publish their capacities and minimums.`}
      venues={venues}
      allVenues={all}
      shortlist={parseShortlist(query.v)}
      emptyDescription={`No ${n.name} venue is published yet. Send a brief and say ${n.name}; the events desk matches you by hand.`}
      aside={
        <Link href={`/neighborhoods/${n.slug}/`} className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-ink underline underline-offset-[0.2em]">
          The {n.name} guide
          <span aria-hidden="true">→</span>
        </Link>
      }
    />
  );
}
