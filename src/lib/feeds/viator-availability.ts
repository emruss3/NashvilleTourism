type UnknownRecord = Record<string, unknown>;

export interface ViatorAvailabilityMoney {
  amount: number;
  currency: string;
  formatted: string;
}

export interface ViatorScheduleDateRange {
  startDate: string;
  endDate: string;
}

export interface ViatorScheduleOptionSummary {
  productOptionCode: string;
  title?: string;
  dateRanges: ViatorScheduleDateRange[];
  daysOfWeek: string[];
  startTimes: string[];
  ageBands: string[];
  fromPrice?: ViatorAvailabilityMoney;
}

export interface ViatorScheduleSummary {
  productCode: string;
  currency: string;
  fromPrice?: ViatorAvailabilityMoney;
  options: ViatorScheduleOptionSummary[];
  dateRanges: ViatorScheduleDateRange[];
  daysOfWeek: string[];
  startTimes: string[];
  ageBands: string[];
  fetchedAt: string;
}

export interface ViatorAvailabilityQuote {
  available: boolean | null;
  status?: string;
  totalPrice?: ViatorAvailabilityMoney;
  productOptionCode?: string;
  travelDate?: string;
  startTime?: string;
  message?: string;
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function strings(values: unknown[]): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean))];
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  if (isRecord(value)) {
    for (const key of ['amount', 'value', 'price']) {
      const parsed = numberValue(value[key]);
      if (parsed != null) return parsed;
    }
  }
  return undefined;
}

