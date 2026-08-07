import Link from 'next/link';
import { Breadcrumbs, JsonLd, MapLink, SectionHeader } from '@/components/Ui';
import { ContentImage, SmartImage } from '@/components/Media';
import { StickySectionNav } from '@/components/neighborhood-guide/StickySectionNav';
import { getAttraction, getVenue } from '@/lib/content';
import type { NeighborhoodEditorialGuide, NeighborhoodPick } from '@/lib/content/neighborhood-guides';
import { faqSchema, placeSchema } from '@/lib/seo';
import type { ImageRef, Neighborhood } from '@/lib/types';
import type { LiveEvent } from '@/lib/feeds/ticketmaster';

function listingImage(pick: NeighborhoodPick): ImageRef | undefined {
  if (pick.listingKind === 'attraction' && pick.listingSlug) {
    return getAttraction(pick.listingSlug)?.image;
  }
  if (pick.listingKind === 'venue' && pick.listingSlug) {
    return getVenue(pick.listingSlug)?.image;
  }
  return undefined;
}

function buildNav(guide: NeighborhoodEditorialGuide) {
  const items: { id: string; label: string }[] = [{ id: 'overview', label: 'Overview' }];
  if (guide.attractionPicks?.length) items.push({ id: 'what-to-do', label: 'What to do' });
  if (guide.nightlifePicks?.length) items.push({ id: 'broadway-bars', label: 'Broadway bars' });
  if (guide.diningPicks.length) items.push({ id: 'eat', label: 'Eat' });
  if (guide.hotelPicks?.length) items.push({ id: 'stay', label: 'Stay' });
  if (guide.concertPicks?.length) items.push({ id: 'concerts', label: 'Concerts' });
  if (guide.itinerary?.length) items.push({ id: 'plan-your-day', label: 'Plan your day' });
  if (guide.practicalTips?.length) items.push({ id: 'know-before-you-go', label: 'Know before you go' });
  return items;
}

