import asyncio
import json
import re
import time
import traceback
from pathlib import Path
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from curl_cffi import requests as curl_requests
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


def unique(values):
    out, seen = [], set()
    for value in values:
        value = re.sub(r"\s+", " ", str(value)).strip().replace(".", "").lower()
        if value and value not in seen:
            seen.add(value)
            out.append(value)
    return out


def times_from_text(text):
    return unique(m.group(0) for m in TIME_RE.finditer(text or ""))


async def context_for(browser):
    return await browser.new_context(
        viewport={"width": 1440, "height": 1000},
        timezone_id="America/Chicago",
        locale="en-US",
        color_scheme="light",
        ignore_https_errors=True,
    )


async def find_frame(page, url_token):
    for frame in page.frames:
        if url_token.lower() in frame.url.lower():
            return frame
    return None


async def choose_nestio_type(frame, target):
    select = frame.locator(".pam__SelectValue__value").first
    await select.click(force=True, timeout=10000)
    await frame.wait_for_timeout(300)
    candidates = frame.locator(".pam__SingleSelectOption__option, [role='option']")
    for i in range(await candidates.count()):
        el = candidates.nth(i)
        try:
            text = (await el.inner_text()).strip()
            if text.lower() == target.lower() and await el.is_visible():
                await el.click(force=True, timeout=5000)
                await frame.wait_for_timeout(600)
                return True, text
        except Exception:
            pass
    # Exact text fallback.
    loc = frame.get_by_text(target, exact=True)
    for i in range(await loc.count()):
        if await loc.nth(i).is_visible():
            await loc.nth(i).click(force=True, timeout=5000)
            await frame.wait_for_timeout(600)
            return True, target
    return False, None


async def choose_nestio_day(frame, day):
    await frame.locator("input.pam__InputValue__label").first.click(force=True, timeout=5000)
    await frame.wait_for_timeout(250)
    cells = frame.locator(".react-datepicker__day")
    for i in range(await cells.count()):
        cell = cells.nth(i)
        try:
            if not await cell.is_visible():
                continue
            text = (await cell.inner_text()).strip()
            cls = (await cell.get_attribute("class") or "").lower()
            if text == str(day) and "outside-month" not in cls:
                if "disabled" in cls:
                    try:
                        await frame.locator("body").press("Escape")
                    except Exception:
                        pass
                    return False, cls
                await cell.click(force=True, timeout=5000)
                await frame.wait_for_timeout(800)
                return True, cls
        except Exception:
            pass
    return False, "not found"


async def get_nestio_times(frame):
    selects = frame.locator(".pam__SelectValue__value")
    if await selects.count() < 2:
        return [], "time selector missing"
    sel = selects.nth((await selects.count()) - 1)
    cls = (await sel.get_attribute("class") or "").lower()
    if "disabled" in cls:
        return [], "time selector disabled"
    try:
        await sel.click(force=True, timeout=5000)
        await frame.wait_for_timeout(350)
    except Exception as exc:
        return [], repr(exc)
    options = frame.locator(".pam__SingleSelectOption__option, [role='option']")
    values = []
    for i in range(await options.count()):
        el = options.nth(i)
        try:
            if await el.is_visible():
                values.extend(times_from_text(await el.inner_text()))
        except Exception:
            pass
    try:
        await frame.locator("body").press("Escape")
    except Exception:
        pass
    return unique(values), None


async def audit_standard(browser):
    url = "https://thestandardassembly.com/schedule-a-tour/"
    result = {
        "slug": "standard-assembly",
        "url": url,
        "platform": "Funnel/Nestio",
        "tour_types": ["In Person", "Live Video"],
        "availability": {},
    }
    for tour_type in result["tour_types"]:
        context = await context_for(browser)
        page = await context.new_page()
        day_map = {}
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=90000)
            await page.wait_for_timeout(6000)
            frame = await find_frame(page, "integrations.nestio.com/contact-widget")
            if not frame:
                raise RuntimeError("Nestio frame not found")
            ok, selected = await choose_nestio_type(frame, tour_type)
            if not ok:
                raise RuntimeError(f"Could not select {tour_type}")
            for iso, weekday, day in WINDOW:
                clicked, evidence = await choose_nestio_day(frame, day)
                vals, time_error = await get_nestio_times(frame) if clicked else ([], None)
                day_map[iso] = {
                    "weekday": weekday,
                    "date_click": clicked,
                    "date_evidence": evidence,
                    "times": vals,
                    "time_error": time_error,
                }
            await page.screenshot(path=str(OUT / f"phase4-standard-{tour_type.lower().replace(' ', '-')}.png"), full_page=True)
        except Exception as exc:
            day_map["error"] = {"message": repr(exc), "traceback": traceback.format_exc()}
        finally:
            await context.close()
        result["availability"][tour_type] = day_map
    return result


