import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs, JsonLd, PageHeader, SectionHeader } from '@/components/Ui';
import { GuideCard } from '@/components/Cards';
import { authors, getAuthor, guides } from '@/lib/content';
import { buildMetadata, personSchema } from '@/lib/seo';

export function generateStaticParams() {
  return authors.map((a) => ({ slug: a.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const a = getAuthor(params.slug);
  if (!a) return buildMetadata({ title: 'Not found', description: '', path: '/authors/', noindex: true });
  return buildMetadata({
    title: `${a.name}, ${a.role}`,
    description: a.bio,
    path: `/authors/${a.slug}/`,
    type: 'article',
    noindex: a.name.startsWith('['),
  });
}

export default function AuthorPage({ params }: { params: { slug: string } }) {
  const a = getAuthor(params.slug);
  if (!a) notFound();

  const written = guides.filter((g) => g.authorSlug === a.slug);
  const edited = guides.filter((g) => g.editorSlug === a.slug);

  return (
    <div className="shell pb-16">
      {!a.name.startsWith('[') && <JsonLd data={personSchema(a)} />}
      <Breadcrumbs
        trail={[
          { name: 'Authors', href: '/authors/' },
          { name: a.name, href: `/authors/${a.slug}/` },
        ]}
      />
      <PageHeader eyebrow={a.role} title={a.name} intro={a.bio} />

      <dl className="mt-6 grid max-w-2xl gap-4 sm:grid-cols-3">
        <div>
          <dt className="eyebrow">Based in</dt>
          <dd className="mt-1 text-[15px] text-ink-soft">{a.basedIn}</dd>
        </div>
        <div>
          <dt className="eyebrow">Covers</dt>
          <dd className="mt-1 text-[15px] text-ink-soft">{a.covers.join(', ')}</dd>
        </div>
        {a.email && (
          <div>
            <dt className="eyebrow">Contact</dt>
            <dd className="mt-1 text-[15px]">
              <a href={`mailto:${a.email}`} className="text-clay underline underline-offset-2">
                {a.email}
              </a>
            </dd>
          </div>
        )}
      </dl>

      {written.length > 0 && (
        <section className="border-t border-paper-edge py-10">
          <SectionHeader title={`Guides by ${a.name}`} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {written.map((g) => (
              <GuideCard key={g.slug} item={g} />
            ))}
          </div>
        </section>
      )}

      {edited.length > 0 && (
        <section className="border-t border-paper-edge py-10">
          <SectionHeader title="Edited by this author" />
          <ul className="grid gap-2 sm:grid-cols-2">
            {edited.map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}/`} className="text-[15px] text-clay hover:underline">
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
