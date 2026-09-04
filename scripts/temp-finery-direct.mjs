import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const out = path.resolve('finery-direct-output');
await fs.mkdir(out, { recursive: true });

const scheduleUrl = 'https://my.hy.ly/tours/schedules/4091/19190/597663/98238879e9c05c967a675478abe81f16329c0a1e?pagename=Tour_Scheduler_Landing_Page&dd=0&popup=1';
const dates = [4,5,6,7,8,9,10].map(day => ({ day, iso: `2026-09-${String(day).padStart(2,'0')}` }));
const timeRe = /\b(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)\b/gi;
const norm = s => String(s || '').replace(/\s+/g, ' ').trim();
const timesIn = s => [...new Set([...String(s || '').matchAll(timeRe)].map(m => m[0].toUpperCase().replace(/\./g, '').replace(/\s+/g, ' ')))];
const clip = (s, n=500000) => typeof s === 'string' && s.length > n ? `${s.slice(0,n)}\n...[clipped]` : s;

const browser = await chromium.launch({headless:true,args:['--disable-blink-features=AutomationControlled','--disable-dev-shm-usage','--no-sandbox']});
const context = await browser.newContext({timezoneId:'America/Chicago',locale:'en-US',viewport:{width:1440,height:1000},ignoreHTTPSErrors:true});
await context.addInitScript(() => { try { delete Object.getPrototypeOf(navigator).webdriver; } catch {} });
const page = await context.newPage();
const result = {name:'Residences at The Finery',provider:'Hyly.AI',url:scheduleUrl,tourTypes:['In-person Tour'],calendar:{},network:[]};
page.on('request', req => {
  if (['xhr','fetch'].includes(req.resourceType())) result.network.push({phase:'request',method:req.method(),url:req.url(),postData:clip(req.postData()||'',50000)});
});
page.on('response', async resp => {
  const req = resp.request();
  if (!['xhr','fetch'].includes(req.resourceType())) return;
  if (!/tour|sched|avail|slot|calendar|hy\.ly/i.test(resp.url())) return;
  const entry = {phase:'response',status:resp.status(),method:req.method(),url:resp.url()};
  try { entry.body = clip(await resp.text(),700000); } catch (e) { entry.error=String(e); }
  result.network.push(entry);
});

try {
  await page.goto(scheduleUrl,{waitUntil:'domcontentloaded',timeout:75000});
  await page.waitForTimeout(5000);
} catch (e) { result.navigationError=String(e); }

result.initialUrl = page.url();
result.initialTitle = await page.title().catch(()=> '');
result.initialBody = clip(await page.locator('body').innerText().catch(()=> ''),100000);
result.initialHtml = clip(await page.locator('html').innerHTML().catch(()=> ''),400000);

for (const d of dates) {
  const row = {available:false,times:[]};
  try {
    const cells = page.locator('td.day');
    const n = await cells.count();
    row.cells = [];
    let target = null;
    for (let i=0;i<n;i++) {
      const el = cells.nth(i);
      const m = await el.evaluate(n => ({text:(n.textContent||'').trim(),cls:n.className,title:n.getAttribute('title')||'',dataDate:n.getAttribute('data-date')||'',aria:n.getAttribute('aria-label')||''}));
      row.cells.push(m);
      if (!target && m.text === String(d.day) && !/old|new|disabled|off/i.test(m.cls)) target = {el,...m};
    }
    if (!target) {
      row.reason = 'date unavailable or disabled';
      result.calendar[d.iso]=row;
      continue;
    }
    row.dateControl={text:target.text,cls:target.cls,title:target.title,dataDate:target.dataDate,aria:target.aria};
    await target.el.click({timeout:5000});
    await page.waitForTimeout(1000);
    const body = await page.locator('body').innerText().catch(()=> '');
    const labels=[];
    const candidates = page.locator('a,button,label,input,[role="button"],[role="radio"]');
    const cn = Math.min(await candidates.count(),500);
    for(let i=0;i<cn;i++){
      const el=candidates.nth(i);
      if(!(await el.isVisible({timeout:100}).catch(()=>false))) continue;
      const text=norm(await el.innerText().catch(()=>''));
      const aria=norm(await el.getAttribute('aria-label').catch(()=>''));
      const value=norm(await el.getAttribute('value').catch(()=>''));
      const label=norm(`${text} ${aria} ${value}`);
      if(timesIn(label).length && label.length < 100) labels.push(label);
    }
    row.rawLabels=[...new Set(labels)];
    row.times=[...new Set(row.rawLabels.flatMap(timesIn))];
    if(!row.times.length){
      const timeSection = body.match(/Select A Time([\s\S]*?)(?:Contact Info|First Name|Email|Schedule)/i)?.[1] || '';
      row.times=timesIn(timeSection);
    }
    row.available=row.times.length>0;
    if(!row.available) row.reason='no time controls displayed';
  } catch(e){ row.error=String(e); }
  result.calendar[d.iso]=row;
}

result.finalBody=clip(await page.locator('body').innerText().catch(()=>''),100000);
try{await page.screenshot({path:path.join(out,'residences-at-the-finery.png'),fullPage:true,timeout:30000})}catch{}
await fs.writeFile(path.join(out,'residences-at-the-finery.json'),JSON.stringify(result,null,2));
await fs.writeFile(path.join(out,'results.json'),JSON.stringify([result],null,2));
console.log(JSON.stringify({name:result.name,navigationError:result.navigationError||null,calendar:Object.fromEntries(Object.entries(result.calendar).map(([k,v])=>[k,v.times]))},null,2));
await context.close();
await browser.close();
