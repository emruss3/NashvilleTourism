import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs, Chip, FactTable, JsonLd, MapLink, PageHeader, SectionHeader } from '@/components/Ui';
import { PhotoSlot, VenueCard } from '@/components/Cards';
import { PlacementLabel, VerificationBadge, formatDate } from '@/components/Trust';
import { venues, getVenue } from '@/lib/content';
import { neighborhoodName } from '@/lib/content/neighborhoods';
import { buildMetadata, isIndexableRecord, musicVenueSchema } from '@/lib/seo';

export function generateStaticParams() {
  return venues.map((v) => ({ slug: v.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const v = getVenue(params.slug);
  if (!v) return buildMetadata({ title: 'Not found', description: '', path: '/music/', noindex: true });
  return buildMetadata({
    title: v.title,
    description: v.summary,
    path: `/music/${v.slug}/`,
    type: 'article',
    modifiedTime: v.dateUpdated || v.dateChecked,
    noindex: !isIndexableRecord(v),
  });
}

export default function VenuePage({ params }: { params: { slug: string } }) {
  const v = getVenue(params.slug);
  if (!v) notFound();

  const hood = neighborhoodName(v.neighborhood);
  const related = v.relatedSlugs.map((s) => getVenue(s)).filter((x): x is NonNullable<typeof x> => Boolean(x));

  return (
    <div className="shell pb-16">
      {isIndexableRecord(v) && (
        <JsonLd data={musicVenueSchema(v, `/music/${v.slug}/`)} />
      )}
      <Breadcrumbs
        trail={[
          { name: 'Music', href: '/music/' },
          { name: v.title, href: `/music/${v.slug}/` },
        ]}
      />
      <PageHeader
        eyebrow={`Venue · ${hood}`}
        title={v.title}
        intro={v.summary}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <VerificationBadge status={v.dataStatus} date={v.dateChecked} />
            <PlacementLabel placement={v.placement} sponsorName={v.sponsorName} />
          </div>
        }
      />

      <div className="grid gap-10 py-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <PhotoSlot label={v.title} ratio="aspect-[16/9]" className="rounded-card" />
          <section className="py-8">
            <h2 className="text-2xl">Why we recommend it</h2>
            <div className="prose-editorial mt-3">
              <p>{v.whyWeRecommend}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {v.genres.map((g) => (
                <Chip key={g}>{g}</Chip>
              ))}
            </div>
          </section>
        </div>
        <aside className="space-y-5">
          <FactTable
            rows={[
              { label: 'Neighborhood', value: <Link href={`/neighborhoods/${v.neighborhood}/`} className="text-clay underline underline-offset-2">{hood}</Link> },
              { label: 'Room size', value: v.capacityNote },
              { label: 'Cover', value: v.coverNote },
              { label: 'Address', value: v.address },
              { label: 'Last checked', value: <time dateTime={v.dateChecked}>{formatDate(v.dateChecked)}</time> },
            ]}
          />
          <div className="rounded-card border border-paper-edge bg-white p-4">
            <MapLink query={v.mapQuery} label="Directions and map" />
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="border-t border-paper-edge py-10">
          <SectionHeader title="Related venues" href="/music/" linkLabel="All venues" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((x) => (
              <VenueCard key={x.slug} item={x} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