async def open_finery_scheduler(page):
    await page.goto("https://www.livethefinery.com/", wait_until="domcontentloaded", timeout=90000)
    await page.wait_for_timeout(7000)
    await page.evaluate("""() => {
      document.querySelectorAll('#popup-overlay,.popup-transparent-overlay,.pum-overlay.pum-active').forEach(e => e.remove());
      document.querySelectorAll('.cky-consent-container,.ot-sdk-container').forEach(e => { if (e.offsetParent) e.remove(); });
    }""")
    link = page.locator("a.hytour-link").first
    await link.click(force=True, timeout=10000)
    await page.wait_for_timeout(5000)
    chooser = await find_frame(page, "my.hy.ly/tours/livethefinery/site")
    if not chooser:
        raise RuntimeError("Hyly chooser not found")
    ip = chooser.locator("a[href*='tourpopup=in-person']")
    if not await ip.count():
        ip = chooser.get_by_text(re.compile(r"in-person tour", re.I)).first
    await ip.click(force=True, timeout=10000)
    await page.wait_for_timeout(6500)
    scheduler = await find_frame(page, "my.hy.ly/tours/schedules/")
    if not scheduler:
        raise RuntimeError("Hyly schedule frame not found")
    return scheduler


async def audit_finery(browser):
    result = {
        "slug": "the-finery",
        "url": "https://www.livethefinery.com/",
        "platform": "Hyly",
        "tour_types": ["In-Person Tour"],
        "availability": {},
    }
    context = await context_for(browser)
    page = await context.new_page()
    try:
        scheduler = await open_finery_scheduler(page)
        result["schedule_url"] = scheduler.url
        cells = scheduler.locator("td.day")
        result["calendar_cells"] = []
        for i in range(await cells.count()):
            cell = cells.nth(i)
            try:
                result["calendar_cells"].append({
                    "text": (await cell.inner_text()).strip(),
                    "class": await cell.get_attribute("class"),
                    "visible": await cell.is_visible(),
                })
            except Exception:
                pass
        for iso, weekday, day in WINDOW:
            info = {"weekday": weekday, "times": []}
            candidates = scheduler.locator("td.day")
            chosen = None
            for i in range(await candidates.count()):
                cell = candidates.nth(i)
                try:
                    text = (await cell.inner_text()).strip()
                    cls = (await cell.get_attribute("class") or "").lower()
                    if text == str(day) and "old" not in cls and "new" not in cls:
                        chosen = cell
                        info["cell_class"] = cls
                        break
                except Exception:
                    pass
            if chosen is None:
                info["error"] = "calendar day not found"
            elif "disabled" in info.get("cell_class", ""):
                info["date_enabled"] = False
            else:
                info["date_enabled"] = True
                await chosen.click(force=True, timeout=5000)
                await scheduler.wait_for_timeout(1300)
                body = await scheduler.locator("body").inner_text()
                # Only visible time links from the current selection.
                time_links = scheduler.locator("a")
                vals = []
                for j in range(await time_links.count()):
                    el = time_links.nth(j)
                    try:
                        if await el.is_visible():
                            vals.extend(times_from_text(await el.inner_text()))
                    except Exception:
                        pass
                info["times"] = unique(vals)
                info["body_excerpt"] = body[:30000]
            result["availability"][iso] = info
        await page.screenshot(path=str(OUT / "phase4-the-finery.png"), full_page=True)
    except Exception as exc:
        result["error"] = repr(exc)
        result["traceback"] = traceback.format_exc()
    finally:
        await context.close()
    return result


def extract_antiforgery(html):
    soup = BeautifulSoup(html, "html.parser")
    node = soup.select_one("#scheduletour-request-verification-token")
    if node and node.get("value"):
        return node.get("value")
    node = soup.select_one('input[name="__RequestVerificationToken"]')
    return node.get("value") if node else None


def curlcffi_probe(base_url):
    result = {"method": "curl_cffi", "attempts": []}
    for impersonate in ["chrome", "chrome124", "safari17_0"]:
        sess = curl_requests.Session(impersonate=impersonate, timeout=45)
        attempt = {"impersonate": impersonate, "availability": {}}
        try:
            get = sess.get(base_url, allow_redirects=True)
            attempt["get_status"] = get.status_code
            attempt["get_url"] = get.url
            token = extract_antiforgery(get.text)
            attempt["token_found"] = bool(token)
            attempt["cookies"] = list(sess.cookies.get_dict().keys())
            for iso, weekday, day in WINDOW:
                human = f"{weekday}, September {day:02d}, 2026"
                headers = {
                    "Accept": "text/html, */*; q=0.01",
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Origin": get.url.split("/scheduletour")[0],
                    "Referer": get.url,
                    "X-Requested-With": "XMLHttpRequest",
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache",
                }
                if token:
                    headers["RequestVerificationToken"] = token
                payload = {"dtSchedule": human, "tourType": "0", "txtBedroom": "", "units": ""}
                post = sess.post(get.url.split("?")[0] + "?handler=GetAvailableSlots", data=payload, headers=headers, allow_redirects=True)
                text = post.text
                attempt["availability"][iso] = {
                    "weekday": weekday,
                    "status": post.status_code,
                    "url": post.url,
                    "times": times_from_text(text),
                    "body": text[:120000],
                }
                time.sleep(0.6)
        except Exception as exc:
            attempt["error"] = repr(exc)
            attempt["traceback"] = traceback.format_exc()
        result["attempts"].append(attempt)
        if any(v.get("status") == 200 and v.get("times") for v in attempt.get("availability", {}).values()):
            result["successful_impersonate"] = impersonate
            break
    return result


