import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs, JsonLd, PageHeader, SectionHeader } from '@/components/Ui';
import { GuideCard, PhotoSlot } from '@/components/Cards';
import { Byline, VerificationBadge } from '@/components/Trust';
import ScrollDepth from '@/components/ScrollDepth';
import { guides, getGuide, getAuthor } from '@/lib/content';
import { articleSchema, buildMetadata, faqSchema } from '@/lib/seo';

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const g = getGuide(params.slug);
  if (!g) return buildMetadata({ title: 'Not found', description: '', path: '/guides/', noindex: true });
  const author = getAuthor(g.authorSlug);
  return buildMetadata({
    title: g.title,
    description: g.summary,
    path: `/guides/${g.slug}/`,
    type: 'article',
    publishedTime: g.datePublished,
    modifiedTime: g.dateUpdated || g.datePublished,
    authorName: author?.name,
  });
}

function slugifyHeading(h: string) {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function GuidePage({ params }: { params: { slug: string } }) {
  const g = getGuide(params.slug);
  if (!g) notFound();

  const author = getAuthor(g.authorSlug);
  const editor = g.editorSlug ? getAuthor(g.editorSlug) : undefined;
  const related = g.relatedSlugs.map((s) => getGuide(s)).filter((x): x is NonNullable<typeof x> => Boolean(x));
  const path = `/guides/${g.slug}/`;

  return (
    <div className="shell pb-16">
      <JsonLd data={[articleSchema(g, author, path), ...(g.faqs.length ? [faqSchema(g.faqs)] : [])]} />
      <ScrollDepth slug={g.slug} />
      <Breadcrumbs
        trail={[
          { name: 'Guides', href: '/guides/' },
          { name: g.title, href: path },
        ]}
      />

      <PageHeader eyebrow={g.cluster} title={g.title} intro={g.summary} />

      <div className="mt-5 max-w-prose">
        <Byline
          authorName={author?.name ?? 'Editorial desk'}
          authorSlug={g.authorSlug}
          editorName={editor?.name}
          published={g.datePublished}
          updated={g.dateUpdated}
          readingTime={g.readingTimeMinutes}
        />
      </div>

      {/* Short answer sits above the fold so readers can leave satisfied fast. */}
      <div className="mt-8 max-w-prose rounded-card border-l-4 border-clay bg-clay-wash p-5">
        <p className="eyebrow mb-1.5 text-clay-deep">The short answer</p>
        <p className="text-[17px] leading-relaxed text-ink">{g.shortAnswer}</p>
      </div>

      <div className="grid gap-12 py-10 lg:grid-cols-[1fr_240px]">
        <article className="min-w-0">
          <PhotoSlot label={g.title} ratio="aspect-[16/9]" className="mb-8 rounded-card" />

          <div className="prose-editorial">
            {g.intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {g.sections.map((section) => (
            <section key={section.heading} id={slugifyHeading(section.heading)} className="pt-10">
              <h2 className="text-2xl">{section.heading}</h2>
              <div className="prose-editorial mt-3">
                {section.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ))}

          {g.faqs.length > 0 && (
            <section id="faqs" className="pt-12">
              <h2 className="text-2xl">Common questions</h2>
              <dl className="mt-4 divide-y divide-paper-edge border-y border-paper-edge">
                {g.faqs.map((f) => (
                  <div key={f.question} className="py-4">
                    <dt className="font-display text-lg text-ink">{f.question}</dt>
                    <dd className="mt-1.5 max-w-prose text-[16px] leading-relaxed text-ink-soft">{f.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <div className="mt-10 rounded-card border border-paper-edge bg-paper-sunk p-5">
            <div className="flex flex-wrap items-center gap-3">
              <VerificationBadge status={g.dataStatus} date={g.dateChecked} />
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              We review this guide on a regular schedule. If a detail has changed,{' '}
              <Link href="/corrections/" className="text-clay underline underline-offset-2">
                send us a correction
              </Link>
              .
            </p>
          </div>
        </article>

        {/* Table of contents */}
        <aside className="hidden lg:block">
          <nav aria-labelledby="toc-heading" className="sticky top-24">
            <h2 id="toc-heading" className="eyebrow mb-3">
              On this page
            </h2>
            <ul className="space-y-2 border-l border-paper-edge">
              {g.sections.map((s) => (
                <li key={s.heading}>
                  <a
                    href={`#${slugifyHeading(s.heading)}`}
                    className="-ml-px block border-l-2 border-transparent pl-3 text-sm leading-snug text-ink-soft hover:border-clay hover:text-clay"
                  >
                    {s.heading}
                  </a>
                </li>
              ))}
              {g.faqs.length > 0 && (
                <li>
                  <a
                    href="#faqs"
                    className="-ml-px block border-l-2 border-transparent pl-3 text-sm leading-snug text-ink-soft hover:border-clay hover:text-clay"
                  >
                    Common questions
                  </a>
                </li>
              )}
            </ul>
          </nav>
        </aside>
      </div>

      {author && (
        <section className="border-t border-paper-edge py-10">
          <h2 className="eyebrow mb-3">About the author</h2>
          <div className="max-w-prose">
            <p className="font-display text-xl">
              <Link href={`/authors/${author.slug}/`} className="hover:text-clay">
                {author.name}
              </Link>
            </p>
            <p className="text-sm text-ink-faint">{author.role}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{author.bio}</p>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="border-t border-paper-edge py-10">
          <SectionHeader title="Related guides" href="/guides/" linkLabel="All guides" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((x) => (
              <GuideCard key={x.slug} item={x} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
