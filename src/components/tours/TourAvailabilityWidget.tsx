'use client';

import { useEffect, useMemo, useState } from 'react';
import BookingLink from '@/components/BookingLink';
import { ANALYTICS_EVENTS } from '@/lib/analytics';

type ProductOption = {
  code: string;
  title: string;
  description?: string;
};

type Money = {
  amount: number;
  currency: string;
  formatted: string;
};

type UnavailableDate = {
  date: string;
  reason?: string;
};

type TimedEntry = {
  startTime?: string;
  unavailableDates?: UnavailableDate[];
};

type RetailPrice = {
  original?: number;
  special?: number;
  offerStartDate?: string;
  offerEndDate?: string;
};

type PricingDetail = {
  pricingPackageType?: string;
  ageBand?: string;
  minTravelers?: number;
  maxTravelers?: number;
  price?: RetailPrice;
};

type PricingRecord = {
  daysOfWeek?: string[];
  timedEntries?: TimedEntry[];
  pricingDetails?: PricingDetail[];
};

type Season = {
  startDate: string;
  endDate?: string;
  pricingRecords?: PricingRecord[];
};

type BookableItem = {
  productOptionCode: string;
  seasons?: Season[];
};

type Schedule = {
  productCode: string;
  currency: string;
  fromPrice?: number;
  bookableItems: BookableItem[];
};

type ScheduleResponse = {
  configured?: boolean;
  live?: boolean;
  schedule?: Schedule | null;
  error?: string | null;
};

type AvailabilityResult = {
  available: boolean;
  status?: string;
  productCode?: string;
  productOptionCode?: string;
  travelDate?: string;
  startTime?: string;
  currency?: string;
  totalPrice?: number;
  lineItems?: Array<{
    ageBand?: string;
    numberOfTravelers?: number;
    recommendedRetailPrice?: number;
  }>;
};

type CheckResponse = {
  live?: boolean;
  fullAccessRequired?: boolean;
  availability?: AvailabilityResult | null;
  error?: string | null;
};

type TravelerCounts = Record<string, number>;

type TourAvailabilityWidgetProps = {
  productCode: string;
  productTitle: string;
  productUrl: string;
  productOptions?: ProductOption[];
  pricingType?: string;
  unitType?: string;
  fallbackFromPrice?: Money;
};

const DAY_NAMES = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

const AGE_BAND_LABELS: Record<string, string> = {
  ADULT: 'Adults',
  CHILD: 'Children',
  INFANT: 'Infants',
  YOUTH: 'Youth',
  SENIOR: 'Seniors',
  TRAVELER: 'Travelers',
};

function nashvilleToday(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function parseDate(value: string): Date {
  return new Date(`${value}T12:00:00Z`);
}

function addDays(value: string, days: number): string {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function laterDate(a: string, b: string): string {
  return a > b ? a : b;
}

function weekday(value: string): string {
  return DAY_NAMES[parseDate(value).getUTCDay()];
}

function seasonEnd(season: Season, today: string): string {
  return season.endDate || addDays(today, 384);
}

function isDateInSeason(date: string, season: Season, today: string): boolean {
  return date >= season.startDate && date <= seasonEnd(season, today);
}

function unavailableOn(entry: TimedEntry, date: string): boolean {
  return Boolean(entry.unavailableDates?.some((item) => item.date === date));
}

function recordsForDate(item: BookableItem | undefined, date: string, today: string): PricingRecord[] {
  if (!item || !date) return [];
  const day = weekday(date);
  return (item.seasons || []).flatMap((season) => {
    if (!isDateInSeason(date, season, today)) return [];
    return (season.pricingRecords || []).filter((record) =>
      (record.daysOfWeek || []).includes(day),
    );
  });
}

function availableTimes(records: PricingRecord[], date: string): string[] {
  const times = records.flatMap((record) =>
    (record.timedEntries || [])
      .filter((entry) => entry.startTime && !unavailableOn(entry, date))
      .map((entry) => entry.startTime as string),
  );
  return [...new Set(times)].sort();
}

function hasUntimedAvailability(records: PricingRecord[]): boolean {
  return records.some((record) => !(record.timedEntries || []).some((entry) => entry.startTime));
}

function isScheduled(item: BookableItem | undefined, date: string, today: string): boolean {
  const records = recordsForDate(item, date, today);
  if (!records.length) return false;
  return hasUntimedAvailability(records) || availableTimes(records, date).length > 0;
}

function scheduleBounds(schedule: Schedule, today: string): { min: string; max: string } {
  const seasons = schedule.bookableItems.flatMap((item) => item.seasons || []);
  const starts = seasons.map((season) => season.startDate).filter(Boolean).sort();
  const ends = seasons.map((season) => seasonEnd(season, today)).filter(Boolean).sort();
  return {
    min: laterDate(today, starts[0] || today),
    max: ends.at(-1) || addDays(today, 384),
  };
}

function nextScheduledDate(
  item: BookableItem | undefined,
  today: string,
  maxDate: string,
): string {
  if (!item) return '';
  const seasonStarts = (item.seasons || [])
    .map((season) => season.startDate)
    .filter(Boolean)
    .sort();
  let date = laterDate(today, seasonStarts[0] || today);
  const hardStop = addDays(today, 730);
  const stop = maxDate < hardStop ? maxDate : hardStop;
  while (date <= stop) {
    if (isScheduled(item, date, today)) return date;
    date = addDays(date, 1);
  }
  return '';
}

function effectiveRetailPrice(price: RetailPrice | undefined, date: string): number | undefined {
  if (!price) return undefined;
  const specialApplies =
    price.special != null &&
    (!price.offerStartDate || date >= price.offerStartDate) &&
    (!price.offerEndDate || date <= price.offerEndDate);
  if (specialApplies) return price.special;
  return price.original ?? price.special;
}

function currency(value: number, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode || 'USD',
  }).format(value);
}

