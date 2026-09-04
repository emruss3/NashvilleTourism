import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve('targeted-audit-output');
await fs.mkdir(OUT, { recursive: true });
const dates = [
  ['2026-09-04', 4, 'Friday'], ['2026-09-05', 5, 'Saturday'], ['2026-09-06', 6, 'Sunday'],
  ['2026-09-07', 7, 'Monday'], ['2026-09-08', 8, 'Tuesday'], ['2026-09-09', 9, 'Wednesday'], ['2026-09-10', 10, 'Thursday'],
].map(([iso, day, weekday]) => ({ iso, day, weekday }));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const clip = (s, n = 500000) => typeof s === 'string' && s.length > n ? `${s.slice(0,n)}\n...[clipped ${s.length-n}]` : s;
const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
const timeRe = /\b(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)\b/gi;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function write(name, obj) {
  await fs.writeFile(path.join(OUT, `${slug(name)}.json`), JSON.stringify(obj, null, 2));
}

async function createContext(browser) {
  const context = await browser.newContext({
    timezoneId: 'America/Chicago', locale: 'en-US', viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  });
  await context.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => undefined }));
  return context;
}

function watch(context, result) {
  result.network = [];
  result.console = [];
  result.pageErrors = [];
  context.on('page', (p) => {
    p.on('console', (m) => result.console.push({ type: m.type(), text: clip(m.text(), 5000), page: p.url() }));
    p.on('pageerror', (e) => result.pageErrors.push({ text: String(e), page: p.url() }));
    p.on('request', (r) => {
      if (['xhr','fetch','document'].includes(r.resourceType())) result.network.push({ phase:'request', method:r.method(), type:r.resourceType(), url:r.url(), postData:clip(r.postData() || '', 50000) });
    });
    p.on('response', async (r) => {
      const req = r.request();
      const u = r.url();
      const relevant = /nestio|nestiolistings|tour|sched|appoint|avail|calendar|hy\.ly|hyly|rentcafe|yardi|knock|doorway|jonah|standardassembly|finery|memoir|delux|luna/i.test(u);
      if (!relevant || !['xhr','fetch','document','script'].includes(req.resourceType())) return;
      const entry = { phase:'response', method:req.method(), type:req.resourceType(), status:r.status(), url:u };
      try {
        const headers = await r.allHeaders(); entry.contentType = headers['content-type'] || '';
        if (/json|text|javascript|html/i.test(entry.contentType) || ['xhr','fetch'].includes(req.resourceType())) entry.body = clip(await r.text(), 600000);
      } catch (e) { entry.error = String(e); }
      result.network.push(entry);
    });
  });
}

async function getBody(frame) { try { return await frame.locator('body').innerText({timeout:3000}); } catch { return ''; } }
async function visibleMeta(frame, selector='button,a,input,[role="button"],[role="option"],[role="radio"],[aria-label],select,option') {
  const out=[]; const loc=frame.locator(selector); let n=0; try{n=Math.min(await loc.count(),700)}catch{}
  for(let i=0;i<n;i++){
    const el=loc.nth(i); let vis=false; try{vis=await el.isVisible({timeout:100})}catch{} if(!vis) continue;
    try { out.push(await el.evaluate(n=>({tag:n.tagName,text:(n.innerText||n.textContent||'').trim(),aria:n.getAttribute('aria-label')||'',role:n.getAttribute('role')||'',id:n.id||'',name:n.getAttribute('name')||'',type:n.getAttribute('type')||'',value:n.value||n.getAttribute('value')||'',disabled:!!n.disabled||n.getAttribute('aria-disabled')==='true'||n.classList.contains('disabled'),className:typeof n.className==='string'?n.className.slice(0,500):''}))); } catch {}
  }
  return out;
}
function timesFromMeta(meta) {
  const all=[];
  for(const m of meta){ const s=norm(`${m.text} ${m.aria} ${m.value}`); for(const match of s.matchAll(timeRe)) all.push(match[0].toUpperCase().replace(/\./g,'').replace(/\s+/g,' ')); }
  return [...new Set(all)];
}

