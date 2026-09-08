import fs from 'node:fs/promises';
const dates = ['2026-09-08','2026-09-09','2026-09-10','2026-09-11','2026-09-12','2026-09-13','2026-09-14'];
const seed = await fs.readFile('scripts/nestio-direct-probe.mjs','utf8');
const key = seed.match(/key=([^&']+)/)?.[1] || seed.match(/widgetKey[^;]+/)?.[0]?.match(/[a-f0-9]{32}/)?.[0];
if (!key) throw new Error('Could not locate widget key in prior diagnostic');
const headers = { Authorization: `Basic ${Buffer.from(`${key}:undefined`).toString('base64')}`, Accept: 'application/json' };
const groups = [
  ['Emblem Park','10676',['guided']],
  ['Westerly House','8221',['guided','video']],
  ['Queens Wedgewood Houston','6311',['guided','video']],
];
const result = { capturedAt: new Date().toISOString(), dates, nestio: {}, kairoi: {} };
for (const [name,id,types] of groups) {
  result.nestio[name] = { id, types, availability: {} };
  for (const type of types) {
    result.nestio[name].availability[type] = {};
    for (const date of dates) {
      const url = `https://nestiolistings.com/api/v2/appointments/group/${id}/available-times?from_date=${date}&tour_type=${type}`;
      try {
        const r = await fetch(url,{headers,signal:AbortSignal.timeout(15000)});
        const text = await r.text();
        let body=text; try{body=JSON.parse(text)}catch{}
        result.nestio[name].availability[type][date]={status:r.status,body};
      } catch(e) { result.nestio[name].availability[type][date]={error:String(e)}; }
    }
  }
}
for (const [name,base] of Object.entries({delux:'https://deluxweho.com',limestone:'https://liveatlimestone.com'})) {
  result.kairoi[name] = {};
  for (const p of ['/tour-scheduler-cache/tour-scheduler-cache-settings.json','/tour-scheduler-cache/tour-scheduler-cache.json','/get-tour-slots/']) {
    try {
      const r=await fetch(base+p,{headers:{Accept:'application/json,text/plain,*/*','User-Agent':'Mozilla/5.0'},redirect:'follow',signal:AbortSignal.timeout(20000)});
      const text=await r.text(); let body=text; try{body=JSON.parse(text)}catch{}
      result.kairoi[name][p]={status:r.status,finalUrl:r.url,body};
    } catch(e) { result.kairoi[name][p]={error:String(e)}; }
  }
}
await fs.mkdir('tour-fast-output',{recursive:true});
await fs.writeFile('tour-fast-output/results.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
