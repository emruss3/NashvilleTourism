import asyncio
import json
import re
import traceback
from pathlib import Path
from typing import Any

from playwright.async_api import async_playwright

OUT = Path("tour_audit_output")
OUT.mkdir(exist_ok=True)

WINDOW = [
    ("2026-09-04", "Friday", 4),
    ("2026-09-05", "Saturday", 5),
    ("2026-09-06", "Sunday", 6),
    ("2026-09-07", "Monday", 7),
    ("2026-09-08", "Tuesday", 8),
    ("2026-09-09", "Wednesday", 9),
    ("2026-09-10", "Thursday", 10),
]

TIME_RE = re.compile(r"(?<!\d)(?:1[0-2]|[1-9]):[0-5]\d\s*(?:a\.?m\.?|p\.?m\.?)", re.I)
TOUR_RE = re.compile(r"guided|in[ -]?person|video|virtual|self[ -]?guided", re.I)


def uniq(values):
    seen = set()
    out = []
    for value in values:
        value = str(value).strip().replace(".", "").lower()
        if value and value not in seen:
            seen.add(value)
            out.append(value)
    return out


def times(text):
    return uniq(m.group(0) for m in TIME_RE.finditer(text or ""))


async def new_context(browser):
    context = await browser.new_context(
        viewport={"width": 1440, "height": 1100},
        timezone_id="America/Chicago",
        locale="en-US",
        color_scheme="light",
    )
    await context.add_init_script("""
      Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
      Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']});
      Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
      window.chrome = window.chrome || {runtime: {}};
    """)
    return context


async def visible(frame, selector="button, a, input, select, textarea, [role='button'], [role='option'], [role='radio'], label, [aria-label]"):
    try:
        return await frame.locator(selector).evaluate_all("""els => els.slice(0,2000).map(e => {
          const r=e.getBoundingClientRect(), s=getComputedStyle(e);
          return {
            tag:e.tagName,
            text:(e.innerText||e.textContent||e.value||e.getAttribute('aria-label')||'').trim().replace(/\\s+/g,' ').slice(0,700),
            aria:e.getAttribute('aria-label'), title:e.getAttribute('title'), href:e.href||null,
            type:e.getAttribute('type'), name:e.getAttribute('name'), value:e.value||e.getAttribute('value'),
            id:e.id||null, cls:(e.className&&String(e.className).slice(0,700))||null,
            disabled:!!e.disabled||e.getAttribute('aria-disabled')==='true',
            checked:!!e.checked||e.getAttribute('aria-checked'),
            visible:!!(r.width||r.height)&&s.visibility!=='hidden'&&s.display!=='none'&&Number(s.opacity||1)!==0,
            rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}
          }
        }).filter(x=>x.visible)""")
    except Exception as exc:
        return [{"error": repr(exc)}]


async def snap(page, name):
    data = {"page_url": page.url, "frames": []}
    try:
        await page.screenshot(path=str(OUT / f"{name}.png"), full_page=True, timeout=30000)
        data["screenshot"] = f"{name}.png"
    except Exception as exc:
        data["screenshot_error"] = repr(exc)
    for i, frame in enumerate(page.frames):
        item = {"index": i, "url": frame.url, "name": frame.name}
        try:
            item["text"] = (await frame.locator("body").inner_text(timeout=5000))[:200000]
        except Exception as exc:
            item["text_error"] = repr(exc)
        item["elements"] = await visible(frame)
        try:
            item["html"] = (await frame.content())[:600000]
        except Exception as exc:
            item["html_error"] = repr(exc)
        data["frames"].append(item)
    (OUT / f"{name}-snapshot.json").write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return data


async def dismiss(page):
    for pat in [r"accept all cookies", r"accept cookies", r"^accept$", r"no thanks", r"^close$", r"^dismiss$"]:
        for role in ["button", "link"]:
            try:
                loc = page.get_by_role(role, name=re.compile(pat, re.I))
                for i in range(min(await loc.count(), 10)):
                    if await loc.nth(i).is_visible():
                        try:
                            await loc.nth(i).click(force=True, timeout=2000)
                            await page.wait_for_timeout(300)
                        except Exception:
                            pass
            except Exception:
                pass


