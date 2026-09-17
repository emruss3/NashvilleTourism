import Link from 'next/link';
import { BedIcon, BuildingIcon, CalendarIcon, CarIcon, CheckIcon, ForkIcon, GlassIcon, MusicIcon, PeopleIcon, PinIcon, SparkleIcon } from '@/components/Icons';
import { ContentImage, SmartImage } from '@/components/Media';
import { Breadcrumbs } from '@/components/Ui';
import PageIntro from '@/components/hub/PageIntro';
import SectionHead from '@/components/hub/SectionHead';
import InquiryForm from '@/components/private-events/InquiryForm';
import { hotels } from '@/lib/content';
import { neighborhoodName } from '@/lib/content/neighborhoods';
import { EVENT_TYPES, OCCASIONS, SERVICES, SPACE_TILES, STEPS, isEventType, type BriefPrefill } from '@/lib/private-events';
import { buildMetadata } from '@/lib/seo';

type Params = Record<string, string | string[] | undefined>;

function one(params: Params, key: string): string | undefined {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}

export async function generateMetadata(props: { searchParams?: Promise<Params> }) {
  const params = (await props.searchParams) ?? {};
  return buildMetadata({
    title: 'Private Events in Nashville',
    description:
      'Corporate gatherings, holiday parties, convention receptions and private celebrations in Nashville. Share a brief and we connect you with spaces that fit.',
    path: '/private-events/',
    noindex: Boolean(one(params, 'type') || one(params, 'guests') || one(params, 'date')),
  });
}

const OCCASION_ICON = {
  corporate: PeopleIcon,
  holiday: SparkleIcon,
  convention: CalendarIcon,
  celebration: GlassIcon,
} as const;

const SERVICE_ICON = {
  food: ForkIcon,
  music: MusicIcon,
  transport: CarIcon,
  rooms: BedIcon,
} as const;

/**
 * Private events (board: "Bring your people. Make it Nashville."). The quick
 * brief is a plain GET form that lands on the full inquiry form with its
 * values carried across; the full form posts to /api/private-events/.
 * The featured space is a real hotel from the hotel shortlist with only the
 * facts the shortlist holds; capacity and hire terms are always "on request".
 */
