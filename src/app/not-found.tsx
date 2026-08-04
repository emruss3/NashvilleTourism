import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Page not found',
  description: 'The page you were looking for does not exist or has moved.',
  path: '/404/',
  noindex: true,
});

export default function NotFound() {
  return (
    <div className="shell py-24">
      <div className="mx-auto max-w-xl text-center">
        <p className="eyebrow mb-3">404</p>
        <h1 className="text-4xl">We could not find that page</h1>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
          The link may be out of date, or the page may have moved. Start from one of these instead.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary">
            Home
          </Link>
          <Link href="/guides/" className="btn-secondary">
            Guides
          </Link>
          <Link href="/restaurants/" className="btn-secondary">
            Restaurants
          </Link>
          <Link href="/neighborhoods/" className="btn-secondary">
            Neighborhoods
          </Link>
          <Link href="/search/" className="btn-secondary">
            Search
          </Link>
        </div>
      </div>
    </div>
  );
}