async def network_capture(page, log):
    tasks = []
    def req(r):
        if r.resource_type in {"xhr", "fetch", "document"}:
            log.append({"kind":"request","method":r.method,"url":r.url,"post_data":r.post_data,"resource_type":r.resource_type})
    async def resp(r):
        try:
            if r.request.resource_type not in {"xhr", "fetch", "document"}:
                return
            entry = {"kind":"response","status":r.status,"url":r.url,"resource_type":r.request.resource_type}
            if any(x in r.url.lower() for x in ["tour","schedul","appoint","availab","slot","hy.ly","nestio","rentcafe"]):
                try:
                    body = await r.text()
                    entry["body"] = body[:1000000]
                    entry["body_truncated"] = len(body)>1000000
                except Exception as exc:
                    entry["body_error"] = repr(exc)
            log.append(entry)
        except Exception as exc:
            log.append({"kind":"response_error","error":repr(exc)})
    page.on("request", req)
    page.on("response", lambda r: tasks.append(asyncio.create_task(resp(r))))
    return tasks


async def find_frame(page, url_part=None, text_re=None):
    for frame in page.frames:
        if url_part and url_part.lower() in frame.url.lower():
            return frame
        if text_re:
            try:
                if text_re.search(await frame.locator("body").inner_text(timeout=2000)):
                    return frame
            except Exception:
                pass
    return None


async def nestio_options(frame):
    await frame.locator(".pam__SelectValue__value").first.click(force=True, timeout=10000)
    await frame.wait_for_timeout(500)
    items = await visible(frame, "[class*='Select'], [class*='select'], [role='option'], li, button, div")
    labels = []
    for item in items:
        text = (item.get("text") or "").strip()
        cls = (item.get("cls") or "").lower()
        if TOUR_RE.search(text) and len(text.split()) <= 6 and ("option" in cls or "label" in cls):
            labels.append(text)
    # Prefer the concise labels from the widget.
    concise = [x for x in uniq(labels) if len(x.split()) <= 3]
    return concise or uniq(labels)


async def click_nestio_option(frame, label):
    loc = frame.get_by_text(label, exact=True)
    for i in range(min(await loc.count(), 20)):
        if await loc.nth(i).is_visible():
            await loc.nth(i).click(force=True, timeout=5000)
            await frame.wait_for_timeout(800)
            return True
    return False


async def select_nestio_day(frame, weekday, day):
    inp = frame.locator("input.pam__InputValue__label").first
    await inp.click(force=True, timeout=5000)
    await frame.wait_for_timeout(300)
    # Prefer datepicker cells with exact day text, excluding adjacent months/disabled cells.
    cells = frame.locator(".react-datepicker__day, [class*='datepicker'][class*='day']")
    for i in range(min(await cells.count(), 200)):
        el = cells.nth(i)
        try:
            if not await el.is_visible():
                continue
            txt = (await el.inner_text()).strip()
            cls = (await el.get_attribute("class") or "").lower()
            if txt == str(day) and "outside-month" not in cls:
                if "disabled" in cls:
                    return False, f"disabled {weekday} {day}"
                await el.click(force=True, timeout=5000)
                await frame.wait_for_timeout(900)
                return True, f"text day {day}"
        except Exception:
            pass
    return False, "day not found"


async def nestio_times(frame):
    sels = frame.locator(".pam__SelectValue__value")
    if await sels.count() < 2:
        return []
    sel = sels.nth((await sels.count()) - 1)
    if "disabled" in ((await sel.get_attribute("class")) or "").lower():
        return []
    await sel.click(force=True, timeout=5000)
    await frame.wait_for_timeout(350)
    text = await frame.locator("body").inner_text()
    vals = times(text)
    try: await frame.locator("body").press("Escape")
    except Exception: pass
    return vals


async def audit_standard(browser):
    url = "https://thestandardassembly.com/schedule-a-tour/"
    result = {"slug":"standard-assembly","url":url,"platform":"Nestio/Funnel","types":[],"availability":{},"runs":[]}
    # Enumerate types.
    context = await new_context(browser); page = await context.new_page(); net=[]; tasks=await network_capture(page,net)
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=90000); await page.wait_for_timeout(6000); await dismiss(page)
        frame = await find_frame(page, url_part="integrations.nestio.com/contact-widget")
        result["types"] = await nestio_options(frame) if frame else []
        result["initial_snapshot"] = await snap(page,"phase3-standard-options")
    finally:
        if tasks: await asyncio.gather(*tasks, return_exceptions=True)
        result["runs"].append({"stage":"types","network":net}); await context.close()
    for tour_type in result["types"]:
        context = await new_context(browser); page = await context.new_page(); net=[]; tasks=await network_capture(page,net)
        run={"tour_type":tour_type,"dates":{},"network":net}
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=90000); await page.wait_for_timeout(5000)
            frame=await find_frame(page,url_part="integrations.nestio.com/contact-widget")
            opts=await nestio_options(frame); label=next((x for x in opts if x.lower()==tour_type.lower()),tour_type)
            run["selected"]=await click_nestio_option(frame,label)
            for iso,weekday,day in WINDOW:
                ok,ev=await select_nestio_day(frame,weekday,day)
                vals=await nestio_times(frame) if ok else []
                run["dates"][iso]={"weekday":weekday,"date_click":ok,"date_evidence":ev,"times":vals}
            run["snapshot"]=await snap(page,f"phase3-standard-{re.sub('[^a-z0-9]+','-',tour_type.lower()).strip('-')}")
        except Exception as exc:
            run["error"]=repr(exc); run["traceback"]=traceback.format_exc()
        finally:
            if tasks: await asyncio.gather(*tasks,return_exceptions=True)
            await context.close()
        result["runs"].append(run); result["availability"][tour_type]=run.get("dates",{})
    return result


