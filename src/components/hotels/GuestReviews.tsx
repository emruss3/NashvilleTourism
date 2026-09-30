'use client';

import { useId, useState } from 'react';
import { reviewMonth, scoreOutOfTen, scoreWord, TRAVELLER_LABEL, type GuestReview, type HotelReviews } from '@/lib/hotel-reviews';

const FIRST_PAGE = 4;
const PAGE = 6;

/**
 * Guest reviews for a hotel: the provider's 0 to 10 score and count, the
 * category ratings and what guests praise or complain about (the
 * provider's own sentiment summary), then individual reviews quoted as
 * guest opinion with a first name, traveller type and month. Nothing here
 * is written by us; the section says so.
 */
export default function GuestReviews({
  data,
  score,
  reviewCount,
  name,
}: {
  data: HotelReviews;
  /** Provider guest score, 0 to 10. */
  score?: number;
  reviewCount?: number;
  name: string;
}) {
  const id = useId();
  const [shown, setShown] = useState(FIRST_PAGE);
  const [filter, setFilter] = useState<'all' | 'family' | 'couple' | 'business'>('all');
  const reviews = data.reviews.filter((r) => filter === 'all' || r.type === filter);
  const visible = reviews.slice(0, shown);
  const sentiment = data.sentiment;
  const total = reviewCount ?? sentiment?.totalReviews ?? data.providerTotal ?? data.reviews.length;
  const counts = { family: data.reviews.filter((r) => r.type === 'family').length, couple: data.reviews.filter((r) => r.type === 'couple').length, business: data.reviews.filter((r) => r.type === 'business').length };

  return (
    <section aria-labelledby={`${id}-h`} className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={`${id}-h`} className="text-2xl">
            Guest reviews
          </h2>
          <p className="mt-1 text-sm text-ink-soft">What guests told our booking partner after staying at {name}. Not written or edited by Nashville.com.</p>
        </div>
        {score !== undefined ? (
          <p className="flex items-baseline gap-2">
            <span className="rounded bg-ink px-2.5 py-1 text-lg font-bold text-paper">{scoreOutOfTen(score).toFixed(1)}</span>
            <span className="text-sm">
              <span className="font-semibold text-ink">{scoreWord(scoreOutOfTen(score))}</span>
              <span className="text-ink-soft"> · {total.toLocaleString()} guest {total === 1 ? 'review' : 'reviews'}</span>
            </span>
          </p>
        ) : null}
      </div>

      {sentiment && (sentiment.categories.length || sentiment.pros.length || sentiment.cons.length) ? (
        <div className="grid gap-5 rounded-card border border-paper-edge bg-white p-4 md:grid-cols-2">
          {sentiment.categories.length ? (
            <dl className="space-y-2">
              {sentiment.categories.slice(0, 8).map((c) => {
                const v = scoreOutOfTen(c.rating);
                return (
                  <div key={c.name} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
                    <dt className="text-sm text-ink">{c.name}</dt>
                    <dd className="text-sm font-semibold tabular-nums text-ink">{v.toFixed(1)}</dd>
                    <dd className="col-span-2 h-1.5 overflow-hidden rounded-full bg-paper-sunk">
                      <span className="block h-full bg-ink" style={{ width: `${Math.min(100, Math.max(4, v * 10))}%` }} aria-hidden="true" />
                    </dd>
                  </div>
                );
              })}
            </dl>
          ) : null}
          {sentiment.pros.length || sentiment.cons.length ? (
            <div className="space-y-4 text-sm">
              {sentiment.pros.length ? (
                <div>
                  <h3 className="eyebrow">Guests praise</h3>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {sentiment.pros.slice(0, 6).map((p) => (
                      <li key={p} className="rounded-full border border-paper-edge bg-paper px-2.5 py-1 text-ink">
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {sentiment.cons.length ? (
                <div>
                  <h3 className="eyebrow">Guests mention</h3>
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {sentiment.cons.slice(0, 6).map((p) => (
                      <li key={p} className="rounded-full border border-paper-edge bg-paper-sunk px-2.5 py-1 text-ink-soft">
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {data.reviews.length ? (
        <>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter reviews by traveller type">
            {(
              [
                ['all', `All (${data.reviews.length})`],
                ['family', `Families (${counts.family})`],
                ['couple', `Couples (${counts.couple})`],
                ['business', `Business (${counts.business})`],
              ] as const
            ).map(([key, label]) =>
              key === 'all' || counts[key] > 0 ? (
                <button
                  key={key}
                  type="button"
                  aria-pressed={filter === key}
                  className={`min-h-9 rounded-full border px-3 text-sm ${filter === key ? 'border-ink bg-ink text-paper' : 'border-paper-edge bg-white text-ink'}`}
                  onClick={() => {
                    setFilter(key);
                    setShown(FIRST_PAGE);
                  }}
                >
                  {label}
                </button>
              ) : null,
            )}
          </div>
          <ul className="divide-y divide-paper-edge">
            {visible.map((r, i) => (
              <ReviewItem key={`${r.date ?? ''}-${r.name ?? ''}-${i}`} review={r} />
            ))}
          </ul>
          {reviews.length > shown ? (
            <button type="button" className="btn-secondary" onClick={() => setShown((n) => n + PAGE)}>
              Show more reviews ({reviews.length - shown} more)
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function ReviewItem({ review }: { review: GuestReview }) {
  const who = [review.name, review.type ? TRAVELLER_LABEL[review.type] : undefined, review.country].filter(Boolean).join(' · ');
  const when = reviewMonth(review.date);
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm">
          <span className="font-semibold text-ink">{who || 'Guest'}</span>
          {when ? <span className="text-ink-soft"> · {when}</span> : null}
        </p>
        {review.score !== undefined ? <span className="rounded bg-paper-sunk px-2 py-0.5 text-sm font-semibold tabular-nums text-ink">{scoreOutOfTen(review.score).toFixed(1)}</span> : null}
      </div>
      {review.headline ? <p className="mt-1 font-sans text-[15px] font-bold text-ink">{review.headline}</p> : null}
      {review.pros ? (
        <p className="mt-1.5 text-sm text-ink">
          <span className="font-semibold">Liked: </span>
          {review.pros}
        </p>
      ) : null}
      {review.cons ? (
        <p className="mt-1 text-sm text-ink-soft">
          <span className="font-semibold text-ink">Disliked: </span>
          {review.cons}
        </p>
      ) : null}
    </li>
  );
}
