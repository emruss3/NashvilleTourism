import { Chip } from '@/components/Ui';
import { spaceChips } from '@/lib/events/present';
import { formatUsd, spaceFromPrice, type EventSpace } from '@/lib/events/types';
import { PreviewText } from './Preview';

const MODEL_LABEL: Record<EventSpace['pricingModel'], string> = {
  room_fee: 'Room fee',
  min_spend: 'Minimum spend',
  per_person: 'Per person',
  buyout: 'Buyout',
};

/** A bookable space: both capacities, the price it starts from, and the notes the venue supplied. */
export default function SpaceCard({ space }: { space: EventSpace }) {
  const price = spaceFromPrice(space);
  const chips = spaceChips(space);
  return (
    <article className="rounded-card border border-paper-edge bg-paper p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-sans text-[17px] font-bold text-ink">
          <PreviewText text={space.name} />
        </h3>
        <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">{MODEL_LABEL[space.pricingModel]}</p>
      </div>
      {space.summary ? (
        <p className="mt-1 text-[15px] leading-snug text-ink-soft">
          <PreviewText text={space.summary} />
        </p>
      ) : null}
      <dl className="mt-4 grid gap-x-6 gap-y-2 text-[15px] sm:grid-cols-2">
        <div>
          <dt className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Seated</dt>
          <dd className="font-semibold text-ink">{space.seatedCapacity > 0 ? space.seatedCapacity.toLocaleString('en-US') : <PreviewText text="TODO" />}</dd>
        </div>
        <div>
          <dt className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Standing</dt>
          <dd className="font-semibold text-ink">{space.standingCapacity > 0 ? space.standingCapacity.toLocaleString('en-US') : <PreviewText text="TODO" />}</dd>
        </div>
        {space.minGuests ? (
          <div>
            <dt className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Minimum group</dt>
            <dd className="text-ink">{space.minGuests.toLocaleString('en-US')} guests</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-2xs font-semibold uppercase tracking-[0.14em] text-ink-soft">From</dt>
          <dd className="text-ink">
            {price ? (
              <>
                <strong className="font-semibold">{formatUsd(price.amount)}</strong> {price.basis}
              </>
            ) : (
              <PreviewText text="TODO pricing" />
            )}
            {space.fbMinimumCents ? <span className="text-ink-soft"> · F&amp;B minimum {formatUsd(space.fbMinimumCents / 100)}</span> : null}
          </dd>
        </div>
      </dl>
      {space.pricingNote ? (
        <p className="mt-3 text-sm text-ink-soft">
          <PreviewText text={space.pricingNote} />
        </p>
      ) : null}
      {chips.length ? (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Features">
          {chips.map((c) => (
            <li key={c}>
              <Chip>{c}</Chip>
            </li>
          ))}
        </ul>
      ) : null}
      {[space.avNote, space.hoursNote, space.blackoutNote].some(Boolean) ? (
        <ul className="mt-3 grid gap-1 text-sm text-ink-soft">
          {space.avNote ? (
            <li>
              AV: <PreviewText text={space.avNote} />
            </li>
          ) : null}
          {space.hoursNote ? (
            <li>
              Hours: <PreviewText text={space.hoursNote} />
            </li>
          ) : null}
          {space.blackoutNote ? (
            <li>
              Blackout dates: <PreviewText text={space.blackoutNote} />
            </li>
          ) : null}
        </ul>
      ) : null}
    </article>
  );
}
