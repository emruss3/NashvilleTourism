import { Suspense } from 'react';
import { Breadcrumbs, LoadingState, PageHeader } from '@/components/Ui';
import PlannerClient from './PlannerClient';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Nashville Trip Planner',
  description:
    'Build a Nashville itinerary around your dates, trip type, budget, and pace. Day-by-day plans with travel times, booking lead times, and alternatives.',
  path: '/plan/',
});

export default function PlanPage() {
  return (
    <div className="shell pb-16">
      <Breadcrumbs trail={[{ name: 'Trip Planner', href: '/plan/' }]} />
      <PageHeader
        eyebrow="Trip planner"
        title="Plan your Nashville trip"
        intro="Answer a few questions and we will assemble a day-by-day plan from our published listings, with travel time between stops and how far ahead to book."
      />
      <div className="py-10">
        <Suspense fallback={<LoadingState label="Loading the planner" />}>
          <PlannerClient />
        </Suspense>
      </div>
    </div>
  );
}
