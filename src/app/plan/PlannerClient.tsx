'use client';

import { useSearchParams } from 'next/navigation';
import TripPlanner from '@/components/TripPlanner';

/**
 * Reads the ?type= deep link from the homepage trip-type shortcuts.
 * Split out so the page itself stays a server component.
 */
export default function PlannerClient() {
  const params = useSearchParams();
  return <TripPlanner initialType={params.get('type') ?? undefined} />;
}
