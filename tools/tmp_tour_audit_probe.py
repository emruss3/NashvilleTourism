import asyncio
import json
import re
import traceback
from datetime import date
from pathlib import Path
from typing import Any

from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

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

NESTIO = [
    ("emblem-park", "https://emblemparknashville.com/schedule-a-tour/"),
    ("westerly-house", "https://livewesterlyhouse.com/schedule-a-tour/"),
    ("queens-weho", "https://queensweho.com/schedule-a-tour/"),
]

RENTCAFE = [
    ("memoir-wedgewood-houston", "https://www.memoir-wedgewoodhouston.com/scheduletour"),
    ("memoir-may-hosiery", "https://www.memoir-mayhosiery.com/scheduletour"),
    ("standard-assembly", "https://thestandardassembly.com/schedule-a-tour/"),
]

TIME_RE = re.compile(r"(?<!\d)(?:1[0-2]|[1-9]):[0-5]\d\s*(?:a\.?m\.?|p\.?m\.?)", re.I)
TOUR_RE = re.compile(r"guided|in[ -]?person|video|virtual|self[ -]?guided", re.I)


def unique(items):
    out = []
    seen = set()
    for item in items:
        key = str(item).strip().lower()
        if key and key not in seen:
            seen.add(key)
            out.append(str(item).strip())
    return out


def times_from_text(text: str) -> list[str]:
    return unique(m.group(0).replace(".", "").lower() for m in TIME_RE.finditer(text or ""))


async def context_for(browser):
    return await browser.new_context(
        viewport={"width": 1440, "height": 1100},
        timezone_id="America/Chicago",
        locale="en-US",
        color_scheme="light",
        ignore_https_errors=True,
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
    )


async def attach_network(page, log: list[dict[str, Any]]):
    tasks: list[asyncio.Task] = []

    def on_request(req):
        if req.resource_type in {"xhr", "fetch", "document"}:
            log.append({
                "kind": "request",
                "method": req.method,
                "url": req.url,
                "resource_type": req.resource_type,
                "post_data": req.post_data,
            })

    async def capture(resp):
        try:
            req = resp.request
            if req.resource_type not in {"xhr", "fetch", "document"}:
                return
            headers = await resp.all_headers()
            ctype = headers.get("content-type", "")
            entry: dict[str, Any] = {
                "kind": "response",
                "status": resp.status,
                "url": resp.url,
                "content_type": ctype,
            }
            if any(token in resp.url.lower() for token in [
                "nestio", "nestiolistings", "tour", "schedule", "appointment", "calendar",
                "availability", "slot", "doorway", "engrain", "hy.ly", "hytour", "rentcafe",
                "getavailable", "prospectportal", "realpage", "funnel",
            ]) or "json" in ctype.lower():
                try:
                    body = await resp.text()
                    entry["body"] = body[:750000]
                    entry["body_truncated"] = len(body) > 750000
                except Exception as exc:
                    entry["body_error"] = repr(exc)
            log.append(entry)
        except Exception as exc:
            log.append({"kind": "response_capture_error", "error": repr(exc)})

    page.on("request", on_request)
    page.on("response", lambda resp: tasks.append(asyncio.create_task(capture(resp))))
    return tasks


async def settle_tasks(tasks):
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)


async def visible_elements(frame, selector="button, a, input, select, textarea, [role='button'], [role='option'], [role='radio'], label, [class*='Select'], [class*='select'], [class*='date'], [class*='Date'], [class*='time'], [class*='Time']"):
    try:
        return await frame.locator(selector).evaluate_all(
            """els => els.slice(0, 1500).map((e, i) => {
              const r = e.getBoundingClientRect();
              const s = getComputedStyle(e);
              const visible = !!(r.width || r.height) && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity || 1) !== 0;
              return {
                i,
                tag: e.tagName,
                text: (e.innerText || e.textContent || e.value || e.getAttribute('aria-label') || '').trim().replace(/\\s+/g,' ').slice(0,500),
                aria: e.getAttribute('aria-label'),
                title: e.getAttribute('title'),
                href: e.href || null,
                type: e.getAttribute('type'),
                name: e.getAttribute('name'),
                value: e.value || e.getAttribute('value'),
                id: e.id || null,
                cls: (e.className && String(e.className).slice(0,500)) || null,
                disabled: !!e.disabled || e.getAttribute('aria-disabled') === 'true',
                checked: !!e.checked || e.getAttribute('aria-checked'),
                visible,
                rect: {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)}
              };
            }).filter(x => x.visible)"""
        )
    except Exception as exc:
        return [{"error": repr(exc)}]


