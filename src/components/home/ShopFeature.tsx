import Link from 'next/link';
import { NsvlLogo } from '@/components/Wordmark';

/**
 * Shop panel ("Good here. Good anywhere."). Sits directly after the calendar
 * on phones so the shop is not buried after a long catalog.
 *
 * ASSET STATUS: no apparel campaign photograph has been supplied. Until it
 * exists the panel is a Soft Paper still-life of the lockup itself, in the
 * same warm tone as the reference's product photograph, with the approved
 * lines. Swap in the licensed image when it exists.
 */
export default function ShopFeature() {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-card bg-paper-sunk p-6 sm:p-8">
      <div className="relative z-10 max-w-xs">
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
      <div className="relative z-10 mt-8 flex justify-end md:mt-0 md:absolute md:bottom-8 md:right-8">
        <NsvlLogo variant="lockup" width="min(260px, 55%)" decorative className="md:w-[240px]" />
      </div>
    </div>
  );
}
