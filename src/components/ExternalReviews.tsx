import type { ExternalReviewSummary } from '@/lib/feeds/reviews';

const PROVIDER_LABEL = {
  google: 'Google',
  tripadvisor: 'Tripadvisor',
} as const;

/** Accessible star display. Never used for our own ratings, only third-party. */
function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 20 20" className="shrink-0">
          <defs>
            <linearGradient id={`s${i}-${rounded}`}>
              <stop offset={`${Math.max(0, Math.min(1, rounded - i + 1)) * 100}%`} stopColor="#7A5D18" />
              <stop offset={`${Math.max(0, Math.min(1, rounded - i + 1)) * 100}%`} stopColor="#E7E1D8" />
            </linearGradient>
          </defs>
          <path
            d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z"
            fill={`url(#s${i}-${rounded})`}
          />
        </svg>
      ))}
    </span>
  );
}

/**
 * Third-party rating block.
 *
 * Renders nothing when no data was returned, which is the correct behaviour:
 * an empty state here is better than implying a rating we do not have. The
 * provider is always named and always linked, as both licences require.
 */
export default function ExternalReviews({ summary }: { summary: ExternalReviewSummary | null }) {
  if (!summary) return null;
  const label = PROVIDER_LABEL[summary.provider];

  return (
    <section className="rounded-card border border-paper-edge bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg">What visitors say</h2>
        <span className="text-2xs font-semibold uppercase tracking-wider text-ink-faint">
          via {label}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Stars rating={summary.rating} />
        <span className="text-sm font-semibold text-ink">
          {summary.rating.toFixed(1)} / {summary.ratingScale}
        </span>
        <span className="text-sm text-ink-faint">
          ({summary.reviewCount.toLocaleString()} reviews)
        </span>
      </div>

      {summary.snippets.length > 0 && (
        <ul className="mt-4 space-y-3">
          {summary.snippets.map((s, i) => (
            <li key={i} className="border-l-2 border-paper-edge pl-3">
              <p className="text-[15px] leading-relaxed text-ink-soft">“{s.text}”</p>
              <p className="mt-1 text-2xs text-ink-faint">
                {s.author}
                {s.relativeTime ? ` · ${s.relativeTime}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-2xs text-ink-faint">
        Ratings and review text are supplied by {label} and are not our editorial assessment.{' '}
        <a
          href={summary.listingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-clay underline underline-offset-2"
        >
          Read all reviews on {label}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    </section>
  );
}
