import { Suspense } from 'react';
import { Breadcrumbs, LoadingState, PageHeader } from '@/components/Ui';
import SearchClient from './SearchClient';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Search',
  description: 'Search restaurants, hotels, events, neighborhoods, and guides across Nashville.',
  path: '/search/',
  // Search result pages carry no unique value for crawlers.
  noindex: true,
});

export default function SearchPage() {
  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Search', href: '/search/' }]} />
      <PageHeader title="Search" intro="Restaurants, hotels, events, venues, neighborhoods, and guides." />
      <div className="py-8">
        <Suspense fallback={<LoadingState label="Loading search" />}>
          <SearchClient />
        </Suspense>
      </div>
    </div>
  );
}
