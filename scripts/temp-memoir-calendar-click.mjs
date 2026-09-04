import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('memoir-calendar-click-output');
await fs.mkdir(OUT, { recursive: true });

const dates = [
  ['2026-09-11', 'September 11, 2026'],
  ['2026-09-12', 'September 12, 2026'],
  ['2026-09-13', 'September 13, 2026'],
  ['2026-09-14', 'September 14, 2026'],
  ['2026-09-15', 'September 15, 2026'],
  ['2026-09-16', 'September 16, 2026'],
  ['2026-09-17', 'September 17, 2026'],
  ['2026-09-18', 'September 18, 2026'],
];

const targets = [
  { key: 'memoir-may-hosiery', name: 'Memoir May Hosiery', url: 'https://www.memoir-mayhosiery.com/scheduletour' },
  { key: 'memoir-wedgewood-houston', name: 'Memoir Wedgewood Houston', warmup: 'https://www.memoirresidential.com/properties/wedgewoodhouston', url: 'https://www.memoir-wedgewoodhouston.com/scheduletour' },
];

const timeRe = /\b(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)\b/gi;
const uniq = (xs) => [...new Set(xs)];
const extractTimes = (s) => uniq([...String(s || '').matchAll(timeRe)].map(m => m[0].toUpperCase().replace(/\./g, '').replace(/\s+/g, ' ')));

async function load(page, target) {
  const attempts=[];
  if (target.warmup) {
    try { const r=await page.goto(target.warmup,{waitUntil:'domcontentloaded',timeout:75000}); await page.waitForTimeout(4000); attempts.push({url:target.warmup,status:r?.status(),title:await page.title()}); } catch(e){ attempts.push({url:target.warmup,error:String(e)}); }
  }
  for (let i=0;i<5;i++) {
    try {
      const u=i?`${target.url}?audit=${Date.now()}-${i}`:target.url;
      const r=await page.goto(u,{waitUntil:'domcontentloaded',timeout:75000});
      await page.waitForTimeout(7500+i*1000);
      const has=await page.locator('#scheduledate').count();
      attempts.push({url:u,status:r?.status(),finalUrl:page.url(),title:await page.title(),hasCalendarButton:has});
      if(has)return{ok:true,attempts};
    } catch(e){ attempts.push({error:String(e),finalUrl:page.url(),title:await page.title().catch(()=> '')}); }
    await page.waitForTimeout(1200);
  }
  return{ok:false,attempts};
}

async function acceptCookies(page){
  for(const re of [/Accept All Cookies/i,/^Accept$/i,/Accept All/i]){
    try{const b=page.getByRole('button',{name:re}).first();if(await b.isVisible({timeout:500})){await b.click({timeout:3000});break}}catch{}
  }
  await page.waitForTimeout(400);
}

async function audit(browser,target){
  const context=await browser.newContext({timezoneId:'America/Chicago',locale:'en-US',viewport:{width:1440,height:1000},ignoreHTTPSErrors:true,userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'});
  await context.addInitScript(()=>{try{delete Object.getPrototypeOf(navigator).webdriver}catch{}});
  const page=await context.newPage();
  const result={name:target.name,url:target.url,auditedAt:new Date().toISOString(),provider:'RentCafe/Yardi',tourTypes:['Guided Tour'],days:{},responses:[],calendarSnapshots:[]};
  page.on('response',async response=>{
    if(!response.url().includes('handler=GetAvailableSlots'))return;
    let body='';try{body=await response.text()}catch{}
    result.responses.push({status:response.status(),url:response.url(),postData:response.request().postData()||'',body:body.slice(0,180000)});
  });
  result.load=await load(page,target);
  if(!result.load.ok){result.error='Calendar page did not load';await fs.writeFile(path.join(OUT,`${target.key}.json`),JSON.stringify(result,null,2));await context.close();return result;}
  await acceptCookies(page);
  const initial=await page.locator('body').innerText().catch(()=> '');
  result.initialText=initial.slice(0,60000);
  result.bookingDisclaimer=initial.match(/Scheduled tours[^\n]*/i)?.[0]||null;

  for(const [iso,label] of dates){
    const row={label,available:false,times:[]};
    const before=result.responses.length;
    try{
      await page.locator('#scheduledate').click({force:true,timeout:6000});
      await page.waitForTimeout(600);
      const visibleCalendars=page.locator('.flatpickr-calendar').filter({visible:true});
      row.calendarCount=await visibleCalendars.count().catch(()=>0);
      const allDays=page.locator('.flatpickr-day');
      const n=await allDays.count();
      const candidates=[];let targetDay=null;
      for(let i=0;i<n;i++){
        const el=allDays.nth(i);
        const meta=await el.evaluate(n=>({text:(n.textContent||'').trim(),aria:n.getAttribute('aria-label')||'',cls:n.className,title:n.getAttribute('title')||''}));
        if(meta.aria) candidates.push(meta);
        if(meta.aria===label) targetDay={el,...meta};
      }
      row.calendarDays=candidates.slice(0,100);
      if(!targetDay){row.reason='Target date not present in calendar';await page.keyboard.press('Escape').catch(()=>{});result.days[iso]=row;continue;}
      row.dateMeta={aria:targetDay.aria,cls:targetDay.cls,text:targetDay.text};
      if(/disabled|notAllowed/i.test(targetDay.cls)){row.reason='Target date disabled';await page.keyboard.press('Escape').catch(()=>{});result.days[iso]=row;continue;}
      await targetDay.el.click({force:true,timeout:5000});
      await page.waitForTimeout(2800);
      const newResponses=result.responses.slice(before);
      row.network=newResponses.map(r=>({status:r.status,postData:r.postData,times:extractTimes(r.body),bodyPreview:r.body.slice(0,900)}));
      const text=await page.locator('#availableslots').innerText().catch(()=> '');
      const html=await page.locator('#availableslots').innerHTML().catch(()=> '');
      row.slotText=text.replace(/\s+/g,' ').trim();
      row.times=extractTimes(`${text}\n${html}\n${newResponses.map(r=>r.body).join('\n')}`);
      row.available=row.times.length>0;
      if(!row.available)row.reason='No slots returned by normal calendar click';
      result.calendarSnapshots.push({iso,range:(await page.locator('body').innerText().catch(()=> '')).match(/September \d{2}, 2026 - September \d{2}, 2026/)?.[0]||null});
    }catch(e){row.error=String(e);await page.keyboard.press('Escape').catch(()=>{});}
    result.days[iso]=row;
  }
  try{await page.screenshot({path:path.join(OUT,`${target.key}.png`),fullPage:true,timeout:30000})}catch{}
  await fs.writeFile(path.join(OUT,`${target.key}.json`),JSON.stringify(result,null,2));
  await context.close();return result;
}

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-blink-features=AutomationControlled']});
const results=[];
for(const target of targets){try{results.push(await audit(browser,target))}catch(e){results.push({name:target.name,fatal:String(e)})}}
await browser.close();
await fs.writeFile(path.join(OUT,'results.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify(results.map(r=>({name:r.name,error:r.error||r.fatal||null,days:r.days&&Object.fromEntries(Object.entries(r.days).map(([d,v])=>[d,{n:v.times?.length||0,reason:v.reason,error:v.error}]))})),null,2));