export default async function PrivateEventsPage(props: { searchParams?: Promise<Params> }) {
  const params = (await props.searchParams) ?? {};
  const typeParam = one(params, 'type');
  const guestsParam = Number(one(params, 'guests'));
  const dateParam = one(params, 'date');
  const prefill: BriefPrefill = {
    type: isEventType(typeParam) ? typeParam : undefined,
    guests: Number.isInteger(guestsParam) && guestsParam > 0 ? guestsParam : undefined,
    date: dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : undefined,
    flexible: one(params, 'flexible') === '1',
  };

  const featured = hotels.find((h) => h.image && h.amenities.some((a) => /rooftop/i.test(a))) ?? hotels.find((h) => h.image);

  return (
    <>
      <div className="shell">
        <Breadcrumbs trail={[{ name: 'Private events', href: '/private-events/' }]} />
      </div>

      <PageIntro
        eyebrow="Private events in Nashville"
        title={
          <>
            Bring your people.
            <br />
            Make it Nashville.
          </>
        }
        support="Corporate gatherings, holiday parties, convention receptions, and private celebrations."
        media={
          <div className="overflow-hidden rounded-card bg-ink">
            <SmartImage imageKey="concept/group-toast" ratio="aspect-[4/3] lg:aspect-auto lg:h-[440px]" sizes="(max-width: 1023px) 100vw, 58vw" priority />
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-4">
          <a href="#inquiry" className="btn-primary">
            Tell us about your event
            <span aria-hidden="true">→</span>
          </a>
          <a href="#spaces" className="inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-ink underline underline-offset-[0.2em]">
            Explore spaces
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </PageIntro>

      {/* Quick brief: GET to this page, lands on the full form with the values carried over. */}
      <section className="shell" aria-labelledby="brief-title">
        <form action="/private-events/#inquiry" method="get" className="grid gap-5 rounded-card border-2 border-ink bg-paper p-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)] lg:items-end lg:gap-8 lg:p-6">
          <div className="lg:border-r lg:border-paper-edge lg:pr-6">
            <h2 id="brief-title" className="font-sans text-2xs font-bold uppercase tracking-[0.14em] text-ink">
              Quick event brief
            </h2>
            <p className="mt-1 text-[15px] text-ink-soft">Tell us a few details to get started.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1.1fr_auto_auto] lg:items-end">
            <div>
              <label htmlFor="brief-type" className="field-label">
                Event type
              </label>
              <select id="brief-type" name="type" defaultValue={prefill.type ?? ''} className="field-input">
                <option value="">Select event type</option>
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="brief-guests" className="field-label">
                Guest count
              </label>
              <input id="brief-guests" name="guests" type="number" min={1} max={5000} inputMode="numeric" placeholder="e.g. 50" defaultValue={prefill.guests ?? ''} className="field-input" />
            </div>
            <div>
              <label htmlFor="brief-date" className="field-label">
                Preferred date
              </label>
              <input id="brief-date" name="date" type="date" defaultValue={prefill.date ?? ''} className="field-input" />
            </div>
            <label className="inline-flex min-h-12 items-center gap-2 text-sm text-ink">
              <input type="checkbox" name="flexible" value="1" defaultChecked={prefill.flexible} className="h-4 w-4 accent-ink" />
              Flexible dates
            </label>
            <button type="submit" className="btn-primary sm:col-span-2 lg:col-span-1">
              Start your inquiry
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
      </section>

      <section className="shell section" aria-labelledby="occasions-title">
        <SectionHead id="occasions-title" title="An occasion worth getting together for." support={<span className="uppercase tracking-[0.14em] text-2xs font-semibold">Different people. Same great city.</span>} />
        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-paper-edge">
          {OCCASIONS.map((o) => {
            const Icon = OCCASION_ICON[o.type];
            return (
              <li key={o.type} className="flex gap-4 lg:px-6 lg:first:pl-0 lg:last:pr-0">
                <span className="shrink-0 text-ink" aria-hidden="true">
                  <Icon size={36} />
                </span>
                <div>
                  <h3 className="font-sans text-[17px] font-bold text-ink">{o.title}</h3>
                  <p className="mt-1 text-[15px] leading-snug text-ink-soft">{o.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="spaces" className="scroll-mt-20 border-t border-paper-edge" aria-labelledby="spaces-title">
        <div className="shell section">
          <SectionHead id="spaces-title" title="Find a space that fits." support={<span className="uppercase tracking-[0.14em] text-2xs font-semibold">Iconic spaces. Unforgettable experiences.</span>} />

          {featured ? (
            <article className="mt-6 grid gap-0 overflow-hidden rounded-card border border-paper-edge lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
              <div className="bg-ink">
                <ContentImage image={featured.image!} ratio="aspect-[16/9] lg:aspect-auto lg:h-full" sizes="(max-width: 1023px) 100vw, 58vw" />
              </div>
              <div className="flex flex-col p-5 sm:p-6">
                <p className="eyebrow">Featured space</p>
                <h3 className="mt-1 text-[1.5rem] sm:text-[1.75rem]">{featured.title}</h3>
                <p className="mt-1 inline-flex items-center gap-1.5 text-[15px] text-ink-soft">
                  <PinIcon size={16} />
                  {neighborhoodName(featured.neighborhood)}
                </p>
                <ul className="mt-4 divide-y divide-paper-edge border-y border-paper-edge text-[15px] text-ink">
                  <li className="flex items-center gap-3 py-2.5">
                    <PeopleIcon size={18} />
                    <span>
                      Seated capacity <span className="text-ink-soft">/</span> Standing capacity: <span className="text-ink-soft">on request</span>
                    </span>
                  </li>
                  <li className="flex items-center gap-3 py-2.5">
                    <BuildingIcon size={18} />
                    <span>{featured.amenities.join(' / ')}</span>
                  </li>
                  <li className="flex items-center gap-3 py-2.5">
                    <CheckIcon size={18} />
                    <span>
                      Private hire, AV and accessibility: <span className="text-ink-soft">confirm with the venue</span>
                    </span>
                  </li>
                </ul>
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <Link href={`/hotels/${featured.slug}/`} className="btn-secondary">
                    View space
                    <span aria-hidden="true">→</span>
                  </Link>
                  <Link href={`/private-events/?type=corporate#inquiry`} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-ink underline-offset-[0.2em] hover:underline">
                    Ask about this space
                  </Link>
                </div>
              </div>
            </article>
          ) : null}

          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {SPACE_TILES.map((tile) => (
              <li key={tile.href}>
                <Link href={tile.href} className="group relative block overflow-hidden rounded-card bg-ink text-paper">
                  <SmartImage imageKey={tile.image} ratio="aspect-[16/10]" sizes="(max-width: 639px) 100vw, 33vw" />
                  <span className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent" aria-hidden="true" />
                  <span className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                    <span className="block font-display text-[1.375rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-[1.5rem]">{tile.title}</span>
                    <span className="mt-0.5 block text-2xs font-semibold uppercase tracking-[0.14em] text-paper/80">{tile.line}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-2xs text-ink-soft">
            Spaces are drawn from the NSVL hotel, restaurant and music shortlists. Availability, capacity and hire terms come from each venue.
          </p>
        </div>
      </section>

      <section className="bg-ink text-paper" aria-labelledby="services-title">
        <div className="shell grid gap-6 py-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:items-center lg:gap-10 lg:py-9">
          <div className="lg:border-r lg:border-paper/20 lg:pr-8">
            <h2 id="services-title" className="text-[1.75rem] text-paper sm:text-[2rem]">
              More than a room.
            </h2>
            <p className="mt-1 text-[16px] text-paper/85">Tell us what you need.</p>
          </div>
          <ul className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:divide-x lg:divide-paper/20">
            {SERVICES.map((s) => {
              const Icon = SERVICE_ICON[s.key];
              return (
                <li key={s.key} className="flex flex-col items-center gap-2 text-center lg:px-4">
                  <Icon size={28} />
                  <span className="text-[15px] font-semibold">{s.title}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="border-b border-paper-edge" aria-labelledby="process-title">
        <div className="shell grid gap-6 py-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:items-center lg:gap-10">
          <h2 id="process-title" className="text-[1.75rem] sm:text-[2rem] lg:border-r lg:border-paper-edge lg:pr-8">
            From first brief to final details.
          </h2>
          <ol className="grid gap-5 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink font-sans text-sm font-bold text-paper" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-sans text-[15px] font-bold text-ink">
                    <span className="sr-only">Step {i + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="mt-1 text-[13px] leading-snug text-ink-soft">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="inquiry" className="scroll-mt-20 bg-paper-sunk" aria-labelledby="inquiry-title">
        <div className="shell section grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
          <div className="lg:border-r lg:border-ink/15 lg:pr-8">
            <h2 id="inquiry-title" className="text-[2rem] sm:text-[2.5rem]">
              Let’s plan your event.
            </h2>
            <p className="mt-3 max-w-sm text-[16px] text-ink-soft">Share a few details and we’ll help you find the right space for your gathering in Nashville.</p>
          </div>
          <InquiryForm prefill={prefill} />
        </div>
      </section>
    </>
  );
}
