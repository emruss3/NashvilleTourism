import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const SITES: Record<string, string> = {
  emblem: 'https://emblemparknashville.com/schedule-a-tour/',
  westerly: 'https://livewesterlyhouse.com/schedule-a-tour/',
  park445: 'https://445parkcommons.com/schedule-a-tour/',
  finery: 'https://livethefinery.com/',
  memoirweho: 'https://memoirresidential.com/properties/wedgewoodhouston',
  memoirhosiery: 'https://memoirresidential.com/properties/may-hosiery',
  standard: 'https://www.greystar.com/properties/nashville-tn/standard-assembly-apartments-nashville-tn/p_19399',
  queens: 'https://queensweho.com/',
  luna: 'https://lunanashvilleliving.com/schedule-a-tour/',
  delux: 'https://deluxweho.com/',
  coda: 'https://thecodanashville.com/',
};

const clickTourScript = String.raw`
(async () => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  await sleep(3500);
  const elements = Array.from(document.querySelectorAll('a,button,[role="button"]'));
  const target = elements.find((el) => /schedule\s*(a\s*)?tour|book\s*(a\s*)?tour|tour\s*now|schedule\s*(an\s*)?appointment/i.test((el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim()));
  if (target) {
    target.click();
    await sleep(9000);
  }
})();`;

export async function GET(req: NextRequest) {
  const site = req.nextUrl.searchParams.get('site') || '';
  const mode = req.nextUrl.searchParams.get('mode') || 'reader';
  const target = SITES[site];

  if (!target) {
    return NextResponse.json({ error: 'Unknown site', allowed: Object.keys(SITES) }, { status: 400 });
  }

  try {
    if (mode === 'source') {
      const response = await fetch(target, {
        cache: 'no-store',
        redirect: 'follow',
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
          accept: 'text/html,application/xhtml+xml',
        },
      });
      const text = await response.text();
      return NextResponse.json({
        target,
        finalUrl: response.url,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        text: text.slice(0, 1_500_000),
      });
    }

    const body: Record<string, unknown> = {
      url: target,
      viewport: { width: 1440, height: 1100 },
    };
    if (mode === 'click') body.injectPageScript = [clickTourScript];

    const response = await fetch('https://r.jina.ai/', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'x-no-cache': 'true',
        'x-timeout': '50',
        'x-with-iframe': 'true',
        'x-with-shadow-dom': 'true',
        'x-with-links-summary': 'all',
        'x-locale': 'en-US',
        'x-user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let parsed: unknown = text;
    try { parsed = JSON.parse(text); } catch {}
    return NextResponse.json({
      target,
      mode,
      jinaStatus: response.status,
      jinaHeaders: Object.fromEntries(response.headers.entries()),
      result: parsed,
    }, { status: response.ok ? 200 : 502 });
  } catch (error) {
    return NextResponse.json({ target, mode, error: String(error) }, { status: 500 });
  }
}