async def snapshot(page, name: str):
    snap: dict[str, Any] = {"page_url": page.url, "frames": []}
    try:
        await page.screenshot(path=str(OUT / f"{name}.png"), full_page=True, timeout=30000)
        snap["screenshot"] = f"{name}.png"
    except Exception as exc:
        snap["screenshot_error"] = repr(exc)
    for i, frame in enumerate(page.frames):
        item: dict[str, Any] = {"index": i, "url": frame.url, "name": frame.name}
        try:
            item["text"] = (await frame.locator("body").inner_text(timeout=5000))[:100000]
        except Exception as exc:
            item["text_error"] = repr(exc)
        item["visible_elements"] = await visible_elements(frame)
        try:
            item["html"] = (await frame.content())[:400000]
        except Exception as exc:
            item["html_error"] = repr(exc)
        snap["frames"].append(item)
    (OUT / f"{name}-snapshot.json").write_text(json.dumps(snap, indent=2, ensure_ascii=False), encoding="utf-8")
    return snap


async def dismiss_common(page):
    patterns = [
        re.compile(r"accept all cookies", re.I),
        re.compile(r"accept cookies", re.I),
        re.compile(r"^accept$", re.I),
        re.compile(r"^dismiss$", re.I),
        re.compile(r"^close$", re.I),
        re.compile(r"no thanks", re.I),
    ]
    for pattern in patterns:
        for role in ("button", "link"):
            try:
                loc = page.get_by_role(role, name=pattern)
                for i in range(min(await loc.count(), 8)):
                    el = loc.nth(i)
                    if await el.is_visible():
                        try:
                            await el.click(timeout=3000, force=True)
                            await page.wait_for_timeout(500)
                        except Exception:
                            pass
            except Exception:
                pass


async def find_frame(page, text_pattern: re.Pattern | None = None, url_token: str | None = None):
    for frame in page.frames:
        if url_token and url_token.lower() in frame.url.lower():
            return frame
        if text_pattern:
            try:
                text = await frame.locator("body").inner_text(timeout=2000)
                if text_pattern.search(text):
                    return frame
            except Exception:
                pass
    return None


async def open_nestio(slug, url, browser, netlog):
    context = await context_for(browser)
    page = await context.new_page()
    tasks = await attach_network(page, netlog)
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=90000)
        await page.wait_for_timeout(7000)
        frame = await find_frame(page, url_token="integrations.nestio.com/contact-widget")
        if not frame:
            return page, context, tasks, None
        return page, context, tasks, frame
    except Exception:
        return page, context, tasks, None


async def nestio_options(frame):
    await frame.locator(".pam__SelectValue__value").first.click(force=True, timeout=10000)
    await frame.wait_for_timeout(700)
    els = await visible_elements(frame, "[class*='Select'], [class*='select'], [role='option'], li, button, div")
    candidates = []
    for e in els:
        text = (e.get("text") or "").strip()
        cls = (e.get("cls") or "")
        if text and len(text) <= 120 and TOUR_RE.search(text) and ("select" in cls.lower() or e.get("tag") in {"LI", "BUTTON"} or e.get("aria")):
            candidates.append({"text": text, "cls": cls, "tag": e.get("tag"), "aria": e.get("aria")})
    return candidates


async def click_nestio_option(frame, label: str):
    selectors = "[class*='SelectItem'], [class*='select-item'], [class*='option'], [role='option'], li, button, div"
    loc = frame.locator(selectors).filter(has_text=re.compile(rf"^\s*{re.escape(label)}\s*$", re.I))
    for i in range(min(await loc.count(), 20)):
        el = loc.nth(i)
        if await el.is_visible():
            await el.click(force=True, timeout=5000)
            return True
    # Fallback to exact text anywhere, taking the smallest visible match.
    loc = frame.get_by_text(label, exact=True)
    for i in range(min(await loc.count(), 20)):
        el = loc.nth(i)
        if await el.is_visible():
            await el.click(force=True, timeout=5000)
            return True
    return False