async function goto(page,url,wait=7000){
  let error=null; try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:75000});await page.waitForTimeout(wait)}catch(e){error=String(e)} return error;
}

async function findFunnelFrame(page){
  for(let i=0;i<50;i++){ const f=page.frames().find(f=>f.url().includes('integrations.nestio.com/contact-widget')); if(f) return f; await page.waitForTimeout(250); }
  return null;
}

async function selectFunnelType(frame,label){
  const btn=frame.locator('[role="button"][aria-labelledby="aria-label-select-menu-0"]');
  await btn.click({timeout:5000}); await frame.page().waitForTimeout(250);
  let opt=frame.locator('[role="option"]').filter({hasText:label}).first();
  if(!(await opt.count())) opt=frame.getByText(label,{exact:true}).first();
  await opt.click({timeout:5000}); await frame.page().waitForTimeout(500);
}

async function selectFunnelDate(frame,d){
  const input=frame.locator('input[placeholder="Select date"]');
  await input.click({timeout:5000}); await frame.page().waitForTimeout(250);
  let day=frame.locator('.react-datepicker__day').filter({hasText:new RegExp(`^${d.day}$`)}).first();
  const all=frame.locator('.react-datepicker__day');
  const count=await all.count().catch(()=>0);
  for(let i=0;i<count;i++){
    const el=all.nth(i); const aria=(await el.getAttribute('aria-label').catch(()=>''))||'';
    if(new RegExp(`September\\s+${d.day}(?:st|nd|rd|th)?,?\\s+2026`,'i').test(aria)){day=el;break;}
  }
  if(!(await day.count())) return {found:false,disabled:true,calendarText:clip(await getBody(frame),10000)};
  const cls=(await day.getAttribute('class').catch(()=>''))||'';
  const ariaDisabled=(await day.getAttribute('aria-disabled').catch(()=>''))||'';
  const disabled=/disabled|outside-month/i.test(cls)||ariaDisabled==='true';
  const aria=(await day.getAttribute('aria-label').catch(()=>''))||'';
  if(disabled){ await frame.page().keyboard.press('Escape').catch(()=>{}); return {found:true,disabled:true,aria,cls}; }
  await day.click({timeout:5000}); await frame.page().waitForTimeout(700);
  return {found:true,disabled:false,aria,cls,inputValue:await input.inputValue().catch(()=>null)};
}