function findFirstString(root: unknown, keys: Set<string>, depth = 0): string | undefined {
  if (depth > 8) return undefined;
  if (Array.isArray(root)) {
    for (const value of root) {
      const found = findFirstString(value, keys, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  if (!isRecord(root)) return undefined;
  for (const [key, value] of Object.entries(root)) {
    if (keys.has(key.toLowerCase()) && typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  for (const value of Object.values(root)) {
    const found = findFirstString(value, keys, depth + 1);
    if (found) return found;
  }
  return undefined;
}

function collectByKey(root: unknown, keyNames: Set<string>, depth = 0, output: unknown[] = []): unknown[] {
  if (depth > 10) return output;
  if (Array.isArray(root)) {
    for (const value of root) collectByKey(value, keyNames, depth + 1, output);
    return output;
  }
  if (!isRecord(root)) return output;
  for (const [key, value] of Object.entries(root)) {
    if (keyNames.has(key.toLowerCase())) output.push(value);
    collectByKey(value, keyNames, depth + 1, output);
  }
  return output;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isClockTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
}

function collectDateRanges(root: unknown, depth = 0, output: ViatorScheduleDateRange[] = []): ViatorScheduleDateRange[] {
  if (depth > 10) return output;
  if (Array.isArray(root)) {
    for (const value of root) collectDateRanges(value, depth + 1, output);
    return output;
  }
  if (!isRecord(root)) return output;

  const startDate = root.startDate;
  const endDate = root.endDate;
  if (isIsoDate(startDate) && isIsoDate(endDate)) output.push({ startDate, endDate });

  for (const value of Object.values(root)) collectDateRanges(value, depth + 1, output);
  return output;
}

function uniqueDateRanges(ranges: ViatorScheduleDateRange[]): ViatorScheduleDateRange[] {
  const seen = new Set<string>();
  return ranges
    .filter((range) => {
      const key = `${range.startDate}:${range.endDate}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 50);
}

const RETAIL_PRICE_KEYS = new Set([
  'recommendedretailprice',
  'retailprice',
  'fromprice',
  'totalprice',
  'price',
]);

const PRIVATE_PRICE_PATH = /(partnernet|netprice|commission|supplier|merchant|bookingfee|payout)/i;

function collectRetailPrices(
  root: unknown,
  path = '',
  depth = 0,
  output: number[] = [],
): number[] {
  if (depth > 12 || PRIVATE_PRICE_PATH.test(path)) return output;
  if (Array.isArray(root)) {
    for (const value of root) collectRetailPrices(value, path, depth + 1, output);
    return output;
  }
  if (!isRecord(root)) return output;

  for (const [key, value] of Object.entries(root)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (PRIVATE_PRICE_PATH.test(nextPath)) continue;
    if (RETAIL_PRICE_KEYS.has(key.toLowerCase())) {
      const amount = numberValue(value);
      if (amount != null && amount > 0 && amount < 1_000_000) output.push(amount);
    }
    collectRetailPrices(value, nextPath, depth + 1, output);
  }
  return output;
}

function money(amount: number | undefined, currency: string): ViatorAvailabilityMoney | undefined {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return undefined;
  return {
    amount,
    currency,
    formatted: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount),
  };
}

function minimumPrice(root: unknown): number | undefined {
  const prices = collectRetailPrices(root).filter((price) => Number.isFinite(price) && price > 0);
  return prices.length ? Math.min(...prices) : undefined;
}

function optionCandidates(payload: UnknownRecord): UnknownRecord[] {
  const direct = [payload.bookableItems, payload.productOptions, payload.options]
    .find((value) => Array.isArray(value));
  if (Array.isArray(direct)) return direct.filter(isRecord);

  const nested = collectByKey(payload, new Set(['bookableitems', 'productoptions']))
    .find((value) => Array.isArray(value));
  if (Array.isArray(nested)) return nested.filter(isRecord);

  return [payload];
}

function optionCode(option: UnknownRecord, index: number): string {
  for (const key of ['productOptionCode', 'optionCode', 'code']) {
    const value = option[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return `OPTION_${index + 1}`;
}

function optionTitle(option: UnknownRecord): string | undefined {
  for (const key of ['title', 'productOptionTitle', 'productOptionName', 'description']) {
    const value = option[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function valuesForKeys(root: unknown, keys: string[]): string[] {
  const values = collectByKey(root, new Set(keys.map((key) => key.toLowerCase()))).flatMap((value) =>
    Array.isArray(value) ? value : [value],
  );
  return strings(values);
}

function startTimes(root: unknown): string[] {
  return valuesForKeys(root, ['startTime', 'startTimes'])
    .filter(isClockTime)
    .map((value) => value.slice(0, 5))
    .sort()
    .slice(0, 40);
}

function daysOfWeek(root: unknown): string[] {
  return valuesForKeys(root, ['daysOfWeek', 'dayOfWeek'])
    .map((value) => value.toUpperCase())
    .filter((value) => /^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)$/.test(value));
}

function ageBands(root: unknown): string[] {
  return valuesForKeys(root, ['ageBand', 'ageBands'])
    .map((value) => value.toUpperCase())
    .filter((value) => /^(ADULT|CHILD|INFANT|YOUTH|SENIOR|TRAVELER)$/.test(value));
}

export function normalizeViatorSchedules(
  raw: unknown,
  fallbackProductCode: string,
): ViatorScheduleSummary {
  const payload = asRecord(raw);
  const productCode =
    findFirstString(payload, new Set(['productcode'])) ?? fallbackProductCode;
  const currency =
    (findFirstString(payload, new Set(['currency', 'currencycode'])) ?? 'USD').toUpperCase();

  const options = optionCandidates(payload).map((option, index) => ({
    productOptionCode: optionCode(option, index),
    title: optionTitle(option),
    dateRanges: uniqueDateRanges(collectDateRanges(option)),
    daysOfWeek: daysOfWeek(option),
    startTimes: startTimes(option),
    ageBands: ageBands(option),
    fromPrice: money(minimumPrice(option), currency),
  }));

  return {
    productCode,
    currency,
    fromPrice: money(minimumPrice(payload), currency),
    options,
    dateRanges: uniqueDateRanges(collectDateRanges(payload)),
    daysOfWeek: daysOfWeek(payload),
    startTimes: startTimes(payload),
    ageBands: ageBands(payload),
    fetchedAt: new Date().toISOString(),
  };
}

function explicitAvailability(payload: UnknownRecord): boolean | null {
  for (const key of ['available', 'isAvailable', 'bookable', 'isBookable']) {
    if (typeof payload[key] === 'boolean') return payload[key] as boolean;
  }
  const status = findFirstString(payload, new Set(['status', 'availabilitystatus']))?.toUpperCase();
  if (!status) return null;
  if (/AVAILABLE|BOOKABLE|SUCCESS/.test(status)) return true;
  if (/UNAVAILABLE|SOLD_OUT|NOT_AVAILABLE|FAILED|REJECTED/.test(status)) return false;
  return null;
}

export function normalizeViatorAvailabilityQuote(raw: unknown): ViatorAvailabilityQuote {
  const payload = asRecord(raw);
  const currency =
    (findFirstString(payload, new Set(['currency', 'currencycode'])) ?? 'USD').toUpperCase();
  const status = findFirstString(payload, new Set(['status', 'availabilitystatus']));
  const message = findFirstString(payload, new Set(['message', 'description', 'reason']));
  const productOptionCode = findFirstString(payload, new Set(['productoptioncode', 'optioncode']));
  const travelDate = findFirstString(payload, new Set(['traveldate', 'date']));
  const startTime = findFirstString(payload, new Set(['starttime']));

  return {
    available: explicitAvailability(payload),
    status,
    totalPrice: money(minimumPrice(payload), currency),
    productOptionCode,
    travelDate: travelDate && isIsoDate(travelDate) ? travelDate : undefined,
    startTime: startTime && isClockTime(startTime) ? startTime.slice(0, 5) : undefined,
    message,
  };
}
