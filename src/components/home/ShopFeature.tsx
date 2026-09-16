import Link from 'next/link';
import { SmartImage } from '@/components/Media';

/**
 * Shop panel ("Good here. Good anywhere."). Sits directly after the calendar
 * on phones so the shop is not buried after a long catalog.
 *
 * ASSET STATUS: the still-life is the owner-approved concept illustration
 * from the brand boards (cap and tee), labelled as an illustration in its
 * alt text. Swap in licensed campaign photography when it exists.
 */
export default function ShopFeature() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-card bg-paper-sunk">
      <div className="relative z-10 p-6 sm:p-8">
        <h2 className="text-[2rem] leading-[1.05] sm:text-[2.5rem] lg:text-[3rem]">
          Good here.
          <br />
          Good anywhere.
        </h2>
        <p className="mt-3 text-[15px] text-ink-soft">Nashville, worn your way.</p>
        <Link href="/shop/" className="btn-primary mt-5">
          Shop NSVL
          <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="relative mt-auto">
        <SmartImage imageKey="concept/shop-still-life" ratio="aspect-[16/10]" sizes="(max-width: 1023px) 100vw, 40vw" />
      </div>
    </div>
  );
}
