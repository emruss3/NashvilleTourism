import Link from 'next/link';
import Dashboard from '@/components/venues/Dashboard';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Venue dashboard',
  description: 'Edit your Nashville.com private events listing.',
  path: '/venues/',
  noindex: true,
});

/**
 * /venues/: the venue's own dashboard. Everything happens in the browser
 * against Supabase under the signed-in user's row level security; this page
 * only frames it.
 */
export default function VenuesPage() {
  return (
    <div className="shell pb-24 pt-6">
      <p className="eyebrow">Nashville.com private events</p>
      <h1 className="mt-2 text-[2rem] sm:text-[2.5rem]">Your listing.</h1>
      <p className="mt-2 max-w-prose text-[15px] text-ink-soft">
        Capacities, pricing, photos and packages for your spaces. Planners see price bands, never your exact minimums.{' '}
        <Link href="/advertising/#disclosure" className="underline underline-offset-[0.2em]">
          How the referral works
        </Link>
      </p>
      <div className="mt-8">
        <Dashboard />
      </div>
    </div>
  );
}
