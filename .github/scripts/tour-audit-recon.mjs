import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = process.env.AUDIT_OUT || 'tour-audit-artifacts';
const DAYS = [
  {iso:'2026-09-08', dow:'Tue', day:'08'}, {iso:'2026-09-09', dow:'Wed', day:'09'},
  {iso:'2026-09-10', dow:'Thu', day:'10'}, {iso:'2026-09-11', dow:'Fri', day:'11'},
  {iso:'2026-09-12', dow:'Sat', day:'12'}, {iso:'2026-09-13', dow:'Sun', day:'13'},
  {iso:'2026-09-14', dow:'Mon', day:'14'}
];
const TARGETS = [
  {id:'01-emblem', name:'Emblem Park', url:'https://emblemparknashville.com/schedule-a-tour/', kind:'greystar'},
  {id:'02-westerly', name:'Westerly House', url:'https://livewesterlyhouse.com/schedule-a-tour/', kind:'greystar'},
  {id:'03-445', name:'445 Park Commons', url:'https://445parkcommons.com/schedule-a-tour/', kind:'knock'},
  {id:'04-finery', name:'Residences at The Finery', url:'https://www.livethefinery.com/', kind:'finery'},
  {id:'05-memoir-weho', name:'Memoir Wedgewood Houston', url:'https://www.memoir-wedgewoodhouston.com/scheduletour', kind:'rentcafe'},
  {id:'06-memoir-may', name:'Memoir May Hosiery', url:'https://www.memoir-mayhosiery.com/scheduletour', kind:'rentcafe'},
  {id:'07-standard', name:'Standard Assembly', url:'https://thestandardassembly.com/schedule-a-tour/', kind:'greystar'},
  {id:'08-queens', name:'Queens Wedgewood Houston', url:'https://queensweho.com/schedule-a-tour/', kind:'greystar'},
  {id:'09-luna', name:'Luna', url:'https://lunanashvilleliving.com/schedule-a-tour/', kind:'greystar'},
  {id:'10-delux', name:'Delux WeHo', url:'https://deluxweho.com/schedule-a-tour/', kind:'greystar'},
  {id:'11-standard-greystar', name:'Standard Assembly Greystar listing', url:'https://www.greystar.com/standard-assembly-apartments-nashville-tn/p_19399', kind:'listing'}
];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const clean = v => String(v ?? '').replace(/\u0000/g,'').replace(/\s+/g,' ').trim();
const uniq = a => [...new Set(a.filter(Boolean))];
const safe = s => clean(s).replace(/[^a-z0-9._-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,120)||'item';
async function mkdirp(p){await fs.mkdir(p,{recursive:true});}
async function writeJson(p,v){await mkdirp(path.dirname(p));await fs.writeFile(p,JSON.stringify(v,null,2));}

async function visibleControls(frame){
  return frame.locator('a,button,[role="button"],[role="gridcell"],input,select,option,label,[data-date],[data-time],[datetime]').evaluateAll(els=>els.slice(0,2500).map(el=>{
    const r=el.getBoundingClientRect(), s=getComputedStyle(el);
    const attrs={}; for(const k of ['aria-label','aria-selected','aria-checked','title','href','value','name','id','data-date','data-time','datetime','role','type','for','class']){const v=el.getAttribute(k);if(v)attrs[k]=v;}
    return {tag:el.tagName.toLowerCase(),text:(el.innerText||el.textContent||el.getAttribute('aria-label')||el.getAttribute('value')||'').replace(/\s+/g,' ').trim().slice(0,500),attrs,visible:r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden',disabled:Boolean(el.disabled)||el.getAttribute('aria-disabled')==='true'};
  }).filter(x=>x.visible)).catch(()=>[]);
}

async function snapshot(page,label){
  const frames=[];
  for(const frame of page.frames()){
    frames.push({url:frame.url(),name:frame.name(),text:clean(await frame.locator('body').innerText({timeout:5000}).catch(()=>'' )).slice(0,120000),controls:await visibleControls(frame)});
  }
  return {label,at:new Date().toISOString(),pageUrl:page.url(),title:await page.title().catch(()=>''),frames};
}

async function clickMatching(page,re,{exclude=/submit|send|confirm|apply|schedule your tour|book your tour|finish|complete/i,force=true}={}){
  const prior=new Set(page.context().pages());
  for(const frame of page.frames()){
    const loc=frame.locator('a,button,[role="button"],label,input[type="button"],input[type="submit"]');
    const n=Math.min(await loc.count().catch(()=>0),1200);
    for(let i=0;i<n;i++){
      const el=loc.nth(i); if(!await el.isVisible().catch(()=>false)||await el.isDisabled().catch(()=>true))continue;
      const text=clean((await el.innerText().catch(()=>''))||(await el.getAttribute('aria-label').catch(()=>''))||(await el.getAttribute('value').catch(()=>'')));
      const href=clean(await el.getAttribute('href').catch(()=>''));
      if(!re.test(`${text} ${href}`)||exclude.test(text))continue;
      try{
        await el.click({timeout:5000,force}); await sleep(1800);
        const popup=page.context().pages().filter(p=>!prior.has(p)).at(-1);
        if(popup){await popup.waitForLoadState('commit',{timeout:15000}).catch(()=>{});await sleep(2500);return {clicked:true,text,href,page:popup};}
        return {clicked:true,text,href,page};
      }catch(e){try{await el.evaluate(x=>x.click());await sleep(1800);return {clicked:true,text,href,page,via:'dom'};}catch{return {clicked:false,text,href,error:String(e),page};}}
    }
  }
  return {clicked:false,page};
}

async function dismiss(page){
  const selectors=['button[aria-label="Close"]','.pum-close','.popmake-close','button.close','.modal-close','[class*="popup"] [class*="close"]','[class*="modal"] [class*="close"]'];
  for(const sel of selectors){for(const frame of page.frames()){const loc=frame.locator(sel);const n=Math.min(await loc.count().catch(()=>0),10);for(let i=0;i<n;i++){if(await loc.nth(i).isVisible().catch(()=>false))await loc.nth(i).click({force:true,timeout:1500}).catch(()=>{});}}}
  for(const re of [/^accept$/i,/accept all cookies/i,/^dismiss$/i,/^close$/i,/not now/i]) await clickMatching(page,re,{exclude:/preferences|settings/i});
  await sleep(1000); return page;
}

async function navigate(page,url){
  let error=null;
  try{await page.goto(url,{waitUntil:'commit',timeout:60000});}catch(e){error=String(e);}
  await sleep(14000);
  return error;
}

function timeMatches(text){return uniq((clean(text).match(/\b(?:0?[1-9]|1[0-2])(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)\b/ig)||[]).map(x=>x.toUpperCase().replace(/\./g,'').replace(/\s+/g,' ')));}
async function captureCurrentTimes(page){
  const out=[];
  for(const frame of page.frames()){
    for(const c of await visibleControls(frame)){
      if(c.disabled)continue; const t=timeMatches(`${c.text} ${Object.values(c.attrs).join(' ')}`); if(t.length)out.push(...t);
    }
  }
  return uniq(out);
}

async function clickRentCafeDays(page,result){
  result.dayChecks={};
  for(let i=1;i<=7;i++){
    let clicked=false, method='';
    for(const frame of page.frames()){
      const radio=frame.locator(`#radiodate${i}`);
      if(await radio.count().catch(()=>0)){
        try{await radio.check({force:true,timeout:4000});clicked=true;method='check';}catch{try{await radio.evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.click();});clicked=true;method='dom';}catch{}}
        if(clicked)break;
      }
    }
    await sleep(3500);
    const state=await snapshot(page,`rentcafe-day-${i}`);
    const allText=state.frames.map(f=>f.text).join(' ');
    const desired=(allText.split(/Desired time for tour/i)[1]||'').split(/Office Information|Confirm your Appointment/i)[0]||'';
    result.dayChecks[DAYS[i-1].iso]={clicked,method,times:timeMatches(desired),state};
  }
}

