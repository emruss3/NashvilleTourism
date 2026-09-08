import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const OUT = 'tour-provider-browser-output';
await fs.mkdir(OUT, { recursive: true });

const knockHtml = `<!doctype html><html><head><meta charset="utf-8"><title>445 Park Commons Tour</title></head><body>
<h1>445 Park Commons</h1><div id="exampleContainerId"></div>
<script src="https://doorway.knck.io/latest/doorway.min.js"></script>
<script>window.addEventListener('load',()=>{window.knockDoorway.init('b1e62194842811eaa6600e8ff32f9bc5','community','3703f4711f108736',{embedding:{page:'schedule',container:'exampleContainerId',showChatbot:true}});});</script>
</body></html>`;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(knockHtml);
});
await new Promise((resolve) => server.listen(3219, '127.0.0.1', resolve));

const targets = [
  { slug: 'finery-hyly', name: 'Residences at The Finery', url: 'https://my.hy.ly/tours/livethefinery/site?dd=0&popup=1' },
  { slug: 'park445-knock', name: '445 Park Commons', url: 'http://127.0.0.1:3219/' },
  { slug: 'standard-official', name: 'Standard Assembly', url: 'https://thestandardassembly.com/' },
  { slug: 'limestone', name: 'Limestone (formerly Luna)', url: 'https://liveatlimestone.com/scheduletour' },
  { slug: 'memoir-weho-securecafe', name: 'Memoir Wedgewood Houston', url: 'https://memoir-wedgewoodhouston.securecafe.com/scheduletour' },
  { slug: 'memoir-may-securecafe', name: 'Memoir May Hosiery', url: 'https://memoir-mayhosiery.securecafe.com/scheduletour' },
  { slug: 'coda-prospectportal', name: 'CODA', url: 'https://coda.prospectportal.com/nashville/coda/conventional/' },
];

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-dev-shm-usage','--disable-blink-features=AutomationControlled'] });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1200 },
  locale: 'en-US',
  timezoneId: 'America/Chicago',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
});

function visibleTextElementsScript() {
  const isVisible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity || 1) > 0;
  };
  const attrs = ['aria-label','title','name','id','type','href','placeholder','value','role','class','data-date','data-day','data-value','data-testid'];
  return [...document.querySelectorAll('a,button,input,select,option,textarea,label,[role="button"],[role="link"],[tabindex],[data-date],[data-day]')]
    .filter(isVisible)
    .slice(0, 1200)
    .map((el, index) => {
      const o = { index, tag: el.tagName, text: (el.innerText || el.textContent || '').trim().replace(/\s+/g,' ').slice(0,500), disabled: !!el.disabled };
      for (const a of attrs) o[a] = el.getAttribute(a);
      if (el.tagName === 'SELECT') o.options = [...el.options].map(x => ({ text:x.text, value:x.value, selected:x.selected, disabled:x.disabled }));
      return o;
    });
}

async function snapshot(page, label, network, interactions) {
  const data = { label, capturedAt: new Date().toISOString(), url: page.url(), title: await page.title().catch(()=>''), frames: [], network: network.slice(-1000), interactions: [...interactions] };
  for (const frame of page.frames()) {
    const f = { url: frame.url(), name: frame.name(), text: '', interactive: [] };
    try { f.text = (await frame.locator('body').innerText({timeout:5000})).replace(/\s+/g,' ').slice(0,100000); } catch(e) { f.text = `[unavailable ${String(e)}]`; }
    try { f.interactive = await frame.evaluate(visibleTextElementsScript); } catch(e) { f.interactive = [{ error:String(e) }]; }
    data.frames.push(f);
  }
  const dir = path.join(OUT, page._auditSlug || 'unknown');
  await fs.mkdir(dir,{recursive:true});
  await fs.writeFile(path.join(dir,`${label}.json`),JSON.stringify(data,null,2));
  await page.screenshot({path:path.join(dir,`${label}.png`),fullPage:true}).catch(()=>{});
  await fs.writeFile(path.join(dir,`${label}.html`),await page.content().catch(()=>''));
  return data;
}

async function clickVisibleByPatterns(page, patterns, interactions, avoid=/submit|confirm|book your tour|send my message|apply/i) {
  for (const frame of page.frames()) {
    for (const pattern of patterns) {
      const locators = [
        frame.getByRole('button',{name:pattern}),
        frame.getByRole('link',{name:pattern}),
        frame.getByText(pattern,{exact:false}),
      ];
      for (const loc of locators) {
        const count = await loc.count().catch(()=>0);
        for (let i=0;i<Math.min(count,8);i++) {
          const el=loc.nth(i);
          try {
            if (!await el.isVisible({timeout:250})) continue;
            if (await el.isDisabled().catch(()=>false)) continue;
            const text=((await el.innerText().catch(()=>'')) || (await el.getAttribute('aria-label').catch(()=>'')) || '').trim();
            if (avoid.test(text)) continue;
            await el.click({timeout:8000});
            interactions.push({action:'click',pattern:String(pattern),text,frame:frame.url(),at:new Date().toISOString()});
            await page.waitForTimeout(1800);
            return true;
          } catch {}
        }
      }
    }
  }
  return false;
}