def selenium_uc_probe(base_url):
    result = {"method": "seleniumbase_uc", "availability": {}}
    driver = None
    try:
        from seleniumbase import Driver
        from selenium.webdriver.common.by import By
        driver = Driver(uc=True, headless=False, incognito=False)
        driver.uc_open_with_reconnect(base_url, reconnect_time=4)
        time.sleep(4)
        result["title"] = driver.title
        result["current_url"] = driver.current_url
        result["initial_source"] = driver.page_source[:250000]
        token = driver.execute_script("return document.getElementById('scheduletour-request-verification-token')?.value || document.querySelector('input[name=\"__RequestVerificationToken\"]')?.value || null")
        result["token_found"] = bool(token)
        for idx, (iso, weekday, day) in enumerate(WINDOW, 1):
            info = {"weekday": weekday, "times": []}
            try:
                radio = driver.find_elements(By.ID, f"radiodate{idx}")
                if not radio:
                    info["error"] = "date radio missing"
                    result["availability"][iso] = info
                    continue
                el = radio[0]
                info["date_enabled"] = el.is_enabled()
                if not el.is_enabled():
                    result["availability"][iso] = info
                    continue
                driver.execute_script("arguments[0].click()", el)
                time.sleep(4)
                slots = driver.find_elements(By.CSS_SELECTOR, ".availableslots_button")
                info["times"] = unique(s.text for s in slots if s.is_displayed())
                loader = driver.find_elements(By.CSS_SELECTOR, "#onsite-tour-timeslot-loader-container")
                info["loader_visible"] = any(x.is_displayed() for x in loader)
                info["section_text"] = driver.find_element(By.ID, "schedule-tour-onsite").text[:30000]
            except Exception as exc:
                info["error"] = repr(exc)
            result["availability"][iso] = info
        result["final_source"] = driver.page_source[:300000]
        driver.save_screenshot(str(OUT / ("phase4-" + re.sub(r"[^a-z0-9]+", "-", base_url.split("//",1)[1].split("/",1)[0].lower()) + ".png")))
    except Exception as exc:
        result["error"] = repr(exc)
        result["traceback"] = traceback.format_exc()
    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass
    return result


def audit_memoir(slug, url):
    result = {"slug": slug, "url": url, "platform": "RentCafe", "tour_types": ["Guided Tour"], "booking": "tentative/request"}
    result["curl_cffi"] = curlcffi_probe(url)
    curl_success = False
    for attempt in result["curl_cffi"].get("attempts", []):
        if any(v.get("status") == 200 and v.get("times") for v in attempt.get("availability", {}).values()):
            curl_success = True
            result["availability"] = attempt["availability"]
            result["source_method"] = "curl_cffi"
            break
    if not curl_success:
        result["selenium_uc"] = selenium_uc_probe(url)
        result["availability"] = result["selenium_uc"].get("availability", {})
        result["source_method"] = "seleniumbase_uc"
    return result


async def main():
    results = {}
    async with async_playwright() as p:
        try:
            browser = await p.chromium.launch(channel="chrome", headless=False, args=["--no-sandbox", "--disable-dev-shm-usage"])
        except Exception:
            browser = await p.chromium.launch(headless=False, args=["--no-sandbox", "--disable-dev-shm-usage"])
        print("=== STANDARD ===", flush=True)
        results["standard-assembly"] = await audit_standard(browser)
        print(json.dumps({t: {d: len(v.get("times", [])) for d, v in days.items() if d != "error"} for t, days in results["standard-assembly"]["availability"].items()}, indent=2), flush=True)
        print("=== FINERY ===", flush=True)
        results["the-finery"] = await audit_finery(browser)
        print(json.dumps({d: len(v.get("times", [])) for d, v in results["the-finery"].get("availability", {}).items()}, indent=2), flush=True)
        await browser.close()

    for slug, url in [
        ("memoir-wedgewood-houston", "https://www.memoir-wedgewoodhouston.com/scheduletour"),
        ("memoir-may-hosiery", "https://www.memoir-mayhosiery.com/scheduletour"),
    ]:
        print(f"=== {slug} ===", flush=True)
        results[slug] = audit_memoir(slug, url)
        print(json.dumps({
            "method": results[slug].get("source_method"),
            "availability": {d: {"status": v.get("status"), "n": len(v.get("times", [])), "enabled": v.get("date_enabled")} for d, v in results[slug].get("availability", {}).items()},
            "curl_statuses": [[v.get("status") for v in a.get("availability", {}).values()] for a in results[slug].get("curl_cffi", {}).get("attempts", [])],
            "selenium_error": results[slug].get("selenium_uc", {}).get("error"),
        }, indent=2), flush=True)

    for slug, data in results.items():
        (OUT / f"phase4-{slug}.json").write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    (OUT / "phase4-all-results.json").write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    asyncio.run(main())
