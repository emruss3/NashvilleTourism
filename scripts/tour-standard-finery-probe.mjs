import fs from 'node:fs/promises';

const dates = ['2026-09-08','2026-09-09','2026-09-10','2026-09-11','2026-09-12','2026-09-13','2026-09-14'];
const seed = await fs.readFile('scripts/nestio-direct-probe.mjs','utf8');
const key = seed.match(/key=([^&']+)/)?.[1];
if (!key) throw new Error('Missing public Funnel widget key');
const auth = `Basic ${Buffer.from(`${key}:undefined`).toString('base64')}`;
const headers = { Authorization: auth, Accept: 'application/json' };
const result = { capturedAt: new Date().toISOString(), dates, standard: {}, finery: {} };

const standardGroup = '6249';
let r = await fetch(`https://nestiolistings.com/api/v2/group/${standardGroup}/`, { headers, signal: AbortSignal.timeout(20000) });
let text = await r.text(); let body = text; try { body = JSON.parse(text); } catch {}
result.standard.config = { status: r.status, body };
const enabled = [];
if (body && typeof body === 'object') {
  if (body.appointments_in_person_enabled) enabled.push('guided');
  if (body.appointments_video_enabled) enabled.push('video');
  if (body.appointments_self_guided_enabled) enabled.push('self-guided');
}
if (!enabled.length) enabled.push('guided','video','self-guided');
result.standard.availability = {};
for (const type of enabled) {
  result.standard.availability[type] = {};
  for (const date of dates) {
    const url = `https://nestiolistings.com/api/v2/appointments/group/${standardGroup}/available-times?from_date=${date}&tour_type=${encodeURIComponent(type)}`;
    try {
      r = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
      text = await r.text(); body = text; try { body = JSON.parse(text); } catch {}
      result.standard.availability[type][date] = { status: r.status, body };
    } catch (error) {
      result.standard.availability[type][date] = { error: String(error) };
    }
  }
}

for (const date of dates) {
  const slash = date.replaceAll('-','/');
  const params = new URLSearchParams({ tpl_id: '1587156259900772678', date: slash, appointment_type: 'in_person' });
  const url = `https://schedule.tours/schedules/1769511060134303458/time_select?${params}`;
  try {
    r = await fetch(url, { headers: { Accept: '*/*', 'X-Requested-With': 'XMLHttpRequest', Referer: 'https://schedule.tours/hines-development/livethefinery/schedule', 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(20000) });
    text = await r.text();
    result.finery[date] = { status: r.status, url: r.url, text };
  } catch (error) {
    result.finery[date] = { error: String(error) };
  }
}

await fs.mkdir('tour-standard-finery-output',{recursive:true});
await fs.writeFile('tour-standard-finery-output/results.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({
  capturedAt: result.capturedAt,
  standardEnabled: enabled,
  standardStatuses: Object.fromEntries(Object.entries(result.standard.availability).map(([t,days])=>[t,Object.fromEntries(Object.entries(days).map(([d,v])=>[d,v.status??v.error]))])),
  fineryStatuses: Object.fromEntries(Object.entries(result.finery).map(([d,v])=>[d,v.status??v.error]))
},null,2));
