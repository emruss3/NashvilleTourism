import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const dates = ['2026-09-08','2026-09-09','2026-09-10','2026-09-11','2026-09-12','2026-09-13','2026-09-14'];
const mmddyyyy = Object.fromEntries(dates.map(d => { const [y,m,day]=d.split('-'); return [d,`${m}/${day}/${y}`]; }));
const out = { capturedAt: new Date().toISOString(), dates, luna: {}, knock445: {}, memoir: { may: {}, wedgewood: {} } };
await fs.mkdir('tour-remaining-output',{recursive:true});

async function fetchRecord(url, options={}) {
  try {
    const r = await fetch(url, { redirect:'follow', signal:AbortSignal.timeout(45000), headers:{ 'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36', Accept:'*/*', ...(options.headers||{}) }, ...options });
    const text = await r.text();
    let body=text; try{body=JSON.parse(text)}catch{}
    return { status:r.status, finalUrl:r.url, headers:Object.fromEntries(r.headers), body };
  } catch(error) { return { error:String(error) }; }
}

// Luna uses the same Kairoi tour-scheduler endpoints as Delux.
for (const base of ['https://lunanashvilleliving.com','https://www.lunanashvilleliving.com']) {
  const rec = {};
  for (const p of ['/tour-scheduler-cache/tour-scheduler-cache-settings.json','/tour-scheduler-cache/tour-scheduler-cache.json','/get-tour-slots/']) {
    rec[p] = await fetchRecord(base+p,{headers:{Accept:'application/json,text/plain,*/*'}});
  }
  out.luna[base]=rec;
}

// Probe all Knock tour-type parameter names observed in the live 445 widget.
for (const type of ['', 'in_person','agent_guided','guided','live_video','video','virtual','self_guided','self-guided']) {
  const suffix = type ? `?tour_type=${encodeURIComponent(type)}` : '';
  out.knock445[type || 'default'] = await fetchRecord(`https://doorway-api.knockrentals.com/v1/property/2032046/available-times${suffix}`,{headers:{Accept:'application/json'}});
}
out.knock445.requirements = await fetchRecord('https://doorway-api.knockrentals.com/v1/property/2032046/scheduling-requirements',{headers:{Accept:'application/json'}});
out.knock445.property = await fetchRecord('https://doorway-api.knockrentals.com/v1/property/2032046',{headers:{Accept:'application/json'}});

// Direct RentCafe source and endpoint attempts.
const urls = {
  maySchedule: 'https://memoir-mayhosiery.securecafe.com/scheduletour',
  mayPublic: 'https://www.memoir-mayhosiery.com/scheduletour',
  wedgeSchedule: 'https://www.memoir-wedgewoodhouston.com/scheduletour',
  wedgeSecure: 'https://memoir-wedgewoodhouston.securecafe.com/scheduletour',
  wedgeGuest: 'https://memoir-wedgewoodhouston.securecafe.com/onlineleasing/memoir-wedgewood-houston/guestlogin.aspx',
  wedgeGuestNoAsPx: 'https://memoir-wedgewoodhouston.securecafe.com/onlineleasing/memoir-wedgewood-houston/guestlogin',
};
for (const [k,u] of Object.entries(urls)) out.memoir.wedgewood[`source_${k}`]=await fetchRecord(u,{headers:{Accept:'text/html,application/xhtml+xml'}});

