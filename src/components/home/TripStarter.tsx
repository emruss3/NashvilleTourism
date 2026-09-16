import { site } from '@/lib/site';

/**
 * Trip planner band (SITE-LAYOUT.md §Trip planner). Required headline:
 * "One good plan changes everything." A GET form hands arrival, departure
 * and party size to /plan/, which asks interests and pace next. The date
 * inputs are real controls, not a decorative selector.
 */
export default function TripStarter() {
  return (
    <section className="section border-y border-paper-edge bg-paper-sunk" aria-labelledby="trip-title">
      <div className="shell grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
        <div>
          <p className="eyebrow">Plan your trip</p>
          <h2 id="trip-title" className="mt-3 max-w-[12ch] text-[2.5rem] leading-[1.02] sm:text-[3.25rem] lg:text-[4rem]">
            {site.brandIdea}
          </h2>
        </div>
        <form action="/plan/" method="get" aria-label="Build a trip" className="lg:pt-2">
          <p className="text-[17px] text-ink">Find the shows, tables and places that make the trip yours.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="grid grid-cols-2 gap-2 sm:col-span-2 sm:grid-cols-3">
              <div>
                <label htmlFor="trip-start" className="mb-1.5 block text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                  Arriving
                </label>
                <input id="trip-start" name="start" type="date" className="field-input" />
              </div>
              <div>
                <label htmlFor="trip-end" className="mb-1.5 block text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                  Leaving
                </label>
                <input id="trip-end" name="end" type="date" className="field-input" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor="trip-people" className="mb-1.5 block text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                  People
                </label>
                <input id="trip-people" name="people" type="number" min={1} max={30} defaultValue={2} inputMode="numeric" className="field-input" />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full sm:w-auto">
              Build a trip
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
