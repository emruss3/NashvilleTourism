import Link from 'next/link';
import { BedIcon, CalendarIcon, ForkIcon, PinIcon, SparkleIcon, TreeIcon } from '@/components/Icons';

/**
 * Category navigation (HOMEPAGE.md §3): compact links into the six
 * discovery families. All six stay visible at every width as a two-row grid
 * on phones; nothing hides in a swipe-only rail. Shop and Plan live in the
 * primary navigation and their own homepage modules.
 */
const CATEGORIES = [
  { label: 'Restaurants', href: '/restaurants/', icon: ForkIcon },
  { label: 'Tours', href: '/tours/', icon: PinIcon },
  { label: 'Neighborhoods', href: '/neighborhoods/', icon: TreeIcon },
  { label: 'Things to do', href: '/things-to-do/', icon: SparkleIcon },
  { label: 'Events', href: '/events/', icon: CalendarIcon },
  { label: 'Hotels', href: '/hotels/', icon: BedIcon },
] as const;

export default function CategoryLinks() {
  return (
    <nav aria-label="Explore by category" className="border-b border-paper-edge">
      <ul className="shell grid grid-cols-3 md:grid-cols-6">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <li key={c.href}>
              <Link
                href={c.href}
                className="flex min-h-14 flex-col items-center justify-center gap-1 whitespace-nowrap border-b-2 border-transparent px-1 py-2 text-center text-[13px] font-semibold text-ink hover:border-ink md:text-[14px] lg:min-h-16 lg:flex-row lg:gap-2 lg:text-[15px]"
              >
                <Icon size={20} />
                {c.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
