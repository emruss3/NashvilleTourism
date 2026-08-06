import Link from 'next/link';

const TRIP_LINKS = [
  { label: 'First Visit', href: '/plan/?type=first-visit' },
  { label: 'Couples', href: '/plan/?type=couples' },
  { label: 'Group Trip', href: '/plan/?type=bachelorette' },
  { label: 'Family', href: '/plan/?type=family' },
] as const;

export default function PlanningStrip() {
  return (
    <section className="border-b border-paper-edge bg-paper py-10 lg:py-12">
      <div className="shell flex flex-col gap-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
        <h2 className="font-sans text-xl font-bold tracking-tight text-ink sm:text-2xl">
          What kind of trip are you planning?
        </h2>
        <nav aria-label="Trip types" className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {TRIP_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-ink underline-offset-4 transition-colors hover:text-clay hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
