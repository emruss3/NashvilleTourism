import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import http from 'node:http';

const outDir='tour-knock-output';
await fs.mkdir(outDir,{recursive:true});
const propertyUrl='https://doorway-api.knockrentals.com/v1/property/community/3703f4711f108736';
const direct={};
try{
  const r=await fetch(propertyUrl,{headers:{Accept:'application/json','User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(30000)});
  const text=await r.text(); let body=text; try{body=JSON.parse(text)}catch{}
  direct.property={status:r.status,headers:Object.fromEntries(r.headers),body};
}catch(e){direct.property={error:String(e)}}
await fs.writeFile(`${outDir}/direct.json`,JSON.stringify(direct,null,2));

const html=`<!doctype html><html><head><meta charset="utf-8"><title>445 Park Commons</title></head><body><h1>445 Park Commons</h1><div id="exampleContainerId"></div><script src="https://doorway.knck.io/latest/doorway.min.js"></script><script>try{window.knockDoorway.init('b1e62194842811eaa6600e8ff32f9bc5','community','3703f4711f108736',{embedding:{page:'schedule',container:'exampleContainerId',showChatbot:true},deferInjection:true});window.knockDoorway.inject();}catch(e){document.body.insertAdjacentHTML('beforeend','<pre id="err">'+e.stack+'</pre>')}</script></body></html>`;
const server=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html'});res.end(html)});
await new Promise(r=>server.listen(3220,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-blink-features=AutomationControlled']});
const context=await browser.newContext({viewport:{width:1440,height:1200},locale:'en-US',timezoneId:'America/Chicago',userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'});
const page=await context.newPage();
const network=[];const logs=[];
page.on('console',m=>logs.push({type:m.type(),text:m.text()}));
page.on('pageerror',e=>logs.push({type:'pageerror',text:String(e)}));
page.on('response',async r=>{
 const req=r.request(),ct=r.headers()['content-type']||'';
 if(req.resourceType()==='xhr'||req.resourceType()==='fetch'||ct.includes('json')||/knock|knck|tour|schedule|appoint|avail|calendar|slot/i.test(r.url())){
  const x={url:r.url(),status:r.status(),method:req.method(),resourceType:req.resourceType(),postData:req.postData(),contentType:ct};
  try{x.body=(await r.text()).slice(0,2000000)}catch(e){x.error=String(e)}
  network.push(x);
 }
});
await page.goto('http://127.0.0.1:3220/',{waitUntil:'domcontentloaded',timeout:90000});
await page.waitForTimeout(25000);
async function snap(label){
 const data={label,url:page.url(),title:await page.title(),text:(await page.locator('body').innerText().catch(()=>'')),html:await page.content(),frames:[]};
 for(const f of page.frames()){
  let text='';let interactive=[];
  try{text=await f.locator('body').innerText({timeout:3000})}catch{}
  try{interactive=await f.locator('a,button,input,select,option,label,[role="button"],[role="option"],[tabindex],[data-date]').evaluateAll(els=>els.filter(e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width&&r.height&&s.display!=='none'&&s.visibility!=='hidden'}).map(e=>({tag:e.tagName,text:(e.innerText||e.textContent||'').trim().replace(/\s+/g,' '),aria:e.getAttribute('aria-label'),title:e.getAttribute('title'),type:e.getAttribute('type'),value:e.value||e.getAttribute('value'),href:e.href||e.getAttribute('href'),disabled:!!e.disabled,className:e.className,id:e.id,name:e.getAttribute('name'),date:e.getAttribute('data-date')})))}catch(e){interactive=[{error:String(e)}]}
  data.frames.push({url:f.url(),text,interactive});
 }
 await fs.writeFile(`${outDir}/${label}.json`,JSON.stringify(data,null,2));
 await page.screenshot({path:`${outDir}/${label}.png`,fullPage:true}).catch(()=>{});
}
await snap('initial');
// Attempt the obvious first-step controls, but never submit/confirm.
const patterns=[/schedule a tour/i,/guided tour/i,/in.?person/i,/self.?guided/i,/video tour/i,/virtual tour/i,/next/i,/continue/i];
for(let step=0;step<6;step++){
 let clicked=false;
 for(const f of page.frames()){
  for(const p of patterns){
   for(const role of ['button','link']){
    const l=f.getByRole(role,{name:p});const n=await l.count().catch(()=>0);
    for(let i=0;i<Math.min(n,5);i++){
     try{const el=l.nth(i);if(!await el.isVisible({timeout:200})||await el.isDisabled().catch(()=>false))continue;const t=await el.innerText().catch(()=>p.toString());if(/book|confirm|submit/i.test(t))continue;await el.click({timeout:4000});logs.push({type:'click',text:t,pattern:String(p),frame:f.url()});await page.waitForTimeout(1800);clicked=true;break}catch{}
    }
    if(clicked)break;
   }
   if(clicked)break;
  }
  if(clicked)break;
 }
 if(!clicked)break;
 await snap(`step-${step+1}`);
}
await snap('final');
await fs.writeFile(`${outDir}/network.json`,JSON.stringify(network,null,2));
await fs.writeFile(`${outDir}/logs.json`,JSON.stringify(logs,null,2));
console.log(JSON.stringify({directStatus:direct.property?.status,directError:direct.property?.error,networkCount:network.length,logs,url:page.url()},null,2));
await browser.close();server.close();