async def select_nestio_date(frame, day: int):
    date_input = frame.locator("input.pam__InputValue__label").first
    try:
        await date_input.click(force=True, timeout=5000)
        await frame.wait_for_timeout(500)
    except Exception:
        return False, "date input not clickable"

    # React DatePicker uses descriptive aria labels; this route avoids confusing 4 with 14/24.
    labels = [
        re.compile(rf"September\s+0?{day}(?:st|nd|rd|th)?(?:,|\s).*2026", re.I),
        re.compile(rf"{WINDOW[day-4][1]},\s+September\s+0?{day}(?:st|nd|rd|th)?,\s+2026", re.I),
    ]
    for pattern in labels:
        loc = frame.locator("[aria-label]").filter(has=frame.locator(":scope"))
        count = await loc.count()
        for i in range(min(count, 500)):
            el = loc.nth(i)
            try:
                aria = await el.get_attribute("aria-label") or ""
                if pattern.search(aria) and await el.is_visible():
                    disabled = await el.get_attribute("aria-disabled") == "true" or await el.is_disabled()
                    cls = await el.get_attribute("class") or ""
                    if disabled or "disabled" in cls.lower():
                        return False, f"disabled calendar day: {aria}"
                    await el.click(force=True, timeout=5000)
                    await frame.wait_for_timeout(1200)
                    return True, aria
            except Exception:
                continue

    # Class/text fallback for common datepicker implementations.
    loc = frame.locator(".react-datepicker__day, [class*='datepicker'][class*='day'], [class*='DatePicker'][class*='day']")
    for i in range(min(await loc.count(), 200)):
        el = loc.nth(i)
        try:
            if not await el.is_visible():
                continue
            text = (await el.inner_text()).strip()
            cls = await el.get_attribute("class") or ""
            if text == str(day) and "outside-month" not in cls and "disabled" not in cls:
                await el.click(force=True, timeout=5000)
                await frame.wait_for_timeout(1200)
                return True, f"text day {day}"
        except Exception:
            pass
    return False, "calendar day not found"


async def nestio_times(frame):
    selects = frame.locator(".pam__SelectValue__value")
    if await selects.count() < 2:
        return [], "time selector missing"
    time_select = selects.nth((await selects.count()) - 1)
    cls = await time_select.get_attribute("class") or ""
    if "disabled" in cls.lower():
        return [], "time selector disabled"
    try:
        await time_select.click(force=True, timeout=5000)
        await frame.wait_for_timeout(500)
    except Exception as exc:
        return [], repr(exc)
    els = await visible_elements(frame, "[class*='Select'], [class*='select'], [role='option'], li, button, div")
    times = []
    evidence = []
    for e in els:
        text = (e.get("text") or "").strip()
        found = times_from_text(text)
        if found and len(text) <= 120:
            times.extend(found)
            evidence.append({"text": text, "tag": e.get("tag"), "cls": e.get("cls"), "aria": e.get("aria")})
    try:
        await frame.locator("body").press("Escape")
    except Exception:
        pass
    return unique(times), evidence


