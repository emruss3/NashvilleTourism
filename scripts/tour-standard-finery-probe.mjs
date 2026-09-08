import fs from 'node:fs/promises';

const dates = ['2026-09-08','2026-09-09','2026-09-10','2026-09-11','2026-09-12','2026-09-13','2026-09-14'];
const seed = await fs.readFile('scripts/nestio-direct-probe.mjs','utf8');
const key = seed.match(/key=([^&']+)/)?.[1];
if (!key) throw new Error('Missing public Funnel widget key');
const auth = `Basic ${Buffer.from(`${key}:undefined`).toString('base64')}`;
const headers = { Authorization: auth, Accept: 'application/json' };
const result = { capturedAt: new Date().toISOString(), dates, standard: {}, finery: {} };

let r = await fetch('https://thestandardassembly.com/schedule-a-tour/', {
  redirect: 'follow',
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36', Accept: 'text/html,application/xhtml+xml' },
  signal: AbortSignal.timeout(30000)
});
let text = await r.text();
result.standard.source = { status: r.status, finalUrl: r.url, text };
const groupCandidates = [...new Set([
  ...[...text.matchAll(/[?&]group=(\d+)/gi)].map(m => m[1]),
  ...[...text.matchAll(/group[^0-9]{0,30}(\d{3,10})/gi)].map(m => m[1]),
  ...[...text.matchAll(/employee[_ -]?group[^0-9]{0,30}(\d{3,10})/gi)].map(m => m[1]),
])];
result.standard.groupCandidates = groupCandidates;
result.standard.groups = {};
for (const standardGroup of groupCandidates) {
  const groupResult = { config: null, availability: {} };
  r = await fetch(`https://nestiolistings.com/api/v2/group/${standardGroup}/`, { headers, signal: AbortSignal.timeout(20000) });
  text = await r.text(); let body = text; try { body = JSON.parse(text); } catch {}
  groupResult.config = { status: r.status, body };
  const enabled = [];
  if (body && typeof body === 'object') {
    if (body.appointments_in_person_enabled) enabled.push('guided');
    if (body.appointments_video_enabled) enabled.push('video');
    if (body.appointments_self_guided_enabled) enabled.push('self-guided');
  }
  if (!enabled.length && r.status === 200) enabled.push('guided');
  for (const type of enabled) {
    groupResult.availability[type] = {};
    for (const date of dates) {
      const url = `https://nestiolistings.com/api/v2/appointments/group/${standardGroup}/available-times?from_date=${date}&tour_type=${encodeURIComponent(type)}`;
      try {
        r = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
        text = await r.text(); body = text; try { body = JSON.parse(text); } catch {}
        groupResult.availability[type][date] = { status: r.status, body };
      } catch (error) {
        groupResult.availability[type][date] = { error: String(error) };
      }
    }
  }
  result.standard.groups[standardGroup] = groupResult;
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
  standardSource: { status: result.standard.source.status, finalUrl: result.standard.source.finalUrl, length: result.standard.source.text.length },
  standardGroupCandidates: groupCandidates,
  standardGroups: Object.fromEntries(Object.entries(result.standard.groups).map(([id,g]) => [id,{configStatus:g.config?.status,enabled:Object.keys(g.availability)}])),
  fineryStatuses: Object.fromEntries(Object.entries(result.finery).map(([d,v])=>[d,v.status??v.error]))
},null,2));
