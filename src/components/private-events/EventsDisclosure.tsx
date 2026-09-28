import Link from 'next/link';

/**
 * How the marketplace is paid, on the hub and every venue page. The formal
 * statement lives at /advertising/#disclosure; this is the plain version.
 */
export default function EventsDisclosure({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-2xs text-ink-soft">
        Nashville.com is paid by the venue only if your event books: 5% of contracted spend, $250 minimum. Planners pay nothing. Fees, ownership and sponsorship never change which venues we suggest or their order.{' '}
        <Link href="/advertising/#disclosure" className="underline hover:text-ink">
          How this works
        </Link>
      </p>
    );
  }
  return (
    <div className="rounded-card border border-paper-edge bg-paper-sunk p-5 text-[15px] text-ink-soft">
      <p>
        <strong className="font-semibold text-ink">How Nashville.com is paid.</strong> When an event that started here books, the venue pays Nashville.com 5% of the contracted spend, with a $250 minimum. Planners pay nothing, and the venue&rsquo;s price to you is the same either way.
      </p>
      <p className="mt-2">
        Three venues here are owned by BPH Hospitality, Nashville.com&rsquo;s parent company. They are labeled, and they are listed on the same terms as every other venue. Sponsored placements, when they exist, are labeled too. Ranking is never a function of fees, ownership or sponsorship.{' '}
        <Link href="/advertising/#disclosure" className="font-semibold text-ink underline underline-offset-[0.2em]">
          The full disclosure
        </Link>
      </p>
    </div>
  );
}