async def audit_nestio_property(slug, url, browser):
    result: dict[str, Any] = {"slug": slug, "url": url, "platform": "Nestio", "tour_types": [], "availability": {}, "runs": []}
    # First run: enumerate the exact options shown to prospects.
    netlog: list[dict[str, Any]] = []
    page, context, tasks, frame = await open_nestio(slug, url, browser, netlog)
    try:
        if not frame:
            result["error"] = "Nestio frame not found"
            result["snapshot"] = await snapshot(page, f"phase2-{slug}-no-frame")
            return result
        options = await nestio_options(frame)
        result["option_elements"] = options
        labels = unique(o["text"] for o in options)
        # Remove labels that contain a whole section rather than one tour option.
        labels = [x for x in labels if len(x.split()) <= 6 and not re.search(r"preferred tour type", x, re.I)]
        result["tour_types"] = labels
        result["initial_snapshot"] = await snapshot(page, f"phase2-{slug}-type-options")
    finally:
        await settle_tasks(tasks)
        result["runs"].append({"stage": "enumerate_types", "network": netlog})
        await context.close()

    # If the class-based extraction was noisy, use enabled types from the group API as fallback labels.
    if not result["tour_types"]:
        group_responses = [x for x in netlog if x.get("kind") == "response" and re.search(r"/api/v2/group/\d+/$", x.get("url", "")) and x.get("body")]
        if group_responses:
            cfg = json.loads(group_responses[-1]["body"])
            if cfg.get("guided_tours_enabled") and cfg.get("guided_tours_external_bookings_enabled"):
                result["tour_types"].append("Guided Tour")
            if cfg.get("video_tours_enabled") and cfg.get("video_tours_external_bookings_enabled"):
                result["tour_types"].append("Video Tour")
            if cfg.get("self_guided_tours_enabled") and cfg.get("self_guided_tours_external_bookings_enabled"):
                result["tour_types"].append("Self-Guided Tour")

    # Limit to actual type-looking labels and de-duplicate concept synonyms.
    cleaned = []
    for label in result["tour_types"]:
        if TOUR_RE.search(label) and not any(label.lower() == x.lower() for x in cleaned):
            cleaned.append(label)
    result["tour_types"] = cleaned

    for label in cleaned:
        netlog = []
        page, context, tasks, frame = await open_nestio(slug, url, browser, netlog)
        run: dict[str, Any] = {"stage": "tour_type", "tour_type": label, "dates": {}, "network": netlog}
        try:
            if not frame:
                run["error"] = "frame not found"
                continue
            options = await nestio_options(frame)
            exact_options = unique(o["text"] for o in options)
            click_label = next((x for x in exact_options if x.lower() == label.lower()), None)
            if not click_label:
                # Match conceptual fallback labels against whatever the widget displayed.
                key = "video" if re.search(r"video|virtual", label, re.I) else "self" if re.search(r"self", label, re.I) else "guided|in[ -]?person"
                click_label = next((x for x in exact_options if re.search(key, x, re.I)), label)
            run["click_label"] = click_label
            run["selected"] = await click_nestio_option(frame, click_label)
            await frame.wait_for_timeout(1200)
            run["after_type_elements"] = await visible_elements(frame)
            for iso, weekday, day in WINDOW:
                ok, date_evidence = await select_nestio_date(frame, day)
                day_result: dict[str, Any] = {"date": iso, "weekday": weekday, "date_click": ok, "date_evidence": date_evidence}
                if ok:
                    times, time_evidence = await nestio_times(frame)
                    day_result["times"] = times
                    day_result["time_evidence"] = time_evidence
                else:
                    day_result["times"] = []
                run["dates"][iso] = day_result
            run["snapshot"] = await snapshot(page, f"phase2-{slug}-{re.sub('[^a-z0-9]+','-',label.lower()).strip('-')}")
        except Exception as exc:
            run["error"] = repr(exc)
            run["traceback"] = traceback.format_exc()
        finally:
            await settle_tasks(tasks)
            await context.close()
        result["runs"].append(run)
        result["availability"][label] = run.get("dates", {})
    return result


