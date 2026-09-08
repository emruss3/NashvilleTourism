import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const OUT=process.env.AUDIT_OUT||'tour-audit-artifacts';
const DATES=['2026-09-08','2026-09-09','2026-09-10','2026-09-11','2026-09-12','2026-09-13','2026-09-14'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clean=v=>String(v??'').replace(/\u0000/g,'').replace(/\s+/g,' ').trim();
const uniq=a=>[...new Set(a.filter(Boolean))];
async function mkdirp(p){await fs.mkdir(p,{recursive:true});}
async function writeJson(p,v){await mkdirp(path.dirname(p));await fs.writeFile(p,JSON.stringify(v,null,2));}

const xvfb=spawn('Xvfb',[':99','-screen','0','1920x1080x24','-nolisten','tcp'],{stdio:'ignore'});
process.env.DISPLAY=':99';
await sleep(1200);
const browser=await chromium.launch({headless:false,args:['--disable-blink-features=AutomationControlled','--no-sandbox','--disable-dev-shm-usage']});

async function newContext(){
  const c=await browser.newContext({locale:'en-US',timezoneId:'America/Chicago',viewport:{width:1440,height:1000},userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'});
  c.setDefaultTimeout(9000); c.setDefaultNavigationTimeout(65000); return c;
}
async function goto(page,url){try{await page.goto(url,{waitUntil:'domcontentloaded'});}catch{} await sleep(9000);}
async function frameText(frame){return clean(await frame.locator('body').innerText({timeout:5000}).catch(()=>''));}
async function snapshot(page,label){
  const frames=[];for(const f of page.frames())frames.push({url:f.url(),text:(await frameText(f)).slice(0,150000),controls:await f.locator('a,button,[role="button"],[role="option"],[role="gridcell"],input,select,option,label').evaluateAll(els=>els.slice(0,3000).map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);const attrs={};for(const k of ['aria-label','aria-selected','aria-disabled','title','href','value','placeholder','name','id','type','role','class','for','data-date','datetime']){const v=el.getAttribute(k);if(v)attrs[k]=v;}return{tag:el.tagName.toLowerCase(),text:(el.innerText||el.textContent||el.getAttribute('aria-label')||el.getAttribute('value')||'').replace(/\s+/g,' ').trim().slice(0,600),attrs,visible:r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden',disabled:Boolean(el.disabled)||el.getAttribute('aria-disabled')==='true'};}).filter(x=>x.visible)).catch(()=>[]));
  return{label,at:new Date().toISOString(),url:page.url(),frames};
}
async function dismiss(page){
  for(const re of [/accept all/i,/^accept$/i,/^dismiss$/i,/^close$/i,/i understand/i]){
    for(const f of page.frames()){const l=f.getByText(re,{exact:true});if(await l.count().catch(()=>0)){await l.first().click({force:true,timeout:1500}).catch(()=>{});}}
  }
  for(const f of page.frames())for(const sel of ['button[aria-label="Close"]','.pum-close','.popmake-close','.modal-close']){const l=f.locator(sel);if(await l.count().catch(()=>0)&&await l.first().isVisible().catch(()=>false))await l.first().click({force:true}).catch(()=>{});}
  await sleep(800);
}
function extractTimes(v){return uniq((clean(v).match(/\b(?:0?[1-9]|1[0-2])(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)\b/ig)||[]).map(x=>x.toUpperCase().replace(/\./g,'').replace(/\s+/g,' ')));}

const nestioTargets=[
  {id:'emblem',name:'Emblem Park',url:'https://emblemparknashville.com/schedule-a-tour/'},
  {id:'westerly',name:'Westerly House',url:'https://livewesterlyhouse.com/schedule-a-tour/'},
  {id:'standard',name:'Standard Assembly',url:'https://thestandardassembly.com/schedule-a-tour/'},
  {id:'queens',name:'Queens Wedgewood Houston',url:'https://queensweho.com/schedule-a-tour/'}
];

async function optionTexts(frame){
  const vals=[];
  for(const sel of ['[role="option"]','[class*="Option"]','[class*="option"]','li']){
    const l=frame.locator(sel);const n=Math.min(await l.count().catch(()=>0),300);for(let i=0;i<n;i++){const e=l.nth(i);if(await e.isVisible().catch(()=>false)){const t=clean(await e.innerText().catch(()=>''));if(t)vals.push(t);}}
  }
  return uniq(vals);
}
async function clickReactSelect(frame,which=0){
  const choices=frame.locator('[role="button"].pam__SelectValue__value, .pam__SelectValue__value[role="button"], [class*="SelectValue"][role="button"]');
  const n=await choices.count().catch(()=>0);if(!n)return false;
  const e=choices.nth(Math.min(which,n-1));await e.click({force:true});await sleep(1000);return true;
}
async function chooseTourType(frame,type){
  await clickReactSelect(frame,0);
  const opts=await optionTexts(frame);
  let candidate=null;
  const exact=type==='guided'?/^guided(?: tour)?$/i:/^(?:video|live video)(?: tour)?$/i;
  for(const sel of ['[role="option"]','[class*="Option"]','[class*="option"]','li']){
    const l=frame.locator(sel);const n=Math.min(await l.count().catch(()=>0),300);for(let i=0;i<n;i++){const e=l.nth(i);if(!await e.isVisible().catch(()=>false))continue;const t=clean(await e.innerText().catch(()=>''));if(exact.test(t)){candidate=e;break;}}if(candidate)break;
  }
  if(!candidate){await frame.locator('body').press('Escape').catch(()=>{});return{chosen:false,options:opts};}
  await candidate.click({force:true});await sleep(3500);return{chosen:true,option:clean(await candidate.innerText().catch(()=>'')),options:opts};
}
async function inspectInputs(frame){return frame.locator('input').evaluateAll(els=>els.map((e,i)=>({i,outer:e.outerHTML.slice(0,1000),visible:e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0,value:e.value,disabled:e.disabled}))).catch(()=>[]);}
async function chooseDate(frame,iso){
  const [y,m,d]=iso.split('-');
  const monthName=new Date(`${iso}T12:00:00-05:00`).toLocaleDateString('en-US',{month:'long',timeZone:'America/Chicago'});
  const patterns=[new RegExp(`${monthName}\\s+${Number(d)}(?:,\\s*${y})?`,'i'),new RegExp(`${m}/${d}/${y}`),new RegExp(`${Number(m)}/${Number(d)}/${y}`),new RegExp(iso),new RegExp(`^${Number(d)}$`)];
  const inputs=frame.locator('input');const ni=await inputs.count().catch(()=>0);
  for(let i=0;i<ni;i++){
    const e=inputs.nth(i);if(!await e.isVisible().catch(()=>false)||await e.isDisabled().catch(()=>true))continue;
    const meta=clean([await e.getAttribute('placeholder').catch(()=>''),await e.getAttribute('aria-label').catch(()=>''),await e.getAttribute('class').catch(()=>''),await e.getAttribute('name').catch(()=>''),await e.getAttribute('id').catch(()=>'' )].join(' '));
    if(/date|calendar|mm|dd/i.test(meta)){
      const type=await e.getAttribute('type').catch(()=>null);
      if(type==='date'){await e.fill(iso);await e.dispatchEvent('change');await sleep(2500);return{chosen:true,method:'native-date-input'};}
      await e.click({force:true});await sleep(900);break;
    }
  }
  // If no date-looking input, click the visible Date area/select.
  const dateLabel=frame.getByText(/^Date$/i,{exact:true});if(await dateLabel.count().catch(()=>0)){const box=dateLabel.first().locator('..');await box.click({force:true}).catch(()=>{});await sleep(900);}
  const loc=frame.locator('button,a,[role="button"],[role="gridcell"],td,div');const n=Math.min(await loc.count().catch(()=>0),3500);
  const candidates=[];
  for(let i=0;i<n;i++){
    const e=loc.nth(i);if(!await e.isVisible().catch(()=>false)||await e.isDisabled().catch(()=>true))continue;
    const t=clean([await e.innerText().catch(()=>''),await e.getAttribute('aria-label').catch(()=>''),await e.getAttribute('title').catch(()=>''),await e.getAttribute('data-date').catch(()=>''),await e.getAttribute('datetime').catch(()=>'' )].join(' '));
    if(patterns.some(p=>p.test(t)))candidates.push({e,t});
  }
  // Prefer a candidate containing a full date, then a compact day cell.
  candidates.sort((a,b)=>(b.t.includes(y)?1:0)-(a.t.includes(y)?1:0) || a.t.length-b.t.length);
  for(const c of candidates){try{await c.e.click({force:true});await sleep(3000);return{chosen:true,method:'calendar',text:c.t};}catch{}}
  // Last resort fill first visible text input after type choice.
  for(let i=0;i<ni;i++){const e=inputs.nth(i);if(await e.isVisible().catch(()=>false)&&!await e.isDisabled().catch(()=>true)){try{await e.fill(`${m}/${d}/${y}`);await e.press('Enter');await sleep(3000);return{chosen:true,method:'fill-first-input'};}catch{}}}
  return{chosen:false};
}
async function getTimeOptions(frame){
  // Click the select whose displayed text is Select time or that is nearest the Time label.
  let clicked=false;
  const st=frame.getByText(/^Select time$/i,{exact:true});if(await st.count().catch(()=>0)){await st.first().click({force:true}).catch(()=>{});clicked=true;}
  if(!clicked)clicked=await clickReactSelect(frame,1);
  await sleep(900);
  const opts=await optionTexts(frame);
  const times=uniq(opts.flatMap(extractTimes));
  await frame.locator('body').press('Escape').catch(()=>{});await sleep(300);
  return{clicked,options:opts,times};
}
async function nestioWalk(target,type){
  const context=await newContext();const page=await context.newPage();const responses=[];
  context.on('response',r=>{if(['xhr','fetch'].includes(r.request().resourceType())){const rec={url:r.url(),status:r.status(),method:r.request().method(),postData:r.request().postData()};responses.push(rec);if(/json|text/i.test(r.headers()['content-type']||''))r.text().then(body=>{if(body.length<1500000)rec.body=body;}).catch(()=>{});}});
  const out={property:target.name,type,url:target.url,responses,steps:[],days:{},states:[]};
  await goto(page,target.url);await dismiss(page);
  const frame=page.frames().find(f=>f.url().includes('integrations.nestio.com/contact-widget'));
  if(!frame){out.error='Nestio iframe not found';out.states.push(await snapshot(page,'no-frame'));await context.close();return out;}
  out.states.push(await snapshot(page,'initial'));
  out.steps.push({tourType:await chooseTourType(frame,type),inputs:await inspectInputs(frame)});
  out.states.push(await snapshot(page,'after-type'));
  for(const iso of DATES){
    const dc=await chooseDate(frame,iso);const to=dc.chosen?await getTimeOptions(frame):{clicked:false,options:[],times:[]};
    out.days[iso]={dateChoice:dc,timeChoice:to};out.states.push(await snapshot(page,`after-${iso}`));
  }
  // If any slot exists, select the first currently visible option and continue to inspect final action copy; do not submit.
  const firstDate=Object.entries(out.days).find(([,v])=>v.timeChoice.times.length);
  if(firstDate){
    await chooseDate(frame,firstDate[0]);await getTimeOptions(frame);
    // reopen and click first actual time option
    const st=frame.getByText(/^Select time$/i,{exact:true});if(await st.count().catch(()=>0))await st.first().click({force:true}).catch(()=>{});else await clickReactSelect(frame,1);
    await sleep(700);let chosen=false;
    for(const sel of ['[role="option"]','[class*="Option"]','[class*="option"]','li']){const l=frame.locator(sel);const n=Math.min(await l.count().catch(()=>0),200);for(let i=0;i<n;i++){const e=l.nth(i);if(await e.isVisible().catch(()=>false)&&extractTimes(await e.innerText().catch(()=>'' )).length){await e.click({force:true});chosen=true;break;}}if(chosen)break;}
    await sleep(700);const cont=frame.getByRole('button',{name:/continue/i});if(await cont.count().catch(()=>0)){await cont.first().click({force:true});await sleep(2500);out.states.push(await snapshot(page,'after-continue'));}
  }
  await page.screenshot({path:path.join(OUT,`nestio-${target.id}-${type}.png`)}).catch(()=>{});
  await context.close();return out;
}

const nestio=[];
for(const target of nestioTargets){
  // Read enabled type options from the live menu, then attempt both common agent-led modes.
  for(const type of ['guided','video']){console.log('NESTIO_START',target.name,type);nestio.push(await nestioWalk(target,type));console.log('NESTIO_DONE',target.name,type);}
}
await writeJson(path.join(OUT,'nestio-results.json'),nestio);

async function rentCafeOne(url,name,index,iso){
  const context=await newContext();const page=await context.newPage();const out={name,iso,responses:[]};
  context.on('response',r=>{if(r.url().includes('GetAvailableSlots')){const rec={url:r.url(),status:r.status(),method:r.request().method(),postData:r.request().postData(),headers:r.request().headers()};out.responses.push(rec);r.text().then(body=>rec.body=body.slice(0,500000)).catch(()=>{});}});
  await goto(page,url);await dismiss(page);const label=page.locator(`label[for="radiodate${index}"]`);if(await label.count().catch(()=>0)){await label.click({position:{x:20,y:20}}).catch(()=>{});await sleep(9000);}out.state=await snapshot(page,'after-date');
  const txt=out.state.frames.map(f=>f.text).join(' ');out.times=extractTimes((txt.split(/Desired time for tour/i)[1]||'').split(/Guided Tour|Office Information/i)[0]||'');
  await page.screenshot({path:path.join(OUT,`rentcafe-${name}-${iso}.png`)}).catch(()=>{});await context.close();return out;
}
const rentcafe=[];
for(const [name,url] of [['memoir-may','https://www.memoir-mayhosiery.com/scheduletour'],['memoir-weho','https://www.memoir-wedgewoodhouston.com/scheduletour']]){
  for(let i=0;i<DATES.length;i++){console.log('RENTCAFE_START',name,DATES[i]);rentcafe.push(await rentCafeOne(url,name,i+1,DATES[i]));console.log('RENTCAFE_DONE',name,DATES[i]);}
}
await writeJson(path.join(OUT,'rentcafe-results.json'),rentcafe);

async function fineryAudit(){
  const context=await newContext();const page=await context.newPage();const out={states:[],resources:[],responses:[],htmlSignals:{}};
  context.on('response',r=>{const req=r.request();if(['xhr','fetch','document'].includes(req.resourceType()))out.responses.push({url:r.url(),status:r.status(),method:req.method(),type:req.resourceType()});});
  await goto(page,'https://www.livethefinery.com/');await dismiss(page);const cta=page.locator('.hytour-link').first();out.ctaOuter=await cta.evaluate(e=>e.outerHTML).catch(()=>null);out.htmlSignals=await page.evaluate(()=>{const html=document.documentElement.innerHTML;const scripts=[...document.scripts].map(s=>s.src||s.textContent?.slice(0,5000));return{hytourSnippets:[...html.matchAll(/.{0,250}hytour.{0,500}/ig)].slice(0,20).map(m=>m[0]),tourUrls:[...new Set((html.match(/https?:[^\"'<>\s]+/g)||[]).filter(u=>/tour|hy\.ly|hyly|schedule/i.test(u)))].slice(0,100),scripts:scripts.filter(Boolean).filter(s=>/hy|tour|lease|crm|schedule/i.test(s)).slice(0,100)};});
  out.states.push(await snapshot(page,'before-click'));
  await cta.click({force:true}).catch(()=>{});await sleep(8000);out.states.push(await snapshot(page,'after-click'));
  await page.evaluate(()=>{document.querySelector('.hytour-link')?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));});await sleep(8000);out.states.push(await snapshot(page,'after-dom-click'));
  out.resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(x=>x.name).filter(u=>/tour|hy\.ly|hyly|schedule|calendar|appointment/i.test(u)).slice(0,300));
  out.pages=context.pages().map(p=>p.url());await page.screenshot({path:path.join(OUT,'finery.png')}).catch(()=>{});await context.close();return out;
}
const finery=await fineryAudit();await writeJson(path.join(OUT,'finery-result.json'),finery);

async function jonahFinal(name,url,typeText){
  const context=await newContext();const page=await context.newPage();const out={name,states:[]};await goto(page,url);await dismiss(page);out.states.push(await snapshot(page,'loaded'));
  if(typeText){const type=page.getByText(new RegExp(`^${typeText}$`,'i'),{exact:true});if(await type.count().catch(()=>0)){await type.first().click({force:true});await sleep(3000);out.states.push(await snapshot(page,'after-type'));}}
  let time=page.locator('button.tour-select__time-btn').first();if(await time.count().catch(()=>0)){await time.click({force:true});await sleep(500);const next=page.locator('#timeListNextBtn');if(await next.count().catch(()=>0)){await next.click({force:true});await sleep(2500);out.states.push(await snapshot(page,'after-next'));}}
  await page.screenshot({path:path.join(OUT,`jonah-${name}.png`)}).catch(()=>{});await context.close();return out;
}
const jonah=[await jonahFinal('delux','https://deluxweho.com/schedule-a-tour/',null),await jonahFinal('luna','https://lunanashvilleliving.com/schedule-a-tour/','Guided Tours')];
await writeJson(path.join(OUT,'jonah-final-results.json'),jonah);

await browser.close();xvfb.kill('SIGTERM');
console.log('SPECIALIZED_AUDIT_COMPLETE');
