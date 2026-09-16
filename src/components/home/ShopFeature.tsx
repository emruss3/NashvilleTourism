import Link from 'next/link';
import { NsvlMark } from '@/components/Wordmark';

/**
 * Shop panel ("Good here. Good anywhere."). Sits directly after the calendar
 * on phones so the shop is not buried after a long catalog.
 *
 * ASSET STATUS: no apparel campaign photograph has been supplied, so the
 * panel is typographic: the reversed mark on a charcoal ground with the
 * approved lines. Swap in the licensed image when it exists.
 */
export default function ShopFeature() {
  return (
    <div className="flex h-full flex-col justify-between rounded-card bg-ink p-6 text-paper sm:p-8">
      <div>
        <p className="eyebrow text-paper/70">Shop</p>
        <h2 className="mt-2 text-[2.25rem] text-paper">Good here. Good anywhere.</h2>
        <p className="mt-3 max-w-xs text-[15px] text-paper/85">Nashville, worn your way.</p>
      </div>
      <div className="mt-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <NsvlMark tone="paper" width={140} decorative />
        <Link href="/shop/" className="btn-reverse shrink-0">
          Shop NSVL
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