async def audit_rentcafe(browser, slug, url):
    result={"slug":slug,"url":url,"platform":"RentCafe","tour_types":["Guided Tour"],"availability":{},"network":[]}
    context=await new_context(browser); page=await context.new_page(); tasks=await network_capture(page,result["network"])
    try:
        await page.goto(url,wait_until="domcontentloaded",timeout=90000); await page.wait_for_timeout(10000); await dismiss(page); await page.wait_for_timeout(2000)
        result["final_url"]=page.url
        result["initial_snapshot"]=await snap(page,f"phase3-{slug}-initial")
        result["tentative_text"]="tentative" in (await page.locator("body").inner_text()).lower()
        for idx,(iso,weekday,day) in enumerate(WINDOW,1):
            info={"weekday":weekday,"times":[]}
            inp=page.locator(f"#radiodate{idx}")
            if await inp.count()==0:
                info["error"]="radio missing"; result["availability"][iso]=info; continue
            disabled=await inp.is_disabled() or await inp.get_attribute("disabled") is not None
            info["date_enabled"]=not disabled
            if disabled:
                result["availability"][iso]=info; continue
            label=page.locator(f'label[for="radiodate{idx}"]')
            try:
                async with page.expect_response(lambda r: "handler=GetAvailableSlots" in r.url, timeout=30000) as ri:
                    if await label.count(): await label.click(force=True)
                    else: await inp.click(force=True)
                resp=await ri.value
                info["response_status"]=resp.status
                try:
                    body=await resp.text(); info["response_body"]=body[:500000]
                except Exception as exc:
                    body=""; info["response_error"]=repr(exc)
            except Exception as exc:
                info["expect_response_error"]=repr(exc); body=""
            await page.wait_for_timeout(2500)
            section=page.locator("#schedule-tour-onsite")
            section_text=await section.inner_text() if await section.count() else ""
            info["section_text"]=section_text[:100000]
            info["times"]=times(body+"\n"+section_text)
            info["section_elements"]=await visible(page,"#schedule-tour-onsite button, #schedule-tour-onsite label, #schedule-tour-onsite input, #schedule-tour-onsite [role='radio'], #schedule-tour-onsite [aria-label]")
            result["availability"][iso]=info
        result["final_snapshot"]=await snap(page,f"phase3-{slug}-final")
    except Exception as exc:
        result["error"]=repr(exc); result["traceback"]=traceback.format_exc()
    finally:
        if tasks: await asyncio.gather(*tasks,return_exceptions=True)
        await context.close()
    return result