function timeLabel(value: string): string {
  const [hourText, minuteText] = value.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  const date = new Date(Date.UTC(2020, 0, 1, hour, minute));
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(date);
}

function dateLabel(value: string): string {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parseDate(value));
}

function unitLabel(unitType?: string): string {
  const labels: Record<string, string> = {
    GROUP: 'group',
    VEHICLE: 'vehicle',
    BOAT: 'boat',
    BIKE: 'bike',
    ROOM: 'room',
    PACKAGE: 'package',
    AIRCRAFT: 'aircraft',
  };
  return labels[unitType || ''] || (unitType ? unitType.toLowerCase().replaceAll('_', ' ') : 'unit');
}

function defaultTravelerCounts(ageBands: string[], pricingType?: string): TravelerCounts {
  const counts = Object.fromEntries(ageBands.map((band) => [band, 0])) as TravelerCounts;
  if (!ageBands.length) return counts;

  if (pricingType === 'UNIT') {
    const band = ageBands.includes('TRAVELER')
      ? 'TRAVELER'
      : ageBands.includes('ADULT')
        ? 'ADULT'
        : ageBands[0];
    counts[band] = 1;
    return counts;
  }

  const band = ageBands.includes('ADULT')
    ? 'ADULT'
    : ageBands.find((item) => item !== 'INFANT') || ageBands[0];
  counts[band] = band === 'ADULT' ? 2 : 1;
  return counts;
}