async def audit_rentcafe(slug, url, browser):
    result: dict[str, Any] = {"slug": slug, "url": url, "platform": "RentCafe-or-property-scheduler", "tour_types": [], "availability": {}, "network": []}
    context = await context_for(browser)
    page = await context.new_page()
    tasks = await attach_network(page, result["network"])
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=90000)
        await page.wait_for_timeout(8000)
        await dismiss_common(page)
        await page.wait_for_timeout(2000)
        result["final_url"] = page.url
        result["initial_snapshot"] = await snapshot(page, f"phase2-{slug}-initial")
        has_calendar = await page.locator("#weeklycalendarcontainer, #calendar input[name='radiodate']").count() > 0
        result["rentcafe_calendar_found"] = has_calendar
        if not has_calendar:
            # The property may use another vendor. Record the live state for a tailored follow-up.
            result["body_text"] = (await page.locator("body").inner_text())[:150000]
            return result

        # RentCafe's UI identifies this flow as Guided Tour; capture any additional displayed types.
        body = await page.locator("body").inner_text()
        types = unique(m.group(0) for m in re.finditer(r"(?:Guided|Self[- ]Guided|Live Video|Video|Virtual|In[- ]Person)\s+Tour(?:s)?", body, re.I))
        result["tour_types"] = types or ["Guided Tour"]

        for idx, (iso, weekday, day) in enumerate(WINDOW, 1):
            inp = page.locator(f"#radiodate{idx}")
            day_result: dict[str, Any] = {"date": iso, "weekday": weekday, "times": []}
            if await inp.count() == 0:
                day_result["error"] = "date radio missing"
                result["availability"][iso] = day_result
                continue
            disabled = await inp.is_disabled() or await inp.get_attribute("disabled") is not None
            day_result["date_enabled"] = not disabled
            if disabled:
                result["availability"][iso] = day_result
                continue
            label = page.locator(f'label[for="radiodate{idx}"]')
            try:
                await label.click(force=True, timeout=5000)
            except Exception:
                await inp.check(force=True, timeout=5000)
            await page.wait_for_timeout(2500)
            section = page.locator("#schedule-tour-onsite")
            section_text = await section.inner_text() if await section.count() else ""
            day_result["section_text"] = section_text[:30000]
            day_result["times"] = times_from_text(section_text)
            day_result["visible_elements"] = await visible_elements(page, "#schedule-tour-onsite button, #schedule-tour-onsite label, #schedule-tour-onsite input, #schedule-tour-onsite [role='radio'], #schedule-tour-onsite [class*='time'], #schedule-tour-onsite [class*='Time']")
            # Some versions put time labels outside the section but tie them to a time radio.
            if not day_result["times"]:
                time_controls = await page.locator("input[name*='time' i], input[id*='time' i], label[for*='time' i], [data-selenium-id*='Time']").evaluate_all(
                    """els => els.map(e => ({text:(e.innerText||e.textContent||e.value||'').trim(), value:e.value||e.getAttribute('value'), id:e.id, for:e.getAttribute('for'), disabled:!!e.disabled, visible:!!(e.offsetWidth||e.offsetHeight)})).filter(x=>x.visible)"""
                )
                day_result["time_controls"] = time_controls
                day_result["times"] = unique(t for x in time_controls for t in times_from_text(" ".join(str(x.get(k) or "") for k in x)))
            result["availability"][iso] = day_result
        result["final_snapshot"] = await snapshot(page, f"phase2-{slug}-after-dates")
    except Exception as exc:
        result["error"] = repr(exc)
        result["traceback"] = traceback.format_exc()
    finally:
        await settle_tasks(tasks)
        await context.close()
    return result


async def audit_445(browser):
    result: dict[str, Any] = {"slug": "445-park-commons", "url": "https://445parkcommons.com/schedule-a-tour/", "platform": "Engrain Doorway", "runs": []}
    for option_id, label in [("tourButtons-section-radio-option0", "In-Person Tour"), ("tourButtons-section-radio-option2", "Self-Guided Tour")]:
        context = await context_for(browser)
        page = await context.new_page()
        netlog = []
        tasks = await attach_network(page, netlog)
        run: dict[str, Any] = {"tour_type": label, "network": netlog}
        try:
            await page.goto(result["url"], wait_until="domcontentloaded", timeout=90000)
            await page.wait_for_timeout(7000)
            await dismiss_common(page)
            try:
                close = page.get_by_role("button", name=re.compile(r"close", re.I))
                for i in range(await close.count()):
                    if await close.nth(i).is_visible():
                        await close.nth(i).click(force=True)
            except Exception:
                pass
            await page.wait_for_timeout(1000)
            frame = await find_frame(page, text_pattern=re.compile(r"what type of tour", re.I))
            if not frame:
                run["error"] = "Doorway frame not found"
                run["snapshot"] = await snapshot(page, f"phase2-445-{option_id}-no-frame")
                result["runs"].append(run)
                continue
            run["initial_text"] = (await frame.locator("body").inner_text())[:50000]
            run["initial_elements"] = await visible_elements(frame)
            radio = frame.locator(f"#{option_id}")
            if await radio.count():
                await radio.click(force=True)
            else:
                await frame.get_by_text(label, exact=False).first.click(force=True)
            await frame.wait_for_timeout(500)
            buttons = frame.locator("button").filter(has_text=re.compile(r"schedule|continue|tour", re.I))
            clicked = False
            for i in range(await buttons.count()):
                if await buttons.nth(i).is_visible():
                    await buttons.nth(i).click(force=True)
                    clicked = True
                    break
            run["continue_clicked"] = clicked
            await page.wait_for_timeout(9000)
            run["final_url"] = page.url
            run["snapshot"] = await snapshot(page, f"phase2-445-{option_id}")
            # Summarize visible time/date/type text across all resulting frames.
            frame_summaries = []
            for i, fr in enumerate(page.frames):
                try:
                    text = await fr.locator("body").inner_text(timeout=3000)
                except Exception:
                    text = ""
                frame_summaries.append({"index": i, "url": fr.url, "text": text[:100000], "times": times_from_text(text), "elements": await visible_elements(fr)})
            run["frames"] = frame_summaries
        except Exception as exc:
            run["error"] = repr(exc)
            run["traceback"] = traceback.format_exc()
        finally:
            await settle_tasks(tasks)
            await context.close()
        result["runs"].append(run)
    return result


