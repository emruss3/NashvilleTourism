import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const output = 'tour-audit-finery-output';
await fs.mkdir(output, { recursive: true });
const url = 'https://my.hy.ly/tours/livethefinery/site?dd=0&popup=1';
const days = [4,5,6,7,8,9,10];
const clean = (v,n=200000)=>String(v??'').replace(/\u0000/g,'').slice(0,n);
const browser = await chromium.launch({headless:true,args:['--no-sandbox','--disable-blink-features=AutomationControlled']});
const context = await browser.newContext({timezoneId:'America/Chicago',locale:'en-US',viewport:{width:1440,height:1100}});
const page = await context.newPage();
const result = {generatedAt:new Date().toISOString(),url,dates:[],network:[],responses:[]};
page.on('request',req=>{if(/time_select|disabled_dates|schedules/i.test(req.url()))result.network.push({method:req.method(),url:req.url(),postData:clean(req.postData(),10000)});});
page.on('response',async res=>{if(/time_select|disabled_dates|schedules/i.test(res.url())){let body='';try{body=clean(await res.text());}catch(e){body=String(e)}result.responses.push({status:res.status(),url:res.url(),contentType:res.headers()['content-type']||'',body});}});
try {
  const response = await page.goto(url,{waitUntil:'domcontentloaded',timeout:70000});
  result.status=response?.status()??null;
  await page.waitForTimeout(8000);
  const inPerson = page.getByText('IN-PERSON TOUR',{exact:false}).first();
  if(await inPerson.isVisible().catch(()=>false)){await inPerson.click();await page.waitForTimeout(6000);}
  result.initialText=clean(await page.locator('body').innerText(),50000);
  for(const day of days){
    const rec={date:`2026-09-${String(day).padStart(2,'0')}`};
    result.dates.push(rec);
    try{
      const cell=page.locator('.datepicker-days td.day').filter({hasText:new RegExp(`^${day}$`)}).filter({hasNot:page.locator('.new,.old')}).first();
      rec.className=await cell.getAttribute('class');
      rec.disabled=/disabled/.test(rec.className||'');
      if(!rec.disabled){
        const before=result.responses.length;
        await cell.click({timeout:5000});
        await page.waitForTimeout(1600);
        rec.responses=result.responses.slice(before);
        rec.timeText=clean(await page.locator('.time-select').innerText().catch(()=>''),20000);
        rec.times=await page.locator('.time-select a').allInnerTexts().catch(()=>[]);
        if(!rec.times.length){
          rec.times=await page.locator('.time-select li').allInnerTexts().catch(()=>[]);
        }
        rec.times=rec.times.map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
      }
    }catch(error){rec.error=String(error);}
  }
  result.finalText=clean(await page.locator('body').innerText(),50000);
}catch(error){result.error=String(error)}
await context.close();
await browser.close();
await fs.writeFile(`${output}/finery.json`,JSON.stringify(result,null,2));
console.log('FINERY_COMPLETE');