async function dismissOverlays(page, interactions) {
  const patterns=[/^accept$/i,/accept all/i,/accept cookies/i,/^dismiss$/i,/continue without/i,/cookie preferences/i,/^close$/i,/close modal/i,/no thanks/i,/not now/i,/×/i];
  for(let pass=0;pass<5;pass++) {
    let clicked=false;
    for (const frame of page.frames()) {
      for(const p of patterns) {
        for(const role of ['button','link']) {
          const loc=frame.getByRole(role,{name:p});
          const n=await loc.count().catch(()=>0);
          for(let i=0;i<Math.min(n,5);i++) {
            try{
              const el=loc.nth(i); if(!await el.isVisible({timeout:150})) continue;
              const t=(await el.innerText().catch(()=>''))||p.toString();
              await el.click({timeout:2500}); interactions.push({action:'dismiss',text:t,frame:frame.url()});
              await page.waitForTimeout(500); clicked=true; break;
            }catch{}
          }
          if(clicked) break;
        }
        if(clicked) break;
      }
      if(clicked) break;
    }
    if(!clicked) break;
  }
}

async function fillVisibleContactFields(page, interactions) {
  const values = [
    [/first.?name/i,'Tour'],[/last.?name/i,'Audit'],[/full.?name|your name/i,'Tour Audit'],[/email/i,'tour.audit@example.com'],[/phone|mobile/i,'6155550123'],[/zip|postal/i,'37203'],[/move.?in|desired date/i,'10/01/2026'],[/message|comments|notes/i,'Tour availability audit — no booking submission.']
  ];
  let filled=0;
  for(const frame of page.frames()){
    for(const [p,v] of values){
      const locs=[frame.getByLabel(p),frame.getByPlaceholder(p),frame.locator(`input[name*="${p.source.split(/[.?|]/)[0]}" i],textarea[name*="${p.source.split(/[.?|]/)[0]}" i]`)];
      for(const loc of locs){
        const n=await loc.count().catch(()=>0);
        for(let i=0;i<Math.min(n,4);i++){
          try{const el=loc.nth(i); if(!await el.isVisible({timeout:150}))continue; const type=await el.getAttribute('type'); if(['checkbox','radio','submit','button','hidden'].includes(type))continue; await el.fill(v,{timeout:2500}); interactions.push({action:'fill',field:String(p),value:v,frame:frame.url()}); filled++; break;}catch{}
        }
        if(filled){} 
      }
    }
  }
  return filled;
}

async function collectTimesForDates(page, interactions) {
  const dates=[
    {iso:'2026-09-08',day:'8',names:['Tuesday','Tue'],labels:['September 8','Sep 8','09/08/2026','9/8/2026']},
    {iso:'2026-09-09',day:'9',names:['Wednesday','Wed'],labels:['September 9','Sep 9','09/09/2026','9/9/2026']},
    {iso:'2026-09-10',day:'10',names:['Thursday','Thu'],labels:['September 10','Sep 10','09/10/2026','9/10/2026']},
    {iso:'2026-09-11',day:'11',names:['Friday','Fri'],labels:['September 11','Sep 11','09/11/2026','9/11/2026']},
    {iso:'2026-09-12',day:'12',names:['Saturday','Sat'],labels:['September 12','Sep 12','09/12/2026','9/12/2026']},
    {iso:'2026-09-13',day:'13',names:['Sunday','Sun'],labels:['September 13','Sep 13','09/13/2026','9/13/2026']},
    {iso:'2026-09-14',day:'14',names:['Monday','Mon'],labels:['September 14','Sep 14','09/14/2026','9/14/2026']},
  ];
  const output={};
  for(const date of dates){
    let clicked=false;
    for(const frame of page.frames()){
      const candidates=frame.locator('button:visible,a:visible,input:visible,label:visible,[role="button"]:visible,[data-date]:visible,[data-day]:visible');
      const n=await candidates.count().catch(()=>0);
      for(let i=0;i<Math.min(n,1000);i++){
        const el=candidates.nth(i);
        try{
          const info=await el.evaluate((x)=>({text:(x.innerText||x.textContent||'').trim().replace(/\s+/g,' '),aria:x.getAttribute('aria-label')||'',title:x.getAttribute('title')||'',value:x.value||x.getAttribute('value')||'',date:x.getAttribute('data-date')||'',day:x.getAttribute('data-day')||'',disabled:!!x.disabled,className:x.className||''}));
          const hay=[info.text,info.aria,info.title,info.value,info.date,info.day].join(' ');
          const strong=date.labels.some(l=>hay.toLowerCase().includes(l.toLowerCase())) || hay.includes(date.iso) || (date.names.some(x=>hay.toLowerCase().includes(x.toLowerCase())) && new RegExp(`(^|\\D)0?${date.day}(\\D|$)`).test(hay));
          if(!strong||info.disabled)continue;
          await el.click({timeout:5000});
          interactions.push({action:'date-click',date:date.iso,hay:hay.slice(0,300),frame:frame.url()});
          await page.waitForTimeout(1600); clicked=true; break;
        }catch{}
      }
      if(clicked)break;
    }
    const times=[];
    for(const frame of page.frames()){
      try{
        const arr=await frame.locator('button:visible,a:visible,label:visible,option:visible,[role="button"]:visible,[role="option"]:visible').evaluateAll((els)=>els.map(e=>((e.innerText||e.textContent||e.getAttribute('aria-label')||'').trim().replace(/\s+/g,' '))).filter(Boolean));
        for(const s of arr){
          for(const m of s.matchAll(/\b(?:1[0-2]|0?[1-9]):[0-5]\d\s*(?:a\.?m\.?|p\.?m\.?)\b/ig)) times.push(m[0]);
        }
      }catch{}
    }
    output[date.iso]={clicked,times:[...new Set(times)]};
  }
  return output;
}

