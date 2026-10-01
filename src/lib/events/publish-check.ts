/**
 * The publish rules in plain language, mirroring the database triggers
 * (event_venue_publish_check, event_space_publish_check,
 * event_package_publish_check) so the dashboard can show a venue exactly
 * what is missing before it asks the database. The triggers stay the guard;
 * this is the explanation. Pure and unit-tested.
 */

const TODO = /TODO/;

export interface VenueForCheck {
  name: string;
  summary?: string | null;
  description?: string | null;
  address?: string | null;
  salesContactName?: string | null;
  salesContactEmail?: string | null;
  hoursNote?: string | null;
  approvedAt?: string | null;
}

export interface SpaceForCheck {
  name: string;
  summary?: string | null;
  seatedCapacity: number;
  standingCapacity: number;
  pricingModel: 'room_fee' | 'min_spend' | 'per_person' | 'buyout';
  minSpendCents?: number | null;
  roomFeeCents?: number | null;
  perPersonCents?: number | null;
  buyoutFromCents?: number | null;
  pricingNote?: string | null;
  avNote?: string | null;
  hoursNote?: string | null;
  blackoutNote?: string | null;
}

export interface PackageForCheck {
  name: string;
  summary?: string | null;
  includes?: string[] | null;
  depositNote?: string | null;
  bookUrl?: string | null;
  maxGuests?: number | null;
  priceCents: number;
}

function placeholderFields(fields: Array<[string, string | null | undefined]>): string[] {
  return fields.filter(([, v]) => typeof v === 'string' && TODO.test(v)).map(([label]) => `${label} still says TODO`);
}

/** Problems that stop the venue itself from being published. Empty means it can go. */
export function venueProblems(venue: VenueForCheck): string[] {
  const out = placeholderFields([
    ['The venue name', venue.name],
    ['The summary', venue.summary],
    ['The description', venue.description],
    ['The address', venue.address],
    ['The sales contact name', venue.salesContactName],
    ['The sales contact email', venue.salesContactEmail],
    ['The hours note', venue.hoursNote],
  ]);
  if (!venue.salesContactEmail?.trim()) out.push('A sales contact email is required; leads are sent there');
  if (!venue.approvedAt) out.push('The events desk has not approved the first publish yet');
  return out;
}

/** Problems that stop one space from being published. */
export function spaceProblems(space: SpaceForCheck): string[] {
  const out: string[] = [];
  const who = space.name?.trim() && !TODO.test(space.name) ? space.name.trim() : 'This space';
  if (!(space.seatedCapacity > 0)) out.push(`${who} needs a seated capacity`);
  if (!(space.standingCapacity > 0)) out.push(`${who} needs a standing capacity`);
  const prices = [space.minSpendCents, space.roomFeeCents, space.perPersonCents, space.buyoutFromCents];
  if (!prices.some((p) => typeof p === 'number' && p > 0)) out.push(`${who} needs a price: minimum spend, room fee, per person or buyout`);
  out.push(
    ...placeholderFields([
      ['The space name', space.name],
      ['The summary', space.summary],
      ['The pricing note', space.pricingNote],
      ['The AV note', space.avNote],
      ['The hours note', space.hoursNote],
      ['The blackout note', space.blackoutNote],
    ]),
  );
  return out;
}

/** Problems that stop one package from being published. */
export function packageProblems(pkg: PackageForCheck): string[] {
  const out = placeholderFields([
    ['The package name', pkg.name],
    ['The summary', pkg.summary],
    ['What is included', (pkg.includes ?? []).join(' ')],
    ['The deposit note', pkg.depositNote],
  ]);
  if (!(pkg.priceCents > 0)) out.push('A price is required');
  if (!pkg.bookUrl?.trim()) out.push('A booking link to your own system is required');
  if (!pkg.maxGuests) out.push('A maximum group size is required');
  return out;
}

/** Turn a database trigger message into the same plain language. */
export function explainDbError(message: string): string {
  const m = message.replace(/^.*?: cannot publish (\S+) /, (_, slug) => `Cannot publish ${slug}: `);
  return m.replace(/\(event_[a-z_]+\)/g, '').trim();
}
