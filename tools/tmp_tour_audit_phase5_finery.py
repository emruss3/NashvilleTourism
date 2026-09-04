import asyncio
import json
import re
import traceback
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path('tour_audit_output')
OUT.mkdir(exist_ok=True)
WINDOW = [
    ('2026-09-04','Friday',4),('2026-09-05','Saturday',5),('2026-09-06','Sunday',6),
    ('2026-09-07','Monday',7),('2026-09-08','Tuesday',8),('2026-09-09','Wednesday',9),('2026-09-10','Thursday',10),
]
TIME_RE = re.compile(r'(?<!\d)(?:1[0-2]|[1-9]):[0-5]\d\s*(?:a\.?m\.?|p\.?m\.?)', re.I)

def times(text):
    seen=set(); out=[]
    for m in TIME_RE.finditer(text or ''):
        x=m.group(0).replace('.','').lower().strip()
        if x not in seen: seen.add(x); out.append(x)
    return out

async def find_frame(page, token):
    for frame in page.frames:
        if token.lower() in frame.url.lower(): return frame
    return None

async def main():
    result={'slug':'the-finery','platform':'Hyly','tour_types':['In-Person Tour'],'availability':{},'network':[]}
    tasks=[]
    async with async_playwright() as p:
        try:
            browser=await p.chromium.launch(channel='chrome',headless=False,args=['--no-sandbox','--disable-dev-shm-usage'])
        except Exception:
            browser=await p.chromium.launch(headless=False,args=['--no-sandbox','--disable-dev-shm-usage'])
        context=await browser.new_context(viewport={'width':1440,'height':1000},timezone_id='America/Chicago',locale='en-US')
        page=await context.new_page()
        def req(r):
            if r.resource_type in {'xhr','fetch'}: result['network'].append({'kind':'request','method':r.method,'url':r.url,'post_data':r.post_data})
        async def resp(r):
            if r.request.resource_type not in {'xhr','fetch'}: return
            e={'kind':'response','status':r.status,'url':r.url}
            if any(t in r.url.lower() for t in ['schedule','slot','avail','tour']):
                try:
                    body=await r.text(); e['body']=body[:500000]
                except Exception as ex: e['body_error']=repr(ex)
            result['network'].append(e)
        page.on('request',req)
        page.on('response',lambda r: tasks.append(asyncio.create_task(resp(r))))
        try:
            await page.goto('https://www.livethefinery.com/',wait_until='domcontentloaded',timeout=90000)
            await page.wait_for_timeout(7000)
            await page.evaluate("""() => document.querySelectorAll('#popup-overlay,.popup-transparent-overlay,.pum-overlay.pum-active,.cky-consent-container,.ot-sdk-container').forEach(e=>e.remove())""")
            await page.locator('a.hytour-link').first.click(force=True,timeout=10000)
            await page.wait_for_timeout(5000)
            chooser=await find_frame(page,'my.hy.ly/tours/livethefinery/site')
            if not chooser: raise RuntimeError('chooser frame missing')
            link=chooser.locator("a[href*='tourpopup=in-person']")
            if not await link.count(): link=chooser.get_by_text(re.compile('in-person tour',re.I)).first
            await link.click(force=True,timeout=10000)
            await page.wait_for_timeout(6000)
            frame=await find_frame(page,'my.hy.ly/tours/schedules/')
            if not frame: raise RuntimeError('schedule frame missing')
            result['schedule_url']=frame.url
            result['initial_text']=(await frame.locator('body').inner_text())[:100000]
            for iso,weekday,day in WINDOW:
                info={'weekday':weekday,'times':[]}
                click_result=await frame.evaluate("""day => {
                  const cells=[...document.querySelectorAll('td.day')];
                  const match=cells.find(e => e.textContent.trim()===String(day) && !e.classList.contains('old') && !e.classList.contains('new') && e.offsetParent!==null && getComputedStyle(e).visibility!=='hidden');
                  if(!match) return {found:false, candidates:cells.filter(e=>e.textContent.trim()===String(day)).map(e=>({cls:e.className,visible:e.offsetParent!==null}))};
                  const r=match.getBoundingClientRect();
                  const disabled=match.classList.contains('disabled');
                  if(!disabled){ match.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window})); }
                  return {found:true,disabled,cls:match.className,rect:{x:r.x,y:r.y,w:r.width,h:r.height}};
                }""",day)
                info['date_control']=click_result
                if click_result.get('found') and not click_result.get('disabled'):
                    await frame.wait_for_timeout(1800)
                    visible_texts=await frame.locator('a,button,label,li,span,div').evaluate_all("""els => els.filter(e=>e.offsetParent!==null && getComputedStyle(e).visibility!=='hidden').map(e=>(e.innerText||e.textContent||'').trim()).filter(Boolean)""")
                    vals=[]
                    for text in visible_texts: vals.extend(times(text))
                    # Prefer text from visibly actionable controls when available.
                    actionable=await frame.locator('a,button,label,[role=button],[role=radio]').evaluate_all("""els => els.filter(e=>e.offsetParent!==null && getComputedStyle(e).visibility!=='hidden').map(e=>(e.innerText||e.textContent||e.value||e.getAttribute('aria-label')||'').trim()).filter(Boolean)""")
                    action_vals=[]
                    for text in actionable: action_vals.extend(times(text))
                    info['times']=list(dict.fromkeys(action_vals or vals))
                    info['visible_actionable_text']=actionable[:500]
                    info['body_text']=(await frame.locator('body').inner_text())[:100000]
                result['availability'][iso]=info
            await page.screenshot(path=str(OUT/'phase5-the-finery.png'),full_page=True)
        except Exception as exc:
            result['error']=repr(exc); result['traceback']=traceback.format_exc()
        if tasks: await asyncio.gather(*tasks,return_exceptions=True)
        await context.close(); await browser.close()
    (OUT/'phase5-the-finery.json').write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8')
    print(json.dumps({'error':result.get('error'),'schedule_url':result.get('schedule_url'),'availability':{d:v.get('times',[]) for d,v in result.get('availability',{}).items()}},indent=2),flush=True)

if __name__=='__main__': asyncio.run(main())
