import fs from 'node:fs/promises';

const START = new Date('2026-09-08T12:00:00-05:00');
const DATES = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(START);
  d.setDate(d.getDate() + i);
  return d.toISOString().slice(0, 10);
});
const out = { capturedAt: new Date().toISOString(), dates: DATES, nestio: [], kairoi: {}, pages: {} };
await fs.mkdir('tour-direct-output', { recursive: true });

const nestioKey = '03f5fe3982bf41a380739512238020a1';
const nestioAuth = `Basic ${Buffer.from(`${nestioKey}:undefined`).toString('base64')}`;
const groups = [
  { name: 'Emblem Park', id: '10676', types: ['guided'] },
  { name: 'Westerly House', id: '8221', types: ['guided', 'video'] },
  { name: 'Queens Wedgewood Houston', id: '6311', types: ['guided', 'video'] },
];
for (const group of groups) {
  const result = { ...group, config: null, availability: {} };
  const configResponse = await fetch(`https://nestiolistings.com/api/v2/group/${group.id}/`, { headers: { Authorization: nestioAuth, Accept: 'application/json' } });
  result.config = { status: configResponse.status, body: await configResponse.json().catch(async () => await configResponse.text()) };
  for (const type of group.types) {
    result.availability[type] = {};
    for (const date of DATES) {
      const url = `https://nestiolistings.com/api/v2/appointments/group/${group.id}/available-times?from_date=${date}&tour_type=${encodeURIComponent(type)}`;
      const response = await fetch(url, { headers: { Authorization: nestioAuth, Accept: 'application/json' } });
      const text = await response.text();
      let body = text;
      try { body = JSON.parse(text); } catch {}
      result.availability[type][date] = { status: response.status, body };
    }
  }
  out.nestio.push(result);
}

const kairoiDomains = {
  delux: ['https://deluxweho.com', 'https://www.deluxweho.com'],
  limestone: ['https://liveatlimestone.com', 'https://www.liveatlimestone.com'],
};
for (const [name, domains] of Object.entries(kairoiDomains)) {
  out.kairoi[name] = [];
  for (const domain of domains) {
    const record = { domain, responses: {} };
    for (const pathname of [
      '/tour-scheduler-cache/tour-scheduler-cache-settings.json',
      '/tour-scheduler-cache/tour-scheduler-cache.json',
      '/get-tour-slots/'
    ]) {
      const url = domain + pathname;
      try {
        const response = await fetch(url, { redirect: 'follow', headers: { Accept: 'application/json,text/plain,*/*', 'User-Agent': 'Mozilla/5.0' } });
        const text = await response.text();
        let body = text;
        try { body = JSON.parse(text); } catch {}
        record.responses[pathname] = { status: response.status, finalUrl: response.url, headers: Object.fromEntries(response.headers), body };
      } catch (error) {
        record.responses[pathname] = { error: String(error) };
      }
    }
    out.kairoi[name].push(record);
  }
}

const pages = {
  codaProspectPortal: 'https://coda.prospectportal.com/nashville/coda/conventional/',
  codaScheduleTour: 'https://thecodanashville.com/schedule-tour/',
  standardOfficial: 'https://thestandardassembly.com/',
  standardTour: 'https://thestandardassembly.com/schedule-a-tour/',
  fineryHyly: 'https://my.hy.ly/tours/livethefinery/site?dd=0&popup=1',
};
for (const [name, url] of Object.entries(pages)) {
  try {
    const response = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36', Accept: 'text/html,application/xhtml+xml' } });
    const text = await response.text();
    out.pages[name] = { status: response.status, finalUrl: response.url, headers: Object.fromEntries(response.headers), text: text.slice(0, 1000000) };
  } catch (error) {
    out.pages[name] = { error: String(error) };
  }
}

await fs.writeFile('tour-direct-output/results.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify({
  capturedAt: out.capturedAt,
  dates: out.dates,
  nestio: out.nestio.map((g) => ({ name: g.name, configStatus: g.config?.status, counts: Object.fromEntries(Object.entries(g.availability).map(([type, days]) => [type, Object.fromEntries(Object.entries(days).map(([date, v]) => [date, Array.isArray(v.body?.available_times) ? v.body.available_times.length : v.status]))])) })),
  kairoi: Object.fromEntries(Object.entries(out.kairoi).map(([k,v]) => [k, v.map((r) => ({ domain: r.domain, statuses: Object.fromEntries(Object.entries(r.responses).map(([p,x]) => [p, x.status ?? x.error])) }))])),
  pages: Object.fromEntries(Object.entries(out.pages).map(([k,v]) => [k, { status: v.status, finalUrl: v.finalUrl, len: v.text?.length, error: v.error }]))
}, null, 2));