async def audit_finery(browser):
    result: dict[str, Any] = {"slug": "the-finery", "url": "https://www.livethefinery.com/", "platform": "Hyly", "network": []}
    context = await context_for(browser)
    page = await context.new_page()
    tasks = await attach_network(page, result["network"])
    try:
        await page.goto(result["url"], wait_until="domcontentloaded", timeout=90000)
        await page.wait_for_timeout(7000)
        await dismiss_common(page)
        # Remove only marketing overlays that intercept the explicit Schedule a Tour control.
        await page.evaluate("""() => {
          for (const sel of ['#popup-overlay', '.popup-transparent-overlay', '.pum-overlay.pum-active']) {
            document.querySelectorAll(sel).forEach(e => e.remove());
          }
        }""")
        await page.wait_for_timeout(500)
        link = page.locator("a.hytour-link").first
        if await link.count():
            await link.click(force=True)
            result["scheduler_clicked"] = True
        else:
            result["scheduler_clicked"] = False
        await page.wait_for_timeout(10000)
        if len(context.pages) > 1:
            page = context.pages[-1]
            try:
                await page.wait_for_load_state("domcontentloaded", timeout=30000)
            except Exception:
                pass
            await page.wait_for_timeout(5000)
            result["popup_page_selected"] = True
        result["final_url"] = page.url
        result["snapshot"] = await snapshot(page, "phase2-the-finery-open-scheduler")
        frames = []
        for i, fr in enumerate(page.frames):
            try:
                text = await fr.locator("body").inner_text(timeout=3000)
            except Exception:
                text = ""
            frames.append({"index": i, "url": fr.url, "text": text[:150000], "times": times_from_text(text), "elements": await visible_elements(fr)})
        result["frames"] = frames
    except Exception as exc:
        result["error"] = repr(exc)
        result["traceback"] = traceback.format_exc()
    finally:
        await settle_tasks(tasks)
        await context.close()
    return result


async def main():
    all_results: dict[str, Any] = {"window": [x[0] for x in WINDOW], "properties": {}}
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--disable-dev-shm-usage", "--no-sandbox"])

        for slug, url in NESTIO:
            print(f"=== NESTIO {slug} ===", flush=True)
            result = await audit_nestio_property(slug, url, browser)
            all_results["properties"][slug] = result
            (OUT / f"phase2-{slug}.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
            print(json.dumps({"slug": slug, "tour_types": result.get("tour_types"), "availability": {k: {d: len(v.get('times', [])) for d, v in dates.items()} for k, dates in result.get('availability', {}).items()}, "error": result.get("error")}, indent=2), flush=True)

        for slug, url in RENTCAFE:
            print(f"=== SCHEDULER {slug} ===", flush=True)
            result = await audit_rentcafe(slug, url, browser)
            all_results["properties"][slug] = result
            (OUT / f"phase2-{slug}.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
            print(json.dumps({"slug": slug, "tour_types": result.get("tour_types"), "calendar": result.get("rentcafe_calendar_found"), "availability": {d: len(v.get('times', [])) for d, v in result.get('availability', {}).items()}, "error": result.get("error")}, indent=2), flush=True)

        print("=== 445 PARK COMMONS ===", flush=True)
        result = await audit_445(browser)
        all_results["properties"]["445-park-commons"] = result
        (OUT / "phase2-445-park-commons.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
        print(json.dumps({"slug": "445-park-commons", "runs": [{"type": x.get("tour_type"), "error": x.get("error"), "urls": [f.get("url") for f in x.get("frames", [])]} for x in result.get("runs", [])]}, indent=2), flush=True)

        print("=== FINERY ===", flush=True)
        result = await audit_finery(browser)
        all_results["properties"]["the-finery"] = result
        (OUT / "phase2-the-finery.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
        print(json.dumps({"slug": "the-finery", "error": result.get("error"), "clicked": result.get("scheduler_clicked"), "frames": [x.get("url") for x in result.get("frames", [])]}, indent=2), flush=True)

        await browser.close()

    (OUT / "phase2-all-results.json").write_text(json.dumps(all_results, indent=2, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    asyncio.run(main())