async function funnelAudit(browser,name,url){
  const result={name,provider:'Funnel/Nestio',url,tourTypes:[],calendars:{}};
  const context=await createContext(browser); watch(context,result); const page=await context.newPage(); result.navigationError=await goto(page,url);
  let frame=await findFunnelFrame(page);
  if(!frame){result.error='Funnel frame not found';await write(name,result);await context.close();return result;}
  result.frameUrl=frame.url(); result.initialBody=clip(await getBody(frame),20000);
  try{
    const typeBtn=frame.locator('[role="button"][aria-labelledby="aria-label-select-menu-0"]');
    await typeBtn.click({timeout:5000}); await page.waitForTimeout(300);
    result.typeMenu=await visibleMeta(frame,'[role="option"], [role="listbox"], [class*="SelectOption"]');
    result.tourTypes=[...new Set(result.typeMenu.filter(x=>x.role==='option'||/option/i.test(x.className)).map(x=>norm(x.text)).filter(Boolean))];
    await page.keyboard.press('Escape').catch(()=>{});
  }catch(e){result.typeMenuError=String(e)}
  if(!result.tourTypes.length){
    const body=await getBody(frame); result.tourTypes=['Agent Guided Tour','Self-guided Tour'].filter(x=>body.includes(x));
  }
  for(const type of result.tourTypes){
    result.calendars[type]={};
    try{await selectFunnelType(frame,type)}catch(e){result.calendars[type].error=String(e);continue;}
    for(const d of dates){
      try{
        const dateState=await selectFunnelDate(frame,d);
        if(dateState.disabled){result.calendars[type][d.iso]={available:false,dateState,times:[]};continue;}
        const timeBtn=frame.locator('[role="button"][aria-labelledby="aria-label-select-menu-2"]');
        const timeDisabled=(await timeBtn.getAttribute('aria-disabled').catch(()=>''))==='true';
        if(timeDisabled){result.calendars[type][d.iso]={available:false,dateState,times:[],reason:'time control disabled'};continue;}
        await timeBtn.click({timeout:5000}); await page.waitForTimeout(300);
        const opts=await visibleMeta(frame,'[role="option"], [role="listbox"], [class*="SelectOption"]');
        const labels=[...new Set(opts.filter(x=>x.role==='option'||/option/i.test(x.className)).map(x=>norm(x.text)).filter(Boolean))];
        const times=timesFromMeta(opts).filter(t=>!/office|date/i.test(t));
        result.calendars[type][d.iso]={available:times.length>0,dateState,times,optionLabels:labels};
        await page.keyboard.press('Escape').catch(()=>{});
      }catch(e){result.calendars[type][d.iso]={available:false,times:[],error:String(e)};}
    }
  }
  result.finalBody=clip(await getBody(frame),30000); result.finalMeta=await visibleMeta(frame);
  try{await page.screenshot({path:path.join(OUT,`${slug(name)}.png`),fullPage:true,timeout:30000})}catch{}
  await write(name,result); await context.close(); return result;
}

async function rentCafeMayAudit(browser){
  const name='Memoir May Hosiery'; const result={name,provider:'RentCafe/Yardi',url:'https://www.memoir-mayhosiery.com/scheduletour',calendar:{},tourTypes:['Guided Tour']};
  const context=await createContext(browser);watch(context,result);const page=await context.newPage();result.navigationError=await goto(page,result.url,6000);
  result.initialBody=clip(await getBody(page.mainFrame()),30000);
  for(let i=1;i<=7;i++){
    const d=dates[i-1];
    try{
      const input=page.locator(`#radiodate${i}`); const disabled=await input.isDisabled().catch(()=>false);
      if(disabled){result.calendar[d.iso]={available:false,times:[],reason:'date disabled'};continue;}
      const label=page.locator(`label[for="radiodate${i}"]`);
      if(await label.count()) await label.click({timeout:5000}); else await input.evaluate(el=>el.click());
      await page.waitForTimeout(1100);
      const slotHtml=await page.locator('#availableslots').innerHTML().catch(()=> '');
      const slotText=await page.locator('#availableslots').innerText().catch(()=> '');
      const meta=await visibleMeta(page.mainFrame(),'#availableslots button,#availableslots input,#availableslots label,#availableslots [role="button"],#availableslots [role="radio"],#availableslots a,#availableslots option');
      const times=[...new Set([...timesFromMeta(meta),...[...slotText.matchAll(timeRe)].map(m=>m[0].toUpperCase().replace(/\./g,'').replace(/\s+/g,' '))])];
      result.calendar[d.iso]={available:times.length>0,times,slotText:norm(slotText),slotHtml:clip(slotHtml,50000),meta};
    }catch(e){result.calendar[d.iso]={available:false,times:[],error:String(e)};}
  }
  result.finalBody=clip(await getBody(page.mainFrame()),30000);result.finalMeta=await visibleMeta(page.mainFrame());
  try{await page.screenshot({path:path.join(OUT,'memoir-may-hosiery.png'),fullPage:true,timeout:30000})}catch{}
  await write(name,result);await context.close();return result;
}