const summary=[];
for(const target of targets){
  const page=await context.newPage(); page._auditSlug=target.slug;
  const network=[]; const interactions=[];
  page.on('response',async r=>{
    const req=r.request(); const ct=r.headers()['content-type']||''; const rt=req.resourceType();
    if(!(rt==='xhr'||rt==='fetch'||ct.includes('json')||/tour|schedule|appointment|availab|calendar|slot|knock|knck|hy\.ly|hyly|rentcafe|securecafe|prospectportal|realpage|entrata|resman|funnel/i.test(r.url())))return;
    const rec={url:r.url(),status:r.status(),method:req.method(),resourceType:rt,contentType:ct,postData:req.postData()};
    try{rec.body=(await r.text()).slice(0,1000000);}catch(e){rec.bodyError=String(e)}
    network.push(rec); if(network.length>1500)network.shift();
  });
  const item={name:target.name,slug:target.slug,startUrl:target.url,status:'unknown',states:[],dateTimes:null,error:null};
  try{
    const resp=await page.goto(target.url,{waitUntil:'domcontentloaded',timeout:90000}); item.httpStatus=resp?.status()??null;
    await page.waitForTimeout(12000); await dismissOverlays(page,interactions); await page.waitForTimeout(2000);
    item.states.push((await snapshot(page,'01-initial',network,interactions)).url);

    await clickVisibleByPatterns(page,[/schedule a tour/i,/book a tour/i,/schedule tour/i,/tour now/i,/request a tour/i],interactions);
    await page.waitForTimeout(5000); await dismissOverlays(page,interactions);
    item.states.push((await snapshot(page,'02-after-entry',network,interactions)).url);

    for(let step=0;step<6;step++){
      const body=(await page.locator('body').innerText().catch(()=>''));
      if(/first name|last name|email address|phone number|contact information/i.test(body)){
        const filled=await fillVisibleContactFields(page,interactions);
        if(filled) await snapshot(page,`contact-gate-${step}`,network,interactions);
      }
      let moved=false;
      moved=await clickVisibleByPatterns(page,[/guided tour/i,/in.?person/i,/live video/i,/virtual tour/i,/self.?guided/i],interactions) || moved;
      if(!moved) moved=await clickVisibleByPatterns(page,[/^continue$/i,/^next$/i,/get started/i,/choose date/i,/select date/i,/see available times/i],interactions);
      if(!moved) break;
      await dismissOverlays(page,interactions);
      await snapshot(page,`step-${step+1}`,network,interactions);
    }
    item.dateTimes=await collectTimesForDates(page,interactions);
    await snapshot(page,'99-final',network,interactions);
    item.status='ok'; item.finalUrl=page.url(); item.interactions=interactions;
  }catch(e){ item.status='error'; item.error=String(e); await snapshot(page,'error',network,interactions).catch(()=>{}); }
  const dir=path.join(OUT,target.slug); await fs.mkdir(dir,{recursive:true});
  await fs.writeFile(path.join(dir,'network.json'),JSON.stringify(network,null,2));
  await fs.writeFile(path.join(dir,'result.json'),JSON.stringify(item,null,2));
  summary.push(item); console.log(JSON.stringify(item,null,2));
  await page.close().catch(()=>{});
}
await fs.writeFile(path.join(OUT,'summary.json'),JSON.stringify(summary,null,2));
await browser.close(); server.close();
