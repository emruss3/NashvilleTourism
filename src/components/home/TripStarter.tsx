import { OCCASIONS } from '@/lib/group-planner';
import { site } from '@/lib/site';

/**
 * Group planner starter (HOMEPAGE.md §6). A charcoal band with the required
 * headline, an accessible occasion selector that carries all seven group
 * types, a people count, and Build our trip. Dates, ages, budget and
 * group-specific questions continue on /plan; the GET form hands occasion
 * and headcount across so they are preserved there.
 */
export default function TripStarter({ className = '' }: { className?: string }) {
  return (
    <section className={`section bg-ink text-paper ${className}`} aria-labelledby="trip-title">
      <div className="shell grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-12">
        <div>
          <p className="eyebrow text-paper/75">Group planner</p>
          <h2 id="trip-title" className="mt-2 max-w-[12ch] text-[2.5rem] leading-[1.02] text-paper sm:text-[3rem] lg:text-[4rem]">
            {site.brandIdea}
          </h2>
        </div>
        <form action="/plan/" method="get" aria-label="Start a group trip plan">
          <p className="text-[17px] text-paper/90">Tell us who is coming. We’ll build the trip around you.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-[1.4fr_1fr_auto] sm:items-end">
            <div>
              <label htmlFor="trip-occasion" className="mb-1.5 block text-2xs font-semibold uppercase tracking-[0.14em] text-paper/75">
                Occasion
              </label>
              <select
                id="trip-occasion"
                name="occasion"
                defaultValue="friends"
                className="field-input h-14 border-paper/60 bg-transparent text-paper [color-scheme:dark] focus:border-paper"
              >
                {OCCASIONS.map((o) => (
                  <option key={o.value} value={o.value} className="text-ink">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="trip-people" className="mb-1.5 block text-2xs font-semibold uppercase tracking-[0.14em] text-paper/75">
                People
              </label>
              <input
                id="trip-people"
                name="people"
                type="number"
                min={1}
                max={60}
                defaultValue={4}
                inputMode="numeric"
                className="field-input h-14 border-paper/60 bg-transparent text-paper placeholder:text-paper/60 focus:border-paper"
              />
            </div>
            <button type="submit" className="btn-reverse h-14 w-full px-7 text-base sm:w-auto">
              Build our trip
              <span aria-hidden="true">→</span>
            </button>
          </div>
          <p className="mt-3 text-2xs text-paper/70">Dates, ages and budget come next. Saving a plan never books anything.</p>
        </form>
      </div>
    </section>
  );
}