async function genericSchedulerAudit(browser,name,url){
  const result={name,url};const context=await createContext(browser);watch(context,result);const page=await context.newPage();result.navigationError=await goto(page,url,9000);
  result.pages=[];
  for(const p of context.pages()){
    const pg={url:p.url(),title:await p.title().catch(()=>''),frames:[]};
    for(const frame of p.frames())pg.frames.push({url:frame.url(),body:clip(await getBody(frame),50000),meta:await visibleMeta(frame)});
    result.pages.push(pg);
  }
  // Click a likely tour-type choice, but never a final submit.
  for(const p of context.pages()){
    for(const frame of p.frames()){
      const candidates=frame.locator('button,[role="button"],a'); const n=Math.min(await candidates.count().catch(()=>0),300);
      for(let i=0;i<n;i++){
        const el=candidates.nth(i);if(!(await el.isVisible().catch(()=>false)))continue;const text=norm(await el.innerText().catch(()=>''));
        if(/^(agent.?guided|guided tour|in.?person tour|self.?guided tour|live video tour|video tour|continue|get started)$/i.test(text)){
          try{await el.click({timeout:3000});await p.waitForTimeout(1000);result.clicked={text,frame:frame.url()};break}catch{}
        }
      }
      if(result.clicked)break;
    }
    if(result.clicked)break;
  }
  result.afterClick=[];
  for(const p of context.pages())for(const frame of p.frames())result.afterClick.push({url:frame.url(),body:clip(await getBody(frame),50000),meta:await visibleMeta(frame)});
  try{await page.screenshot({path:path.join(OUT,`${slug(name)}.png`),fullPage:true,timeout:30000})}catch{}
  await write(name,result);await context.close();return result;
}

async function jonahAudit(browser,name,url){
  const result={name,provider:'Jonah tour scheduler',url};const context=await createContext(browser);watch(context,result);const page=await context.newPage();result.navigationError=await goto(page,url,15000);
  result.body=clip(await getBody(page.mainFrame()),40000);
  result.scheduler=await page.locator('#tourScheduler').evaluate(n=>({outerHTML:n.outerHTML.slice(0,120000),attributes:Object.fromEntries([...n.attributes].map(a=>[a.name,a.value])),className:n.className,innerText:n.innerText})).catch(e=>({error:String(e)}));
  try{
    const scriptUrl=new URL('/tour-scheduler/js/dist/tour-scheduler.min.js',page.url()).href;
    const r=await page.request.get(scriptUrl,{timeout:30000}); result.schedulerScript={url:scriptUrl,status:r.status(),body:clip(await r.text(),900000)};
  }catch(e){result.schedulerScript={error:String(e)}}
  result.meta=await visibleMeta(page.mainFrame());
  try{await page.screenshot({path:path.join(OUT,`${slug(name)}.png`),fullPage:true,timeout:30000})}catch{}
  await write(name,result);await context.close();return result;
}

