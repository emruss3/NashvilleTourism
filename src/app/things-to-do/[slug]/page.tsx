import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs, Chip, FactTable, JsonLd, MapLink, PageHeader, SectionHeader } from '@/components/Ui';
import { AttractionCard, PhotoSlot } from '@/components/Cards';
import { ContentImage } from '@/components/Media';
import { PlacementLabel, VerificationBadge, formatDate } from '@/components/Trust';
import { attractions, getAttraction } from '@/lib/content';
import { neighborhoodName } from '@/lib/content/neighborhoods';
import { attractionSchema, buildMetadata, isIndexableRecord } from '@/lib/seo';

export function generateStaticParams() {
  return attractions.map((a) => ({ slug: a.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const a = getAttraction(params.slug);
  if (!a) return buildMetadata({ title: 'Not found', description: '', path: '/things-to-do/', noindex: true });
  return buildMetadata({
    title: a.title,
    description: a.summary,
    path: `/things-to-do/${a.slug}/`,
    type: 'article',
    modifiedTime: a.dateUpdated || a.dateChecked,
    noindex: !isIndexableRecord(a),
  });
}

export default function AttractionPage({ params }: { params: { slug: string } }) {
  const a = getAttraction(params.slug);
  if (!a) notFound();

  const hood = neighborhoodName(a.neighborhood);
  const related = a.relatedSlugs
    .map((s) => getAttraction(s))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return (
    <div className="shell pb-16">
      {isIndexableRecord(a) && (
        <JsonLd data={attractionSchema(a, `/things-to-do/${a.slug}/`)} />
      )}
      <Breadcrumbs
        trail={[
          { name: 'Things to Do', href: '/things-to-do/' },
          { name: a.title, href: `/things-to-do/${a.slug}/` },
        ]}
      />
      <PageHeader
        eyebrow={`${a.category} · ${hood}`}
        title={a.title}
        intro={a.summary}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <VerificationBadge status={a.dataStatus} date={a.dateChecked} />
            <PlacementLabel placement={a.placement} sponsorName={a.sponsorName} />
          </div>
        }
      />

      <div className="grid gap-10 py-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          {a.image?.src ? (
            <ContentImage
              image={a.image}
              ratio="aspect-[16/9]"
              className="rounded-card"
              sizes="(max-width: 1023px) 100vw, 60vw"
              priority
            />
          ) : (
            <PhotoSlot label={a.title} ratio="aspect-[16/9]" className="rounded-card" />
          )}
          <section className="py-8">
            <h2 className="text-2xl">Why we recommend it</h2>
            <div className="prose-editorial mt-3">
              <p>{a.whyWeRecommend}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {a.bestFor.map((b) => (
                <Chip key={b}>{b}</Chip>
              ))}
              {a.indoor && <Chip>Indoor</Chip>}
              {a.familyFriendly && <Chip>Good with kids</Chip>}
            </div>
          </section>
        </div>
        <aside className="space-y-5">
          <FactTable
            rows={[
              { label: 'Neighborhood', value: <Link href={`/neighborhoods/${a.neighborhood}/`} className="text-clay underline underline-offset-2">{hood}</Link> },
              { label: 'Time needed', value: a.timeNeeded },
              { label: 'Cost', value: a.priceNote },
              { label: 'Address', value: a.address },
              { label: 'Last checked', value: <time dateTime={a.dateChecked}>{formatDate(a.dateChecked)}</time> },
            ]}
          />
          <div className="rounded-card border border-paper-edge bg-white p-4">
            <MapLink query={a.mapQuery} label="Directions and map" />
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="border-t border-paper-edge py-10">
          <SectionHeader title="Nearby and related" href="/things-to-do/" linkLabel="All attractions" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((x) => (
              <AttractionCard key={x.slug} item={x} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