export default function TourAvailabilityWidget({
  productCode,
  productTitle,
  productUrl,
  productOptions = [],
  pricingType,
  unitType,
  fallbackFromPrice,
}: TourAvailabilityWidgetProps) {
  const today = useMemo(() => nashvilleToday(), []);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [scheduleState, setScheduleState] = useState<'loading' | 'ready' | 'empty' | 'error'>(
    'loading',
  );
  const [selectedOption, setSelectedOption] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [travelers, setTravelers] = useState<TravelerCounts>({});
  const [checkState, setCheckState] = useState<
    'idle' | 'checking' | 'live' | 'schedule-only' | 'error'
  >('idle');
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setScheduleState('loading');

    fetch(`/api/viator/availability/${encodeURIComponent(productCode)}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        const data = (await response.json()) as ScheduleResponse;
        if (!response.ok || !data.live || !data.schedule) throw new Error(data.error || 'Unavailable');
        return data.schedule;
      })
      .then((nextSchedule) => {
        setSchedule(nextSchedule);
        setScheduleState(nextSchedule.bookableItems.length ? 'ready' : 'empty');
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setSchedule(null);
        setScheduleState('error');
      });

    return () => controller.abort();
  }, [productCode]);

  const bounds = useMemo(
    () => (schedule ? scheduleBounds(schedule, today) : { min: today, max: addDays(today, 384) }),
    [schedule, today],
  );

  const optionChoices = useMemo(() => {
    if (!schedule) return [];
    return schedule.bookableItems.map((item) => {
      const productOption = productOptions.find((option) => option.code === item.productOptionCode);
      return {
        code: item.productOptionCode,
        title: productOption?.title || 'Standard option',
      };
    });
  }, [productOptions, schedule]);

  const selectedItem = useMemo(
    () => schedule?.bookableItems.find((item) => item.productOptionCode === selectedOption),
    [schedule, selectedOption],
  );

  useEffect(() => {
    if (!schedule?.bookableItems.length) return;
    const preferred = productOptions.find((option) =>
      schedule.bookableItems.some((item) => item.productOptionCode === option.code),
    );
    const optionCode = preferred?.code || schedule.bookableItems[0].productOptionCode;
    setSelectedOption((current) => current || optionCode);
  }, [productOptions, schedule]);

  useEffect(() => {
    if (!selectedItem) return;
    const currentWorks = selectedDate && isScheduled(selectedItem, selectedDate, today);
    if (currentWorks) return;
    const next = nextScheduledDate(selectedItem, today, bounds.max);
    setSelectedDate(next);
    setSelectedTime('');
    setCheckState('idle');
    setAvailability(null);
  }, [bounds.max, selectedDate, selectedItem, today]);

  const activeRecords = useMemo(
    () => recordsForDate(selectedItem, selectedDate, today),
    [selectedDate, selectedItem, today],
  );
  const times = useMemo(
    () => availableTimes(activeRecords, selectedDate),
    [activeRecords, selectedDate],
  );

  useEffect(() => {
    if (!times.length) {
      setSelectedTime('');
      return;
    }
    setSelectedTime((current) => (current && times.includes(current) ? current : times[0]));
  }, [times]);

  const pricingDetails = useMemo(
    () => activeRecords.flatMap((record) => record.pricingDetails || []),
    [activeRecords],
  );
  const ageBands = useMemo(
    () => [
      ...new Set(
        pricingDetails
          .map((detail) => (detail.ageBand || 'TRAVELER').toUpperCase())
          .filter(Boolean),
      ),
    ],
    [pricingDetails],
  );

  useEffect(() => {
    if (!ageBands.length) return;
    setTravelers((current) => {
      const next = Object.fromEntries(ageBands.map((band) => [band, current[band] || 0]));
      if (Object.values(next).some((count) => count > 0)) return next;
      return defaultTravelerCounts(ageBands, pricingType);
    });
  }, [ageBands, pricingType]);

  const totalTravelers = Object.values(travelers).reduce((sum, count) => sum + count, 0);
  const displayCurrency = schedule?.currency || fallbackFromPrice?.currency || 'USD';

  const priceForBand = (band: string): number | undefined => {
    const candidates = pricingDetails.filter(
      (detail) => (detail.ageBand || 'TRAVELER').toUpperCase() === band,
    );
    const applicable = candidates.filter(
      (detail) =>
        (detail.minTravelers == null || totalTravelers >= detail.minTravelers) &&
        (detail.maxTravelers == null || totalTravelers <= detail.maxTravelers),
    );
    const pool = applicable.length ? applicable : candidates;
    const prices = pool
      .map((detail) => effectiveRetailPrice(detail.price, selectedDate))
      .filter((value): value is number => value != null);
    return prices.length ? Math.min(...prices) : undefined;
  };

  const scheduleEstimate = useMemo(() => {
    const prices = pricingDetails
      .map((detail) => effectiveRetailPrice(detail.price, selectedDate))
      .filter((value): value is number => value != null);
    const base = prices.length
      ? Math.min(...prices)
      : schedule?.fromPrice ?? fallbackFromPrice?.amount;

    if (pricingType === 'UNIT' || pricingDetails.some((detail) => detail.pricingPackageType === 'UNIT')) {
      return base == null
        ? null
        : {
            amount: base,
            text: `From ${currency(base, displayCurrency)} per ${unitLabel(unitType)}`,
            exact: false,
          };
    }

    if (ageBands.length && totalTravelers > 0) {
      let total = 0;
      let pricedTravelers = 0;
      for (const band of ageBands) {
        const count = travelers[band] || 0;
        if (!count) continue;
        const price = priceForBand(band);
        if (price == null) continue;
        total += price * count;
        pricedTravelers += count;
      }
      if (pricedTravelers === totalTravelers) {
        return {
          amount: total,
          text: `Schedule estimate: ${currency(total, displayCurrency)}`,
          exact: false,
        };
      }
    }

    return base == null
      ? null
      : {
          amount: base,
          text: `From ${currency(base, displayCurrency)}`,
          exact: false,
        };
  }, [
    ageBands,
    displayCurrency,
    fallbackFromPrice?.amount,
    pricingDetails,
    pricingType,
    schedule?.fromPrice,
    selectedDate,
    totalTravelers,
    travelers,
    unitType,
  ]);

  const selectedDateScheduled = Boolean(
    selectedItem && selectedDate && isScheduled(selectedItem, selectedDate, today),
  );
  const hasRequiredTime = times.length > 0;

  const checkAvailability = async () => {
    if (!selectedOption || !selectedDate || !selectedDateScheduled || totalTravelers < 1) {
      setCheckState('error');
      setAvailability(null);
      return;
    }

    setCheckState('checking');
    setAvailability(null);
    try {
      const response = await fetch(
        `/api/viator/availability/${encodeURIComponent(productCode)}/check`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productOptionCode: selectedOption,
            travelDate: selectedDate,
            startTime: hasRequiredTime ? selectedTime : undefined,
            currency: fallbackFromPrice?.currency || 'USD',
            paxMix: Object.entries(travelers)
              .filter(([, count]) => count > 0)
              .map(([ageBand, numberOfTravelers]) => ({ ageBand, numberOfTravelers })),
          }),
        },
      );
      const data = (await response.json()) as CheckResponse;
      if (response.ok && data.live && data.availability) {
        setAvailability(data.availability);
        setCheckState('live');
      } else if (response.status === 403 || data.fullAccessRequired) {
        setCheckState('schedule-only');
      } else {
        setCheckState('error');
      }
    } catch {
      setCheckState('error');
    }
  };

  const liveTotal =
    checkState === 'live' && availability?.totalPrice != null
      ? currency(availability.totalPrice, availability.currency || fallbackFromPrice?.currency || 'USD')
      : null;

  return (
    <section aria-labelledby="tour-availability-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p id="tour-availability-title" className="text-2xs font-bold uppercase tracking-wider text-ink-faint">
            Check dates &amp; prices
          </p>
          <p className="mt-1 text-2xl font-bold text-navy">
            {liveTotal || scheduleEstimate?.text || fallbackFromPrice?.formatted || 'See current price'}
          </p>
          {liveTotal ? <p className="mt-1 text-xs font-semibold text-moss">Live Viator total</p> : null}
        </div>
        {scheduleState === 'loading' ? (
          <span className="text-xs text-ink-faint">Loading…</span>
        ) : null}
      </div>

      {scheduleState === 'ready' ? (
        <div className="mt-5 space-y-4 border-t border-paper-edge pt-5">
          <div>
            <label htmlFor={`tour-date-${productCode}`} className="mb-1 block text-2xs font-bold uppercase tracking-wider text-ink-faint">
              Date
            </label>
            <input
              id={`tour-date-${productCode}`}
              type="date"
              min={bounds.min}
              max={bounds.max}
              value={selectedDate}
              onChange={(event) => {
                setSelectedDate(event.target.value);
                setSelectedTime('');
                setCheckState('idle');
                setAvailability(null);
              }}
              className="field-input"
            />
          </div>

          {optionChoices.length > 1 ? (
            <div>
              <label htmlFor={`tour-option-${productCode}`} className="mb-1 block text-2xs font-bold uppercase tracking-wider text-ink-faint">
                Experience option
              </label>
              <select
                id={`tour-option-${productCode}`}
                value={selectedOption}
                onChange={(event) => {
                  setSelectedOption(event.target.value);
                  setCheckState('idle');
                  setAvailability(null);
                }}
                className="field-input"
              >
                {optionChoices.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.title}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {times.length > 1 ? (
            <div>
              <label htmlFor={`tour-time-${productCode}`} className="mb-1 block text-2xs font-bold uppercase tracking-wider text-ink-faint">
                Start time
              </label>
              <select
                id={`tour-time-${productCode}`}
                value={selectedTime}
                onChange={(event) => {
                  setSelectedTime(event.target.value);
                  setCheckState('idle');
                  setAvailability(null);
                }}
                className="field-input"
              >
                {times.map((time) => (
                  <option key={time} value={time}>
                    {timeLabel(time)}
                  </option>
                ))}
              </select>
            </div>
          ) : times.length === 1 ? (
            <p className="text-sm text-ink-soft">
              <span className="font-semibold text-ink">Start time:</span> {timeLabel(times[0])}
            </p>
          ) : null}

          {ageBands.length ? (
            <fieldset>
              <legend className="mb-2 text-2xs font-bold uppercase tracking-wider text-ink-faint">
                Travelers
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {ageBands.map((band) => (
                  <label key={band} className="text-sm text-ink-soft">
                    <span className="mb-1 block font-medium text-ink">
                      {AGE_BAND_LABELS[band] || band.toLowerCase()}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      step={1}
                      value={travelers[band] || 0}
                      onChange={(event) => {
                        const count = Math.max(0, Math.min(30, Math.trunc(Number(event.target.value) || 0)));
                        setTravelers((current) => ({ ...current, [band]: count }));
                        setCheckState('idle');
                        setAvailability(null);
                      }}
                      className="field-input"
                      aria-label={`${AGE_BAND_LABELS[band] || band} travelers`}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          <div className="rounded border border-paper-edge bg-paper-sunk p-3 text-sm leading-relaxed text-ink-soft">
            {selectedDateScheduled ? (
              <>
                <p className="font-semibold text-ink">
                  {selectedDate ? dateLabel(selectedDate) : 'Select a date'}
                  {selectedTime ? ` · ${timeLabel(selectedTime)}` : ''}
                </p>
                <p className="mt-1">
                  {scheduleEstimate?.text || 'This date appears in Viator’s current schedule.'}
                </p>
              </>
            ) : (
              <p>No current Viator schedule was found for this date. Try another date.</p>
            )}
          </div>

          <button
            type="button"
            onClick={checkAvailability}
            disabled={
              checkState === 'checking' ||
              !selectedDateScheduled ||
              !selectedOption ||
              totalTravelers < 1 ||
              (hasRequiredTime && !selectedTime)
            }
            className="btn-secondary min-h-[44px] w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checkState === 'checking' ? 'Checking…' : 'Check this date'}
          </button>
        </div>
      ) : scheduleState === 'empty' ? (
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          Viator does not currently publish a bookable schedule for this experience.
        </p>
      ) : scheduleState === 'error' ? (
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          Current schedule details are temporarily unavailable. Viator will confirm dates and final pricing before checkout.
        </p>
      ) : null}

      <div className="mt-4 min-h-5 text-sm leading-relaxed" aria-live="polite">
        {checkState === 'live' && availability ? (
          availability.available ? (
            <p className="font-semibold text-moss">
              Available{availability.startTime ? ` at ${timeLabel(availability.startTime)}` : ''}
              {liveTotal ? ` · ${liveTotal} total` : ''}. Final confirmation happens on Viator.
            </p>
          ) : (
            <p className="font-semibold text-clay">
              Viator did not return this combination as available. Try another time or continue to Viator.
            </p>
          )
        ) : checkState === 'schedule-only' ? (
          <p className="text-ink-soft">
            This date appears in Viator’s current schedule. Exact inventory and the final total are confirmed on Viator.
          </p>
        ) : checkState === 'error' ? (
          <p className="text-ink-soft">
            We could not confirm this exact combination here. Viator will confirm it before checkout.
          </p>
        ) : null}
      </div>

      <div className="mt-4">
        <BookingLink
          url={productUrl}
          label={checkState === 'live' && availability?.available ? 'Continue to Viator' : 'Check final availability on Viator'}
          name={productTitle}
          slug={productCode}
          event={ANALYTICS_EVENTS.ACTIVITY_AFFILIATE_CLICKED}
          partner="Viator"
          placement="affiliate"
        />
      </div>
      <p className="mt-3 text-2xs leading-relaxed text-ink-faint">
        Prices shown are supplied by Viator. Viator handles checkout, payment, booking confirmation, and post-booking service.
      </p>
    </section>
  );
}