function PickRow({ pick }: { pick: NeighborhoodPick }) {
  const listing = pick.photoPolicy === 'text-only' ? undefined : listingImage(pick);
  const useKey = pick.photoPolicy !== 'text-only' && pick.imageKey;
  const title = pick.href ? (
    <Link href={pick.href} className="hover:text-clay">
      {pick.title}
    </Link>
  ) : (
    pick.title
  );

  const hasPhoto = Boolean(useKey || listing?.src);

  return (
    <article
      className={
        hasPhoto
          ? 'grid gap-5 border-t border-paper-edge py-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)] md:gap-10'
          : 'border-t border-paper-edge py-8'
      }
    >
      {hasPhoto ? (
        <div className="min-w-0">
          {useKey && pick.imageKey ? (
            <SmartImage
              imageKey={pick.imageKey}
              ratio="aspect-[3/2]"
              sizes="(max-width: 767px) 100vw, 40vw"
              className="rounded-card"
            />
          ) : listing?.src ? (
            <ContentImage
              image={listing}
              ratio="aspect-[3/2]"
              sizes="(max-width: 767px) 100vw, 40vw"
              className="rounded-card"
            />
          ) : null}
        </div>
      ) : null}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-2xs font-bold uppercase tracking-[0.14em] text-clay">Best for · {pick.bestFor}</p>
          {pick.badge ? (
            <span className="rounded-sm bg-dogwood px-2 py-0.5 text-2xs font-bold uppercase tracking-[0.12em] text-navy">
              {pick.badge}
            </span>
          ) : null}
        </div>
        <h3 className="mt-2 font-sans text-xl font-bold text-navy md:text-2xl">{title}</h3>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft md:text-base">{pick.body}</p>
        {pick.note ? <p className="mt-2 text-[15px] leading-relaxed text-ink-soft md:text-base">{pick.note}</p> : null}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
          {pick.href ? (
            <Link href={pick.href} className="text-navy underline-offset-4 hover:text-clay hover:underline">
              {pick.href.startsWith('#') ? 'See related pick' : 'NashRoam guide'}
            </Link>
          ) : null}
          {pick.externalHref ? (
            <a
              href={pick.externalHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-navy underline-offset-4 hover:text-clay hover:underline"
            >
              Official site
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function DiningSection({ picks, intro }: { picks: NeighborhoodPick[]; intro?: string }) {
  const grouped = picks.some((p) => p.category);
  if (!grouped) {
    return (
      <>
        {intro ? <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">{intro}</p> : null}
        <div className="mt-4">
          {picks.map((pick) => (
            <PickRow key={pick.title} pick={pick} />
          ))}
        </div>
      </>
    );
  }

  const order: string[] = [];
  const map = new Map<string, NeighborhoodPick[]>();
  for (const pick of picks) {
    const key = pick.category ?? 'More';
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(pick);
  }

  return (
    <>
      {intro ? <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">{intro}</p> : null}
      <div className="mt-4">
        {order.map((category) => (
          <div key={category}>
            <p className="border-t border-paper-edge pt-8 text-2xs font-bold uppercase tracking-[0.16em] text-ink-faint">
              {category}
            </p>
            <div className="-mt-2">
              {map.get(category)!.map((pick) => (
                <PickRow key={pick.title} pick={pick} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function NeighborhoodGuide({
  neighborhood,
  guide,
  downtownEvents,
}: {
  neighborhood: Neighborhood;
  guide: NeighborhoodEditorialGuide;
  downtownEvents: LiveEvent[];
}) {
  const path = `/neighborhoods/${neighborhood.slug}/`;
  const nav = buildNav(guide);

  return (
    <div className="pb-20">
      <JsonLd data={placeSchema(neighborhood, path)} />
      {guide.faqs?.length ? <JsonLd data={faqSchema(guide.faqs)} /> : null}

      <div className="shell">
        <Breadcrumbs
          trail={[
            { name: 'Neighborhoods', href: '/neighborhoods/' },
            { name: neighborhood.name, href: path },
          ]}
        />
      </div>

      <header className="shell pb-8 pt-2">
        <p className="eyebrow">Neighborhood guide</p>
        <h1 className="mt-3 max-w-4xl font-display text-4xl font-bold leading-tight text-navy md:text-5xl lg:text-[3.5rem]">
          {guide.h1}
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-soft md:text-xl">{guide.intro}</p>
      </header>

      <div className="shell">
        <SmartImage
          imageKey={guide.heroImageKey}
          ratio="aspect-[4/5] md:aspect-[16/9]"
          sizes="100vw"
          priority
          className="rounded-card"
        />
      </div>

      <StickySectionNav items={nav} />

      <div className="shell">
        <section id="overview" className="scroll-mt-24 py-12 md:py-16">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-16">
            <div>
              <p className="text-2xs font-bold uppercase tracking-[0.16em] text-clay">The short version</p>
              <p className="mt-4 font-display text-2xl font-semibold leading-snug text-navy md:text-3xl">
                {guide.verdict.summary}
              </p>
            </div>
            <dl className="grid gap-6 sm:grid-cols-2">
              {[
                { label: 'Best for', value: guide.verdict.bestFor },
                { label: 'Skip it if', value: guide.verdict.skipIf },
                { label: 'Time needed', value: guide.verdict.timeNeeded },
                { label: 'Walkability', value: guide.verdict.walkability },
              ].map((item) => (
                <div key={item.label} className="border-t border-paper-edge pt-4">
                  <dt className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint">{item.label}</dt>
                  <dd className="mt-2 text-[15px] leading-relaxed text-navy">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {guide.areas?.length ? (
            <div className="mt-16">
              <h2 className="font-display text-3xl font-bold text-navy md:text-4xl">Downtown isn&apos;t just Broadway</h2>
              <p className="mt-3 max-w-2xl text-base text-ink-soft">
                These are NashRoam trip-planning zones, not official municipal boundaries.
              </p>
              <div className="mt-8 grid gap-8 md:grid-cols-2">
                {guide.areas.map((area) => (
                  <article key={area.name} className="border-t border-navy/15 pt-5">
                    {area.imageKey ? (
                      <SmartImage
                        imageKey={area.imageKey}
                        ratio="aspect-[3/2]"
                        sizes="(max-width: 767px) 100vw, 50vw"
                        className="mb-5 rounded-card"
                      />
                    ) : null}
                    <h3 className="font-sans text-xl font-bold text-navy">{area.name}</h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{area.description}</p>
                    <p className="mt-4 text-2xs font-bold uppercase tracking-[0.14em] text-ink-faint">
                      Best for · {area.bestFor}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {guide.attractionPicks?.length ? (
          <section id="what-to-do" className="scroll-mt-24 border-t border-paper-edge py-12 md:py-16">
            <h2 className="max-w-3xl font-display text-3xl font-bold text-navy md:text-4xl">
              Four things worth doing Downtown even if you never order a drink
            </h2>
            <div className="mt-4">
              {guide.attractionPicks.map((pick) => (
                <PickRow key={pick.title} pick={pick} />
              ))}
            </div>
          </section>
        ) : null}

        {guide.nightlifePicks?.length ? (
          <section id="broadway-bars" className="scroll-mt-24 border-t border-paper-edge py-12 md:py-16">
            <h2 className="max-w-3xl font-display text-3xl font-bold text-navy md:text-4xl">
              Pick the Broadway you actually want
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
              Trying to visit every bar is the wrong strategy. Pick two or three that give you different versions of
              Broadway.
            </p>
            <div className="mt-4">
              {guide.nightlifePicks.map((pick) => (
                <PickRow key={pick.title} pick={pick} />
              ))}
            </div>
          </section>
        ) : null}

        <section id="eat" className="scroll-mt-24 border-t border-paper-edge py-12 md:py-16">
          <h2 className="max-w-3xl font-display text-3xl font-bold text-navy md:text-4xl">
            {guide.navStyle === 'dining-forward' ? `Where to eat in ${guide.h1}` : 'Eat Downtown without settling for the nearest bar menu'}
          </h2>
          <DiningSection picks={guide.diningPicks} intro={guide.diningIntro} />
        </section>

        {guide.hotelPicks?.length ? (
          <section id="stay" className="scroll-mt-24 border-t border-paper-edge py-12 md:py-16">
            <h2 className="max-w-3xl font-display text-3xl font-bold text-navy md:text-4xl">Where to stay Downtown</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
              The question isn&apos;t whether a hotel is Downtown. It&apos;s which version of Downtown you want outside
              the lobby.
            </p>
            <div className="mt-4">
              {guide.hotelPicks.map((pick) => (
                <PickRow key={pick.title} pick={pick} />
              ))}
            </div>
          </section>
        ) : null}

        {guide.concertPicks?.length ? (
          <section id="concerts" className="scroll-mt-24 border-t border-paper-edge py-12 md:py-16">
            <h2 className="max-w-3xl font-display text-3xl font-bold text-navy md:text-4xl">
              When Broadway is the warm-up, not the show
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg">
              Ticketed rooms change the night. Build dinner and hotel around doors, not the other way around.
            </p>
            <div className="mt-4">
              {guide.concertPicks.map((pick) => (
                <PickRow key={pick.title} pick={pick} />
              ))}
            </div>
          </section>
        ) : null}

        {guide.itinerary?.length ? (
          <section id="plan-your-day" className="scroll-mt-24 border-t border-paper-edge py-12 md:py-16">
            <h2 className="font-display text-3xl font-bold text-navy md:text-4xl">
              {guide.navStyle === 'dining-forward' ? `A half day in ${guide.h1}` : 'If this is your first day in Nashville'}
            </h2>
            <ol className="mt-8 space-y-0">
              {guide.itinerary.map((step) => (
                <li
                  key={step.time}
                  className="grid gap-2 border-t border-paper-edge py-6 md:grid-cols-[7rem_1fr] md:gap-8"
                >
                  <p className="text-2xs font-bold uppercase tracking-[0.14em] text-clay">{step.time}</p>
                  <div>
                    <p className="font-sans text-lg font-bold text-navy">
                      {step.href ? (
                        <Link href={step.href} className="hover:text-clay">
                          {step.title}
                        </Link>
                      ) : (
                        step.title
                      )}
                    </p>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
            {guide.itineraryNote ? (
              <p className="mt-6 max-w-3xl border-l-4 border-clay pl-4 text-[15px] leading-relaxed text-ink-soft">
                <span className="font-semibold text-navy">Alternative. </span>
                {guide.itineraryNote}
              </p>
            ) : null}
          </section>
        ) : null}

        {guide.practicalTips?.length ? (
          <section id="know-before-you-go" className="scroll-mt-24 border-t border-paper-edge py-12 md:py-16">
            <div className="rounded-card bg-sky px-6 py-10 md:px-10 md:py-12">
              <h2 className="font-display text-3xl font-bold text-navy md:text-4xl">Know before you go</h2>
              <div className="mt-8 grid gap-8 md:grid-cols-2">
                {guide.practicalTips.map((tip) => (
                  <article key={tip.title}>
                    <h3 className="font-sans text-lg font-bold text-navy">{tip.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{tip.body}</p>
                  </article>
                ))}
              </div>
              <div className="mt-8">
                <MapLink query={neighborhood.mapQuery} label={`Map of ${neighborhood.name}`} />
              </div>
            </div>
          </section>
        ) : null}

        {downtownEvents.length > 0 ? (
          <section className="border-t border-paper-edge py-12 md:py-16">
            <SectionHeader title="What's happening Downtown" href="/events/" linkLabel="All events" />
            <ul className="mt-6 divide-y divide-paper-edge border-y border-paper-edge">
              {downtownEvents.slice(0, 6).map((event) => (
                <li
                  key={event.id}
                  className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                >
                  <div>
                    <p className="font-sans font-bold text-navy">{event.name}</p>
                    <p className="text-sm text-ink-soft">
                      {event.venue}
                      {event.time ? ` · ${event.time}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <time dateTime={event.date} className="font-medium text-ink-faint">
                      {event.date}
                    </time>
                    <a
                      href={event.ticketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-clay hover:underline"
                    >
                      Tickets
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {guide.faqs?.length ? (
          <section className="border-t border-paper-edge py-12 md:py-16">
            <h2 className="font-display text-3xl font-bold text-navy md:text-4xl">Common questions</h2>
            <dl className="mt-8 space-y-0">
              {guide.faqs.map((faq) => (
                <div key={faq.question} className="border-t border-paper-edge py-6">
                  <dt className="font-sans text-lg font-bold text-navy">{faq.question}</dt>
                  <dd className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-soft">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <section className="border-t border-paper-edge py-12">
          <SectionHeader title="Keep planning" />
          <div className="mt-4 flex flex-wrap gap-3">
            {[
              { href: '/music/', label: 'Music venues' },
              { href: '/things-to-do/', label: 'Things to do' },
              { href: '/restaurants/', label: 'Restaurants' },
              { href: '/where-to-stay/', label: 'Where to stay' },
              { href: '/events/', label: 'Events' },
              { href: '/plan/', label: 'Plan your trip' },
              { href: '/neighborhoods/', label: 'All neighborhoods' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-navy/20 bg-white px-4 py-2 text-sm font-semibold text-navy transition-colors hover:border-clay hover:text-clay"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
