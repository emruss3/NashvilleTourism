import asyncio
import json
import re
import traceback
from pathlib import Path
from typing import Any

from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

OUT = Path("tour_audit_output")
OUT.mkdir(exist_ok=True)

TARGETS = [
    ("emblem-park", "https://emblemparknashville.com/schedule-a-tour/"),
    ("westerly-house", "https://livewesterlyhouse.com/schedule-a-tour/"),
    ("445-park-commons", "https://445parkcommons.com/schedule-a-tour/"),
    ("the-finery", "https://livethefinery.com/"),
    ("memoir-wedgewood-houston", "https://memoirresidential.com/properties/wedgewoodhouston"),
    ("memoir-may-hosiery", "https://memoirresidential.com/properties/may-hosiery"),
    ("standard-assembly", "https://www.greystar.com/standard-assembly-apartments-nashville-tn/p_19399"),
    ("queens-weho", "https://queensweho.com/"),
    ("luna", "https://lunanashvilleliving.com/schedule-a-tour/"),
    ("delux-weho", "https://deluxweho.com/"),
    ("coda", "https://thecodanashville.com/"),
]

RELEVANT_URL = re.compile(
    r"tour|sched|appoint|calendar|availability|availab|timeslot|time-slot|guestcard|lead|crm|knock|funnel|tour24|hyly|rentcafe|entrata|realpage|leasehawk|engrain|meetelise|betterbot|perq|ace|nurture|calendarhero|calendly|resman|showmojo",
    re.I,
)

CLICK_PATTERNS = [
    re.compile(r"schedule\s+(a\s+)?tour", re.I),
    re.compile(r"book\s+(a\s+)?tour", re.I),
    re.compile(r"tour\s+now", re.I),
    re.compile(r"schedule\s+(a\s+)?visit", re.I),
]

COOKIE_PATTERNS = [
    re.compile(r"accept all", re.I),
    re.compile(r"accept cookies", re.I),
    re.compile(r"allow all", re.I),
    re.compile(r"agree", re.I),
    re.compile(r"got it", re.I),
]


async def visible_interactives(frame) -> list[dict[str, Any]]:
    try:
        return await frame.locator("button, a, input, select, textarea, [role='button'], [role='tab'], [role='radio'], [role='option']").evaluate_all(
            """els => els.slice(0, 500).map((e, i) => {
              const r = e.getBoundingClientRect();
              const s = getComputedStyle(e);
              const visible = !!(r.width || r.height) && s.visibility !== 'hidden' && s.display !== 'none';
              return {
                i,
                tag: e.tagName,
                text: (e.innerText || e.textContent || e.value || e.getAttribute('aria-label') || '').trim().replace(/\\s+/g,' ').slice(0,300),
                aria: e.getAttribute('aria-label'),
                title: e.getAttribute('title'),
                href: e.href || null,
                type: e.getAttribute('type'),
                name: e.getAttribute('name'),
                id: e.id || null,
                cls: (e.className && String(e.className).slice(0,300)) || null,
                disabled: !!e.disabled || e.getAttribute('aria-disabled') === 'true',
                checked: !!e.checked || e.getAttribute('aria-checked'),
                visible,
                rect: {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)}
              };
            })"""
        )
    except Exception as exc:
        return [{"error": repr(exc)}]


async def frame_dump(frame) -> dict[str, Any]:
    item: dict[str, Any] = {"url": frame.url, "name": frame.name}
    try:
        item["title"] = await frame.title()
    except Exception:
        pass
    try:
        item["text"] = (await frame.locator("body").inner_text(timeout=5000))[:100000]
    except Exception as exc:
        item["text_error"] = repr(exc)
    try:
        item["interactives"] = await visible_interactives(frame)
    except Exception as exc:
        item["interactives_error"] = repr(exc)
    try:
        html = await frame.content()
        item["html"] = html[:250000]
    except Exception as exc:
        item["html_error"] = repr(exc)
    return item


async def click_first_visible(page, patterns, label: str, events: list[dict[str, Any]]) -> bool:
    for pattern in patterns:
        for role in ("button", "link"):
            try:
                loc = page.get_by_role(role, name=pattern)
                count = await loc.count()
                for idx in range(min(count, 10)):
                    el = loc.nth(idx)
                    if await el.is_visible() and await el.is_enabled():
                        txt = (await el.inner_text())[:200]
                        before = page.url
                        try:
                            await el.scroll_into_view_if_needed()
                            await el.click(timeout=10000)
                            events.append({"event": label, "role": role, "text": txt, "before": before, "after": page.url})
                            await page.wait_for_timeout(7000)
                            return True
                        except Exception as exc:
                            events.append({"event": f"{label}_click_error", "role": role, "text": txt, "error": repr(exc)})
            except Exception:
                continue
    return False