const sourceTexts = Object.values(out.memoir.wedgewood).map(x => typeof x?.body==='string' ? x.body : '').join('\n');
const candidateIds = [...new Set([
  ...[...sourceTexts.matchAll(/txtmyPropertyId[^>]{0,300}?value=["']?(\d{5,10})/gi)].map(m=>m[1]),
  ...[...sourceTexts.matchAll(/propertyId[^0-9]{0,40}(\d{5,10})/gi)].map(m=>m[1]),
  ...[...sourceTexts.matchAll(/nudge_(\d{5,10})/gi)].map(m=>m[1]),
  ...[...sourceTexts.matchAll(/ce_propertyId_phonenumber[^0-9]{0,50}(\d{5,10})/gi)].map(m=>m[1]),
])];
out.memoir.wedgewood.candidateIds = candidateIds;

// Wayback source discovery for the Wedgewood RentCafe property ID.
out.memoir.wedgewood.waybackCdx = await fetchRecord('https://web.archive.org/cdx/search/cdx?url=www.memoir-wedgewoodhouston.com/scheduletour&output=json&filter=statuscode:200&fl=timestamp,original,statuscode,digest&limit=10&from=2023&to=2026');
let cdx = out.memoir.wedgewood.waybackCdx.body;
if (Array.isArray(cdx) && cdx.length > 1) {
  for (const row of cdx.slice(1).reverse().slice(0,5)) {
    const ts=row[0], original=row[1];
    const snap=await fetchRecord(`https://web.archive.org/web/${ts}id_/${original}`,{headers:{Accept:'text/html'}});
    out.memoir.wedgewood[`wayback_${ts}`]=snap;
    const s=typeof snap.body==='string'?snap.body:'';
    for(const re of [/txtmyPropertyId[^>]{0,300}?value=["']?(\d{5,10})/gi,/propertyId[^0-9]{0,40}(\d{5,10})/gi,/nudge_(\d{5,10})/gi]){
      for(const m of s.matchAll(re)) candidateIds.push(m[1]);
    }
  }
}
out.memoir.wedgewood.candidateIds=[...new Set(candidateIds)];

// Direct RentCafe slot endpoint calls. May property ID is present in its live page source.
const mayId='2240943';
const mayHosts=['https://memoir-mayhosiery.securecafe.com','https://www.memoir-mayhosiery.com'];
for(const date of dates){
  out.memoir.may[date]={};
  for(const host of mayHosts){
    const url=`${host}/rcLoadContent.ashx?contentclass=ScheduleTour&method=DoTimeSlots&myPropertyId=${mayId}&txtApptDate=${encodeURIComponent(mmddyyyy[date])}`;
    out.memoir.may[date][host]=await fetchRecord(url,{headers:{Referer:host+'/scheduletour','X-Requested-With':'XMLHttpRequest'}});
  }
}

// Try Wedgewood on each host with IDs found in source/Wayback, plus host-inferred blank ID.
const wedgeHosts=['https://www.memoir-wedgewoodhouston.com','https://memoir-wedgewoodhouston.securecafe.com','https://memoir-mayhosiery.securecafe.com'];
const ids=['',...out.memoir.wedgewood.candidateIds].slice(0,20);
out.memoir.wedgewood.slotAttempts={};
for(const id of ids){
  out.memoir.wedgewood.slotAttempts[id||'blank']={};
  for(const date of dates){
    out.memoir.wedgewood.slotAttempts[id||'blank'][date]={};
    for(const host of wedgeHosts){
      const url=`${host}/rcLoadContent.ashx?contentclass=ScheduleTour&method=DoTimeSlots&myPropertyId=${encodeURIComponent(id)}&txtApptDate=${encodeURIComponent(mmddyyyy[date])}`;
      out.memoir.wedgewood.slotAttempts[id||'blank'][date][host]=await fetchRecord(url,{headers:{Referer:'https://www.memoir-wedgewoodhouston.com/scheduletour','X-Requested-With':'XMLHttpRequest'}});
    }
  }
}

// Browser-context fetches preserve the live RentCafe session/cookies and reveal slot HTML.
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-blink-features=AutomationControlled']});
const context=await browser.newContext({viewport:{width:1440,height:1200},locale:'en-US',timezoneId:'America/Chicago',userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'});
await context.addInitScript(() => { Object.defineProperty(navigator,'webdriver',{get:()=>undefined}); Object.defineProperty(navigator,'languages',{get:()=>['en-US','en']}); Object.defineProperty(navigator,'plugins',{get:()=>[1,2,3,4,5]}); });

async function browserRentCafe(label,url){
  const page=await context.newPage();
  const rec={startUrl:url,finalUrl:null,title:null,propertyId:null,bodyText:null,html:null,slots:{},errors:[]};
  try{
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForTimeout(label.includes('wedge')?45000:8000);
    rec.finalUrl=page.url(); rec.title=await page.title(); rec.bodyText=(await page.locator('body').innerText().catch(()=>'' )).slice(0,20000); rec.html=(await page.content()).slice(0,500000);
    rec.propertyId=await page.locator('#txtmyPropertyId').getAttribute('value').catch(()=>null);
    if(rec.propertyId){
      for(const date of dates){
        const q=`/rcLoadContent.ashx?contentclass=ScheduleTour&method=DoTimeSlots&myPropertyId=${encodeURIComponent(rec.propertyId)}&txtApptDate=${encodeURIComponent(mmddyyyy[date])}`;
        try{
          rec.slots[date]=await page.evaluate(async q=>{const r=await fetch(q,{credentials:'include',headers:{'X-Requested-With':'XMLHttpRequest'}});return {status:r.status,url:r.url,text:await r.text()};},q);
        }catch(e){rec.slots[date]={error:String(e)}}
      }
    }
    await page.screenshot({path:`tour-remaining-output/${label}.png`,fullPage:true}).catch(()=>{});
  }catch(e){rec.errors.push(String(e));}
  await page.close().catch(()=>{}); return rec;
}
out.memoir.may.browser=await browserRentCafe('memoir-may-browser',urls.maySchedule);
out.memoir.wedgewood.browserPublic=await browserRentCafe('memoir-wedgewood-public-browser',urls.wedgeSchedule);
out.memoir.wedgewood.browserSecure=await browserRentCafe('memoir-wedgewood-secure-browser',urls.wedgeSecure);
await browser.close();

await fs.writeFile('tour-remaining-output/results.json',JSON.stringify(out,null,2));
const compact={capturedAt:out.capturedAt,luna:Object.fromEntries(Object.entries(out.luna).map(([b,v])=>[b,Object.fromEntries(Object.entries(v).map(([p,x])=>[p,x.status??x.error]))])),knock445:Object.fromEntries(Object.entries(out.knock445).map(([t,x])=>[t,x.status??x.error])),mayBrowser:{finalUrl:out.memoir.may.browser.finalUrl,propertyId:out.memoir.may.browser.propertyId,slotStatuses:Object.fromEntries(Object.entries(out.memoir.may.browser.slots).map(([d,x])=>[d,x.status??x.error]))},wedgeCandidates:out.memoir.wedgewood.candidateIds,wedgeBrowserPublic:{finalUrl:out.memoir.wedgewood.browserPublic.finalUrl,propertyId:out.memoir.wedgewood.browserPublic.propertyId,title:out.memoir.wedgewood.browserPublic.title,body:out.memoir.wedgewood.browserPublic.bodyText?.slice(0,1000)},wedgeBrowserSecure:{finalUrl:out.memoir.wedgewood.browserSecure.finalUrl,propertyId:out.memoir.wedgewood.browserSecure.propertyId,title:out.memoir.wedgewood.browserSecure.title,body:out.memoir.wedgewood.browserSecure.bodyText?.slice(0,1000)}};
console.log(JSON.stringify(compact,null,2));
