'use client';

import { useSearchParams } from 'next/navigation';
import TripPlanner from '@/components/TripPlanner';

/**
 * Reads the ?type= deep link from the homepage trip-type shortcuts.
 * Split out so the page itself stays a server component.
 */
export default function PlannerClient() {
  const params = useSearchParams();
  const day = (value: string | null) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined);
  const people = Number.parseInt(params.get('people') ?? '', 10);
  return (
    <TripPlanner
      initialType={params.get('type') ?? undefined}
      initialStart={day(params.get('start'))}
      initialEnd={day(params.get('end'))}
      initialTravelers={Number.isFinite(people) && people > 0 ? Math.min(people, 30) : undefined}
    />
  );
}