async function knock445Audit(browser){
  const name='445 Park Commons detail';const result={name,url:'https://445parkcommons.com/schedule-a-tour/'};const context=await createContext(browser);watch(context,result);const page=await context.newPage();result.navigationError=await goto(page,result.url,7000);
  // Open the inline Knock scheduler.
  try{await page.getByRole('button',{name:/schedule a tour/i}).last().click({timeout:5000});await page.waitForTimeout(1600)}catch{}
  const frame=page.frames().find(f=>/Schedule with 445 Park Commons/i.test(f.url()+ ' ')||false) || page.frames().find(async f=>/Schedule with 445/.test(await getBody(f)));
  let kframe=null;for(const f of page.frames()){if(/Schedule with 445/.test(await getBody(f))){kframe=f;break;}}
  if(!kframe){result.error='Knock frame not found';await write(name,result);await context.close();return result;}
  result.initialBody=await getBody(kframe);result.initialMeta=await visibleMeta(kframe);
  result.tourTypeInputs=await kframe.locator('input[type=radio]').evaluateAll(ns=>ns.map(n=>({id:n.id,value:n.value,disabled:n.disabled,checked:n.checked,label:n.labels?.[0]?.innerText||''}))).catch(()=>[]);
  // Select in person and advance.
  try{await kframe.locator('#inPersonTour').check({force:true});await page.waitForTimeout(300);const b=kframe.locator('button.doorway-button').last();result.continue1=norm(await b.innerText());await b.click({timeout:5000});await page.waitForTimeout(1000)}catch(e){result.advanceError=String(e)}
  result.afterTypeBody=clip(await getBody(kframe),30000);result.afterTypeMeta=await visibleMeta(kframe);
  // Attempt first available date/time, stopping before any final submission.
  try{
    const dateEl=kframe.locator('[aria-label*="September 7"], [data-date="2026-09-07"], button:has-text("7")').filter({visible:true}).first();
    if(await dateEl.count()){await dateEl.click({timeout:4000});await page.waitForTimeout(700);result.afterDateBody=clip(await getBody(kframe),30000);}
    const timeCandidates=kframe.locator('button,[role="button"],[role="radio"],label');const n=Math.min(await timeCandidates.count(),300);
    for(let i=0;i<n;i++){const el=timeCandidates.nth(i);if(!(await el.isVisible().catch(()=>false)))continue;const t=norm(await el.innerText().catch(()=>''));if(/^9:30\s*(AM|A\.M\.)$/i.test(t)){await el.click({timeout:3000});await page.waitForTimeout(500);result.selectedTime=t;break;}}
    const buttons=await visibleMeta(kframe,'button,a,input[type=submit]');result.preContactButtons=buttons;
    const next=buttons.find(x=>!x.disabled&&/continue|next|schedule/i.test(norm(x.text||x.value))&&!/self guided/i.test(norm(x.text||x.value)));
    if(next){const el=kframe.locator('button,a,input[type=submit]').filter({hasText:norm(next.text)}).first();if(await el.count()){await el.click({timeout:3000});await page.waitForTimeout(800)}}
  }catch(e){result.selectionError=String(e)}
  result.finalBody=clip(await getBody(kframe),50000);result.finalMeta=await visibleMeta(kframe);
  try{await page.screenshot({path:path.join(OUT,'445-park-commons-detail.png'),fullPage:true,timeout:30000})}catch{}
  await write(name,result);await context.close();return result;
}

const browser=await chromium.launch({headless:true,args:['--disable-blink-features=AutomationControlled','--disable-dev-shm-usage','--no-sandbox']});
const results=[];
for(const [name,url] of [
  ['Emblem Park','https://emblemparknashville.com/schedule-a-tour/'],
  ['Westerly House','https://livewesterlyhouse.com/schedule-a-tour/'],
  ['Queens Wedgewood Houston','https://queensweho.com/schedule-a-tour/'],
]){try{results.push(await funnelAudit(browser,name,url))}catch(e){results.push({name,fatal:String(e)})}}
try{results.push(await rentCafeMayAudit(browser))}catch(e){results.push({name:'Memoir May Hosiery',fatal:String(e)})}
try{results.push(await genericSchedulerAudit(browser,'Residences at The Finery','https://my.hy.ly/tours/livethefinery/site?dd=0&popup=1'))}catch(e){results.push({name:'Residences at The Finery',fatal:String(e)})}
try{results.push(await genericSchedulerAudit(browser,'Standard Assembly','https://thestandardassembly.com/schedule-a-tour/'))}catch(e){results.push({name:'Standard Assembly',fatal:String(e)})}
try{results.push(await jonahAudit(browser,'Delux WeHo','https://deluxweho.com/schedule-a-tour/'))}catch(e){results.push({name:'Delux WeHo',fatal:String(e)})}
try{results.push(await jonahAudit(browser,'Luna','https://lunanashvilleliving.com/schedule-a-tour/'))}catch(e){results.push({name:'Luna',fatal:String(e)})}
try{results.push(await knock445Audit(browser))}catch(e){results.push({name:'445 Park Commons detail',fatal:String(e)})}
await browser.close();
await fs.writeFile(path.join(OUT,'results.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify(results.map(r=>({name:r.name,error:r.error||r.fatal||r.navigationError||null})),null,2));