async def audit_target(browser, slug: str, url: str) -> dict[str, Any]:
    context = await browser.new_context(
        viewport={"width": 1440, "height": 1100},
        timezone_id="America/Chicago",
        locale="en-US",
        color_scheme="light",
        ignore_https_errors=True,
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
    )
    page = await context.new_page()
    result: dict[str, Any] = {
        "slug": slug,
        "requested_url": url,
        "events": [],
        "console": [],
        "page_errors": [],
        "requests": [],
        "responses": [],
    }
    response_tasks: list[asyncio.Task] = []

    page.on("console", lambda msg: result["console"].append({"type": msg.type, "text": msg.text[:2000]}))
    page.on("pageerror", lambda exc: result["page_errors"].append(repr(exc)[:4000]))
    page.on("request", lambda req: result["requests"].append({"method": req.method, "url": req.url, "resource_type": req.resource_type}) if RELEVANT_URL.search(req.url) else None)

    async def capture_response(resp):
        try:
            headers = await resp.all_headers()
            ctype = headers.get("content-type", "")
            relevant = bool(RELEVANT_URL.search(resp.url)) or "json" in ctype.lower()
            if not relevant:
                return
            entry: dict[str, Any] = {"status": resp.status, "url": resp.url, "content_type": ctype}
            try:
                body = await resp.text()
                entry["body"] = body[:500000]
                entry["body_truncated"] = len(body) > 500000
            except Exception as exc:
                entry["body_error"] = repr(exc)
            result["responses"].append(entry)
        except Exception as exc:
            result["responses"].append({"url": getattr(resp, "url", ""), "capture_error": repr(exc)})

    page.on("response", lambda resp: response_tasks.append(asyncio.create_task(capture_response(resp))))

    try:
        try:
            response = await page.goto(url, wait_until="domcontentloaded", timeout=90000)
            result["initial_status"] = response.status if response else None
        except PlaywrightTimeoutError as exc:
            result["goto_timeout"] = repr(exc)
        except Exception as exc:
            result["goto_error"] = repr(exc)
        await page.wait_for_timeout(10000)

        # Clear common consent overlays without submitting any prospect information.
        await click_first_visible(page, COOKIE_PATTERNS, "cookie_accept", result["events"])

        # On home/property pages, open the scheduler. Schedule pages generally have no matching
        # outbound button or simply re-open their embedded widget.
        if not re.search(r"schedule-a-tour|book-a-tour|tour-scheduler", page.url, re.I):
            await click_first_visible(page, CLICK_PATTERNS, "open_scheduler", result["events"])
        else:
            # Some schedule pages still require a Book/Schedule button to launch a modal.
            await click_first_visible(page, CLICK_PATTERNS, "open_embedded_scheduler", result["events"])

        # If a click opened a popup, make the newest page the active audit surface.
        if len(context.pages) > 1:
            candidate = context.pages[-1]
            if candidate is not page:
                page = candidate
                result["events"].append({"event": "popup_selected", "url": page.url})
                try:
                    await page.wait_for_load_state("domcontentloaded", timeout=30000)
                except Exception:
                    pass
                await page.wait_for_timeout(8000)

        result["final_url"] = page.url
        try:
            result["title"] = await page.title()
        except Exception:
            pass

        try:
            await page.screenshot(path=str(OUT / f"{slug}.png"), full_page=True, timeout=30000)
            result["screenshot"] = f"{slug}.png"
        except Exception as exc:
            result["screenshot_error"] = repr(exc)
            try:
                await page.screenshot(path=str(OUT / f"{slug}-viewport.png"), full_page=False, timeout=15000)
                result["screenshot"] = f"{slug}-viewport.png"
            except Exception as exc2:
                result["screenshot_error_2"] = repr(exc2)

        frames = []
        for idx, frame in enumerate(page.frames):
            fd = await frame_dump(frame)
            fd["index"] = idx
            frames.append(fd)
            # Save fuller frame HTML/text separately for easier inspection.
            (OUT / f"{slug}-frame-{idx}.json").write_text(json.dumps(fd, indent=2, ensure_ascii=False), encoding="utf-8")
        result["frames"] = [{k: v for k, v in f.items() if k not in {"html", "interactives"}} for f in frames]
        result["all_interactives"] = [
            {"frame_index": f["index"], "frame_url": f.get("url"), "items": f.get("interactives", [])}
            for f in frames
        ]

        try:
            result["body_text"] = (await page.locator("body").inner_text(timeout=10000))[:150000]
        except Exception as exc:
            result["body_text_error"] = repr(exc)

        try:
            result["cookies"] = await context.cookies()
        except Exception:
            pass

        # Let late calendar/API calls finish, then await response capture tasks.
        await page.wait_for_timeout(5000)
        if response_tasks:
            await asyncio.gather(*response_tasks, return_exceptions=True)

    except Exception as exc:
        result["fatal_error"] = repr(exc)
        result["traceback"] = traceback.format_exc()
    finally:
        await context.close()

    # Keep network log useful but bounded.
    result["requests"] = result["requests"][-500:]
    result["responses"] = result["responses"][-300:]
    (OUT / f"{slug}.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    return result


async def main():
    summary = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--disable-dev-shm-usage", "--no-sandbox"])
        for slug, url in TARGETS:
            print(f"=== AUDITING {slug}: {url} ===", flush=True)
            item = await audit_target(browser, slug, url)
            summary.append({
                "slug": slug,
                "requested_url": url,
                "final_url": item.get("final_url"),
                "title": item.get("title"),
                "events": item.get("events"),
                "frame_urls": [f.get("url") for f in item.get("frames", [])],
                "error": item.get("fatal_error") or item.get("goto_error") or item.get("goto_timeout"),
            })
            print(json.dumps(summary[-1], indent=2), flush=True)
        await browser.close()
    (OUT / "summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    asyncio.run(main())
