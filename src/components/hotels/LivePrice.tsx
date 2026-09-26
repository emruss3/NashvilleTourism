import { formatNightly, type LiveHotelRate } from '@/lib/feeds/hotels-live';

/**
 * "From $X/night" for a live or cached rate. Never rendered without one, and
 * the fetch time rides on the element so a reader can see how fresh it is.
 */
export default function LivePrice({ rate, datesLabel, className = '' }: { rate?: LiveHotelRate; datesLabel?: string; className?: string }) {
  if (!rate) return null;
  const fetched = new Date(rate.fetchedAt);
  return (
    <p className={`text-[15px] text-ink ${className}`} title={`Rate fetched ${fetched.toLocaleString('en-US', { timeZone: 'America/Chicago' })} Nashville time`}>
      <span className="font-semibold">From {formatNightly(rate.nightly)}</span>
      <span className="text-ink-soft"> a night{datesLabel ? ` · ${datesLabel}` : ''}</span>
      {rate.refundable === 'RFN' ? <span className="text-ink-soft"> · free cancellation available</span> : null}
    </p>
  );
}