async function clickTypeAndDates(page,result){
  const typeRegexes=[/in[- ]person tour/i,/guided tours?$/i,/live video tours?$/i,/self[- ]guided tours?$/i,/virtual tours?$/i];
  result.typeRuns=[];
  for(const typeRe of typeRegexes){
    const found=[];
    for(const frame of page.frames()) for(const c of await visibleControls(frame)){const s=`${c.text} ${c.attrs['aria-label']||''}`;if(typeRe.test(s)&&!c.disabled)found.push(c.text||c.attrs['aria-label']);}
    if(!found.length)continue;
    const run={type:found[0],interaction:null,states:[],days:{}};
    const cr=await clickMatching(page,typeRe,{exclude:/about|read more|learn more/i}); run.interaction={clicked:cr.clicked,text:cr.text,error:cr.error}; page=cr.page; await sleep(2500); run.states.push(await snapshot(page,'after-type'));
    // Some widgets require a safe Next after choosing type.
    const nx=await clickMatching(page,/^(next|continue|select)$/i,{exclude:/submit|send|confirm|schedule|book|finish/i}); if(nx.clicked){page=nx.page;run.next={clicked:true,text:nx.text};await sleep(1800);run.states.push(await snapshot(page,'after-type-next'));}
    for(const d of DAYS){
      let chosen=false,chosenText='';
      const patterns=[new RegExp(`${d.dow}[^0-9]{0,20}${Number(d.day)}\\b`,'i'),new RegExp(`${d.dow}[^0-9]{0,20}${d.day}\\b`,'i'),new RegExp(`September\\s+${Number(d.day)}\\b`,'i'),new RegExp(`2026-09-${d.day}`,'i')];
      outer: for(const frame of page.frames()){
        const loc=frame.locator('button,a,[role="button"],[role="gridcell"],label,input,[data-date],[datetime]'); const n=Math.min(await loc.count().catch(()=>0),1800);
        for(let i=0;i<n;i++){
          const el=loc.nth(i); if(!await el.isVisible().catch(()=>false)||await el.isDisabled().catch(()=>true))continue;
          const text=clean([await el.innerText().catch(()=>''),await el.getAttribute('aria-label').catch(()=>''),await el.getAttribute('title').catch(()=>''),await el.getAttribute('data-date').catch(()=>''),await el.getAttribute('datetime').catch(()=>''),await el.getAttribute('value').catch(()=>'' )].join(' '));
          if(!patterns.some(p=>p.test(text)))continue;
          try{if((await el.getAttribute('type').catch(()=>''))==='radio')await el.check({force:true});else await el.click({force:true,timeout:3000});chosen=true;chosenText=text;}catch{try{await el.evaluate(x=>x.click());chosen=true;chosenText=text;}catch{}}
          if(chosen)break outer;
        }
      }
      await sleep(1800); run.days[d.iso]={chosen,chosenText,times:await captureCurrentTimes(page),state:await snapshot(page,`day-${d.iso}`)};
    }
    result.typeRuns.push(run);
    break; // One full run is sufficient to reveal calendar inventory; all offered types are captured in states/network.
  }
  return page;
}

