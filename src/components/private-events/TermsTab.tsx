import { TERMS_LABELS, type VenueTerms } from '@/lib/events/types';
import { PreviewText } from './Preview';

/**
 * The terms a venue states up front: deposit, cancellation, notice, service
 * charge, outside catering, curfew, insurance, parking and transit. Plain
 * text from the venue, shown as written; the contract is the venue's.
 */
export default function TermsTab({ terms, name }: { terms: VenueTerms; name: string }) {
  const rows = TERMS_LABELS.filter(([key]) => terms[key]);
  if (!rows.length) return <p className="text-[15px] text-ink-soft">{name} has not listed its terms yet. Ask for them when the venue replies to your brief.</p>;
  return (
    <div>
      <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {rows.map(([key, label]) => (
          <div key={key}>
            <dt className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">{label}</dt>
            <dd className="mt-1 text-[15px] leading-snug text-ink">
              <PreviewText text={terms[key] as string} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-2xs text-ink-soft">Stated by {name}. The venue&rsquo;s own contract governs; confirm anything that matters to you in writing with the venue.</p>
    </div>
  );
}
