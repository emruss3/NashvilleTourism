'use client';

import { useSearchParams } from 'next/navigation';
import GroupPlanner from '@/components/planner/GroupPlanner';
import { occasionFromType } from '@/lib/group-planner';

/**
 * Reads deep links into the planner: `?occasion=` (or the older `?type=`),
 * `?start`, `?end` and `?people` from the homepage trip band, the events
 * page and copied plan links. Split out so the page stays a server component.
 */
export default function PlannerClient() {
  const params = useSearchParams();
  const day = (value: string | null) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined);
  const people = Number.parseInt(params.get('people') ?? '', 10);
  return (
    <GroupPlanner
      initialOccasion={occasionFromType(params.get('occasion') ?? params.get('type') ?? undefined)}
      initialStart={day(params.get('start'))}
      initialEnd={day(params.get('end'))}
      initialPeople={Number.isFinite(people) && people > 0 ? Math.min(people, 60) : undefined}
    />
  );
}