async def audit_finery(browser):
    result={"slug":"the-finery","url":"https://www.livethefinery.com/","platform":"Hyly","network":[],"availability":{}}
    context=await new_context(browser); page=await context.new_page(); tasks=await network_capture(page,result["network"])
    try:
        await page.goto(result["url"],wait_until="domcontentloaded",timeout=90000); await page.wait_for_timeout(8000); await dismiss(page)
        await page.evaluate("""() => { document.querySelectorAll('#popup-overlay,.popup-transparent-overlay,.pum-overlay.pum-active').forEach(e=>e.remove()) }""")
        link=page.locator("a.hytour-link").first
        await link.click(force=True,timeout=10000); await page.wait_for_timeout(7000)
        frame=await find_frame(page,url_part="my.hy.ly/tours/livethefinery/site")
        result["chooser_frame_url"]=frame.url if frame else None
        result["chooser_text"]=(await frame.locator("body").inner_text())[:100000] if frame else ""
        result["chooser_elements"]=await visible(frame) if frame else []
        if frame:
            ip=frame.get_by_role("link",name=re.compile(r"in-person tour",re.I))
            if await ip.count(): await ip.first.click(force=True,timeout=10000)
            else: await frame.get_by_text(re.compile(r"in-person tour",re.I)).first.click(force=True,timeout=10000)
        await page.wait_for_timeout(9000)
        result["after_click_snapshot"]=await snap(page,"phase3-the-finery-after-inperson")
        target=await find_frame(page,url_part="my.hy.ly/tours/livethefinery")
        if target:
            result["target_url"]=target.url
            result["target_text"]=(await target.locator("body").inner_text())[:200000]
            result["target_elements"]=await visible(target)
            # Try each date through visible controls; record whatever the widget exposes.
            for iso,weekday,day in WINDOW:
                info={"weekday":weekday,"times":[]}
                candidates=[]
                for selector in ["button","a","label","[role='button']","[role='radio']","[aria-label]"]:
                    loc=target.locator(selector)
                    for i in range(min(await loc.count(),500)):
                        el=loc.nth(i)
                        try:
                            if not await el.is_visible(): continue
                            text=((await el.inner_text()) or "").strip().replace("\n"," ")
                            aria=(await el.get_attribute("aria-label") or "")
                            title=(await el.get_attribute("title") or "")
                            blob=" ".join([text,aria,title])
                            if re.search(rf"(?:{weekday}|sep(?:tember)?)[^\d]{{0,20}}0?{day}(?!\d)|\b0?{day}\b[^\d]{{0,20}}(?:{weekday}|sep(?:tember)?)",blob,re.I):
                                candidates.append((el,blob[:500]))
                        except Exception: pass
                info["date_candidates"]=[x[1] for x in candidates[:20]]
                clicked=False
                for el,blob in candidates:
                    try:
                        await el.click(force=True,timeout=3000); clicked=True; info["clicked_candidate"]=blob; break
                    except Exception: pass
                info["date_clicked"]=clicked
                if clicked:
                    await page.wait_for_timeout(1800)
                    try: current=(await target.locator("body").inner_text())
                    except Exception: current=""
                    info["times"]=times(current)
                    info["text_after_click"]=current[:100000]
                result["availability"][iso]=info
        result["final_snapshot"]=await snap(page,"phase3-the-finery-final")
    except Exception as exc:
        result["error"]=repr(exc); result["traceback"]=traceback.format_exc()
    finally:
        if tasks: await asyncio.gather(*tasks,return_exceptions=True)
        await context.close()
    return result


async def main():
    results={}
    async with async_playwright() as p:
        try:
            browser=await p.chromium.launch(channel="chrome",headless=False,args=["--disable-blink-features=AutomationControlled","--no-sandbox","--disable-dev-shm-usage"])
        except Exception:
            browser=await p.chromium.launch(headless=False,args=["--disable-blink-features=AutomationControlled","--no-sandbox","--disable-dev-shm-usage"])

        print("=== STANDARD ===",flush=True)
        results["standard-assembly"]=await audit_standard(browser)
        print(json.dumps({"standard":{t:{d:len(v.get('times',[])) for d,v in dates.items()} for t,dates in results['standard-assembly'].get('availability',{}).items()}},indent=2),flush=True)

        for slug,url in [
            ("memoir-wedgewood-houston","https://www.memoir-wedgewoodhouston.com/scheduletour"),
            ("memoir-may-hosiery","https://www.memoir-mayhosiery.com/scheduletour"),
        ]:
            print(f"=== {slug} ===",flush=True)
            results[slug]=await audit_rentcafe(browser,slug,url)
            print(json.dumps({slug:{d:{"status":v.get('response_status'),"n":len(v.get('times',[]))} for d,v in results[slug].get('availability',{}).items()}},indent=2),flush=True)

        print("=== FINERY ===",flush=True)
        results["the-finery"]=await audit_finery(browser)
        print(json.dumps({"finery":{"target":results['the-finery'].get('target_url'),"availability":{d:len(v.get('times',[])) for d,v in results['the-finery'].get('availability',{}).items()},"error":results['the-finery'].get('error')}},indent=2),flush=True)

        await browser.close()

    for slug,data in results.items():
        (OUT/f"phase3-{slug}.json").write_text(json.dumps(data,indent=2,ensure_ascii=False),encoding="utf-8")
    (OUT/"phase3-all-results.json").write_text(json.dumps(results,indent=2,ensure_ascii=False),encoding="utf-8")

if __name__=="__main__":
    asyncio.run(main())