async function probeFinalLanguage(page,result){
  const before=await snapshot(page,'before-final-probe');
  let timeEl=null;
  for(const frame of page.frames()){
    const loc=frame.locator('button,a,[role="button"],label,input[type="radio"]');const n=Math.min(await loc.count().catch(()=>0),1200);
    for(let i=0;i<n;i++){
      const el=loc.nth(i);if(!await el.isVisible().catch(()=>false)||await el.isDisabled().catch(()=>true))continue;
      const text=clean([await el.innerText().catch(()=>''),await el.getAttribute('aria-label').catch(()=>''),await el.getAttribute('value').catch(()=>'' )].join(' '));
      if(timeMatches(text).length){timeEl=el;break;}
    }
    if(timeEl)break;
  }
  if(timeEl){await timeEl.click({force:true}).catch(()=>timeEl.evaluate(x=>x.click()).catch(()=>{}));await sleep(1200);const nx=await clickMatching(page,/^(next|continue)$/i,{exclude:/submit|send|confirm|schedule|book|finish/i});if(nx.clicked){page=nx.page;await sleep(1800);}}
  result.finalProbe={before,after:await snapshot(page,'after-final-probe')};
}

async function audit(browser,target){
  const dir=path.join(OUT,target.id);await mkdirp(dir);
  const context=await browser.newContext({locale:'en-US',timezoneId:'America/Chicago',viewport:{width:1440,height:1000},userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'});
  await context.route('**/*',route=>['image','media','font'].includes(route.request().resourceType())?route.abort():route.continue());
  context.setDefaultTimeout(7000);
  let page=await context.newPage();
  const result={property:target.name,url:target.url,kind:target.kind,auditedAt:new Date().toISOString(),states:[],network:[],responseBodies:[],errors:[],console:[]};
  context.on('page',p=>p.on('console',m=>result.console.push({type:m.type(),text:m.text()})));
  page.on('console',m=>result.console.push({type:m.type(),text:m.text()}));
  context.on('response',r=>{
    const req=r.request();if(!['xhr','fetch','document'].includes(req.resourceType()))return;
    const rec={url:r.url(),status:r.status(),method:req.method(),type:req.resourceType(),contentType:r.headers()['content-type']||''};result.network.push(rec);
    if(['xhr','fetch'].includes(req.resourceType())&&/json|text|javascript|xml/i.test(rec.contentType)) Promise.race([r.text(),sleep(4000).then(()=>'' )]).then(body=>{if(body&&body.length<2500000)result.responseBodies.push({...rec,body});}).catch(()=>{});
  });
  try{
    result.navigationError=await navigate(page,target.url);page=await dismiss(page);result.states.push(await snapshot(page,'loaded'));
    if(target.kind==='finery'){
      page=await dismiss(page);
      const c=await clickMatching(page,/schedule a tour/i,{exclude:/submit|send|confirm|apply/i});result.openScheduler={clicked:c.clicked,text:c.text,error:c.error};page=c.page;await sleep(9000);page=await dismiss(page);result.states.push(await snapshot(page,'finery-scheduler'));
    }
    if(target.kind==='listing'){
      result.states.push(await snapshot(page,'greystar-listing')); // Listing itself exposes only an inquiry form.
    } else if(target.kind==='rentcafe') {
      await clickRentCafeDays(page,result);
      await probeFinalLanguage(page,result);
    } else {
      page=await clickTypeAndDates(page,result);
      await probeFinalLanguage(page,result);
    }
    await sleep(3500);
    for(const p of context.pages()) result.states.push(await snapshot(p,`open-page-${context.pages().indexOf(p)+1}`));
    result.finalUrls=uniq(context.pages().map(p=>p.url()));
    result.responseBodies=result.responseBodies.filter((x,i,a)=>a.findIndex(y=>y.url===x.url&&y.body===x.body)===i);
    await page.screenshot({path:path.join(dir,'final.png')}).catch(()=>{});
    for(let i=0;i<context.pages().length;i++)await context.pages()[i].screenshot({path:path.join(dir,`page-${i+1}.png`)}).catch(()=>{});
  }catch(e){result.errors.push(String(e?.stack||e));}
  await writeJson(path.join(dir,'result.json'),result);
  await fs.writeFile(path.join(dir,'all-text.txt'),result.states.map(s=>`\n===== ${s.label} ${s.pageUrl} =====\n${s.frames.map(f=>`\n--- ${f.url} ---\n${f.text}`).join('\n')}`).join('\n'));
  await context.close().catch(()=>{});
  console.log('TARGET_RESULT',target.name,JSON.stringify({navError:result.navigationError,errors:result.errors.length,finalUrls:result.finalUrls,bodies:result.responseBodies.length}));
  return result;
}

async function pool(items,n,fn){const out=new Array(items.length);let k=0;async function w(){while(true){const i=k++;if(i>=items.length)return;console.log('TARGET_START',items[i].name);out[i]=await fn(items[i]);}}await Promise.all(Array.from({length:n},w));return out;}

await mkdirp(OUT);
const browser=await chromium.launch({headless:true,args:['--disable-blink-features=AutomationControlled']});
const results=await pool(TARGETS,4,t=>audit(browser,t));
await browser.close();
await writeJson(path.join(OUT,'targeted-results.json'),results);
console.log('TARGETED_AUDIT_COMPLETE');
