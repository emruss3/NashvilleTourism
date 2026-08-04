import Link from 'next/link';
import { Breadcrumbs, PageHeader } from '@/components/Ui';
import { authors } from '@/lib/content';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Our writers and editors',
  description:
    'The people who write and edit this guide, what they cover, and how to reach them.',
  path: '/authors/',
  noindex: true,
});

export default function AuthorsIndex() {
  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Authors', href: '/authors/' }]} />
      <PageHeader
        eyebrow="The desk"
        title="Our writers and editors"
        intro="Every guide carries a byline and an editor. Both are reachable, and both are accountable for what we publish."
      />
      <div className="grid gap-5 py-10 sm:grid-cols-2 lg:grid-cols-3">
        {authors.map((a) => (
          <article key={a.slug} className="card p-5">
            <h2 className="font-sans text-xl font-bold">
              <Link href={`/authors/${a.slug}/`} className="hover:text-clay">
                {a.name}
              </Link>
            </h2>
            <p className="text-sm text-ink-faint">{a.role}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{a.bio}</p>
            <p className="mt-3 text-sm text-ink-faint">Covers {a.covers.join(', ')}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
