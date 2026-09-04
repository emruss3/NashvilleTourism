export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DATES = [
  '09/11/2026',
  '09/12/2026',
  '09/13/2026',
  '09/14/2026',
  '09/15/2026',
  '09/16/2026',
  '09/17/2026',
  '09/18/2026',
] as const;

const TARGETS = [
  { name: 'Memoir May Hosiery', url: 'https://www.memoir-mayhosiery.com/scheduletour' },
  { name: 'Memoir Wedgewood Houston', url: 'https://www.memoir-wedgewoodhouston.com/scheduletour' },
] as const;

const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:142.0) Gecko/20100101 Firefox/142.0',
] as const;

function textOnly(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSetCookies(headers: Headers): string[] {
  const h = headers as Headers & { getSetCookie?: () => string[] };
  const values = h.getSetCookie?.();
  if (values?.length) return values;
  const one = headers.get('set-cookie');
  return one ? [one] : [];
}

function mergeCookies(jar: Map<string, string>, setCookies: string[]): void {
  for (const raw of setCookies) {
    const first = raw.split(';', 1)[0];
    const eq = first.indexOf('=');
    if (eq > 0) jar.set(first.slice(0, eq).trim(), first.slice(eq + 1).trim());
  }
}

function cookieHeader(jar: Map<string, string>): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function findToken(html: string, ids: string[]): string | null {
  for (const id of ids) {
    const patterns = [
      new RegExp(`<input[^>]+id=["']${id}["'][^>]+value=["']([^"']+)["']`, 'i'),
      new RegExp(`<input[^>]+value=["']([^"']+)["'][^>]+id=["']${id}["']`, 'i'),
      new RegExp(`<input[^>]+name=["']${id}["'][^>]+value=["']([^"']+)["']`, 'i'),
      new RegExp(`<input[^>]+value=["']([^"']+)["'][^>]+name=["']${id}["']`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return match[1];
    }
  }
  return null;
}

function extractTimes(html: string): string[] {
  const out: string[] = [];
  const buttonPattern = /<(?:button|a)[^>]*class=["'][^"']*availableslots_button[^"']*["'][^>]*>([\s\S]*?)<\/(?:button|a)>/gi;
  for (const match of html.matchAll(buttonPattern)) {
    const value = textOnly(match[1]);
    if (/\b(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:AM|PM)\b/i.test(value)) out.push(value);
  }
  if (!out.length) {
    const text = textOnly(html);
    for (const match of text.matchAll(/\b(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:AM|PM)\b/gi)) out.push(match[0]);
  }
  return [...new Set(out.map((x) => x.replace(/\s+/g, ' ').trim()))];
}

async function fetchWithJar(url: string, jar: Map<string, string>, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  const cookies = cookieHeader(jar);
  if (cookies) headers.set('Cookie', cookies);
  const response = await fetch(url, { ...init, headers, redirect: 'follow', cache: 'no-store' });
  mergeCookies(jar, getSetCookies(response.headers));
  return response;
}

async function auditTarget(target: (typeof TARGETS)[number]) {
  const attempts = [];
  for (const ua of UAS) {
    const jar = new Map<string, string>();
    try {
      const pageResponse = await fetchWithJar(target.url, jar, {
        method: 'GET',
        headers: {
          'User-Agent': ua,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Upgrade-Insecure-Requests': '1',
        },
      });
      const pageHtml = await pageResponse.text();
      const token = findToken(pageHtml, [
        'scheduletour-request-verification-token',
        '__RequestVerificationToken',
        'request-verification-token',
      ]);
      const attempt: Record<string, unknown> = {
        ua: ua.slice(0, 80),
        pageStatus: pageResponse.status,
        finalUrl: pageResponse.url,
        pageTitle: pageHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null,
        pageLength: pageHtml.length,
        tokenFound: Boolean(token),
        cookies: [...jar.keys()],
        pageTextPreview: textOnly(pageHtml).slice(0, 800),
        days: {},
      };
      if (pageResponse.ok && token) {
        const origin = new URL(pageResponse.url).origin;
        const handlerUrl = `${origin}/scheduletour?handler=GetAvailableSlots`;
        for (const date of DATES) {
          const body = new URLSearchParams({
            dtSchedule: date,
            tourType: '0',
            txtBedroom: '',
            units: '',
          });
          const slotResponse = await fetchWithJar(handlerUrl, jar, {
            method: 'POST',
            headers: {
              'User-Agent': ua,
              Accept: 'text/html, */*; q=0.01',
              'Accept-Language': 'en-US,en;q=0.9',
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'RequestVerificationToken': token,
              Origin: origin,
              Referer: pageResponse.url,
              'X-Requested-With': 'XMLHttpRequest',
              'Cache-Control': 'no-cache',
              Pragma: 'no-cache',
              'Sec-Fetch-Dest': 'empty',
              'Sec-Fetch-Mode': 'cors',
              'Sec-Fetch-Site': 'same-origin',
            },
            body: body.toString(),
          });
          const slotHtml = await slotResponse.text();
          (attempt.days as Record<string, unknown>)[date] = {
            status: slotResponse.status,
            times: extractTimes(slotHtml),
            text: textOnly(slotHtml).slice(0, 1000),
            htmlPreview: slotHtml.slice(0, 1200),
          };
        }
      }
      attempts.push(attempt);
      if (token && pageResponse.ok) break;
    } catch (error) {
      attempts.push({ ua: ua.slice(0, 80), error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { name: target.name, url: target.url, attempts };
}

export async function GET() {
  const results = await Promise.all(TARGETS.map(auditTarget));
  return Response.json(
    { auditedAt: new Date().toISOString(), dates: DATES, results },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
