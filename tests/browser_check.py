"""Behavioral QA against a built, running site (no production dependencies).

Run: SITE_URL=http://127.0.0.1:8788 /path/to/venv/bin/python tests/browser_check.py
Install Playwright in that venv; install Chromium with `python -m playwright
install chromium`, or set BROWSER_PATH to an existing Chromium/Brave executable.
No screenshots, browser profiles, or other artifacts are written into the repo.
"""

import os
from pathlib import Path
import re
import shutil
import sys
import unittest
from urllib.error import URLError
from urllib.request import Request, urlopen

from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get("SITE_URL", "http://127.0.0.1:8788").rstrip("/")
WIDTHS = (320, 390, 768, 1440)
PROJECTS = {
    "fractal/": "#fractalCanvas",
    "learn": "#hero-study-button",
    "chess": "#board",
    "sorting": "#bars-bubble",
}


class BrowserChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright = sync_playwright().start()
        executable = os.environ.get("BROWSER_PATH")
        if not executable and not Path(cls.playwright.chromium.executable_path).is_file():
            for candidate in ("chromium", "google-chrome", "brave", "/opt/brave-origin-bin/brave"):
                executable = shutil.which(candidate)
                if executable:
                    break
        try:
            cls.browser = cls.playwright.chromium.launch(
                executable_path=executable, headless=True,
            )
        except Exception:
            cls.playwright.stop()
            raise
        print(f"Browser: {executable or 'Playwright Chromium'}; site: {BASE}", flush=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def setUp(self):
        self.errors = []
        self.contexts = []

    def tearDown(self):
        for context in self.contexts:
            context.close()
        self.assertEqual(self.errors, [], "Browser runtime/resource errors")

    def page(self, width=1440, **options):
        context = self.browser.new_context(viewport={"width": width, "height": 900}, **options)
        self.contexts.append(context)
        page = context.new_page()
        page.set_default_timeout(8000)
        page.set_default_navigation_timeout(15000)
        page.on("pageerror", lambda error: self.errors.append(f"{page.url}: {error}"))
        page.on("console", lambda message: self.errors.append(f"{page.url}: {message.text}")
                if message.type == "error" else None)
        page.on("response", lambda response: self.errors.append(f"HTTP {response.status}: {response.url}")
                if response.url.startswith(BASE + "/") and response.status >= 400 else None)
        return page

    def visit(self, page, route=""):
        # Exercise experiment documents even on a basic dist/ static server.
        # Tile-link tests separately require the real clean production routes.
        document = route + ".html" if route in ("learn", "chess", "sorting") else route
        response = page.goto(f"{BASE}/{document}", wait_until="load")
        self.assertIsNotNone(response)
        self.assertEqual(response.status, 200, f"Navigation failed: {page.url}")

    def assert_layout(self, page, label):
        # Wait for webfonts so a late font swap cannot hide horizontal overflow.
        page.evaluate("document.fonts.ready")
        dimensions = page.evaluate("""() => ({
            content: document.documentElement.scrollWidth,
            viewport: innerWidth
        })""")
        self.assertLessEqual(dimensions["content"], dimensions["viewport"],
                             f"Horizontal overflow: {label}: {dimensions}")

    def assert_home(self, page):
        # Plain spans may have no whitespace between them; compare visible words,
        # not an obsolete heading markup structure or a particular typeface.
        expect(page.locator("h1")).to_be_visible()
        self.assertEqual(re.sub(r"\s+", "", page.locator("h1").text_content()).rstrip("."), "JordanBetts")
        for anchor in ("work", "about", "contact"):
            link = page.locator(f'a[href="#{anchor}"]').first
            expect(link).to_be_visible()
            expect(page.locator(f"#{anchor}")).to_have_count(1)
        expect(page.locator('a[href="mailto:jordanb03@protonmail.com"]').first).to_be_visible()

    def test_home_responsive_project_tiles(self):
        for width in WIDTHS:
            with self.subTest(width=width):
                page = self.page(width)
                self.visit(page)
                self.assert_home(page)
                self.assert_layout(page, f"homepage {width}px")
                media = page.locator("#work img, #work video")
                expect(media).to_have_count(4)
                # No hidden/duplicated desktop-versus-mobile preview images.
                sources = []
                for item in media.all():
                    expect(item).to_be_visible()
                    sources.append(item.get_attribute("src") or item.get_attribute("poster"))
                self.assertEqual(len(set(sources)), 4, "Each project needs its own media")
                for route, landmark in PROJECTS.items():
                    tile = page.locator(f'#work a[href="{route}"]').filter(
                        has=page.locator("img, video"))
                    expect(tile).to_have_count(1)
                    expect(tile).to_have_accessible_name(re.compile(r"\S"))
                    tile.click()
                    expect(page.locator(landmark)).to_be_visible()
                    self.visit(page)
                self.assert_layout(page, f"homepage after navigation {width}px")
                # Check actual displayed images, without depending on mobile CSS
                # classes, screenshot proportions, or the desktop preview layout.
                for image in page.locator("img").all():
                    if image.is_visible():
                        image.scroll_into_view_if_needed()
                        expect(image).to_have_js_property("complete", True)
                        self.assertGreater(image.evaluate("img => img.naturalWidth"), 0,
                                           f"Broken image: {image.get_attribute('src')}")
                page.context.close()
                self.contexts.remove(page.context)

    def test_keyboard_project_links(self):
        for route, landmark in PROJECTS.items():
            with self.subTest(route=route):
                page = self.page()
                self.visit(page)
                page.locator('a[href="#work"]').first.focus()
                tab_limit = page.locator("a, button, input, select, textarea, [tabindex]").count() + 10
                reached = False
                for _ in range(tab_limit):
                    page.keyboard.press("Tab")
                    if page.evaluate("document.activeElement.getAttribute('href')") == route:
                        reached = True
                        break
                self.assertTrue(reached, f"Project {route} must be reachable with Tab")
                page.keyboard.press("Enter")
                expect(page).to_have_url(re.compile(re.escape(f"{BASE}/{route}") + r"(?:#.*)?$"))
                expect(page.locator(landmark)).to_be_visible()
                page.context.close()
                self.contexts.remove(page.context)

    def test_no_javascript_links(self):
        for width in WIDTHS:
            with self.subTest(width=width):
                page = self.page(width, java_script_enabled=False)
                self.visit(page)
                self.assert_home(page)
                self.assert_layout(page, f"no-JS homepage {width}px")
                for route, landmark in PROJECTS.items():
                    links = page.locator(f'a[href="{route}"]')
                    visible = [link for link in links.all() if link.is_visible()]
                    self.assertTrue(visible, f"No usable no-JS link to {route} at {width}px")
                    with page.expect_navigation(wait_until="load") as navigation:
                        visible[0].click()
                    self.assertEqual(navigation.value.status, 200, f"No-JS route failed: {route}")
                    self.assertEqual(page.url.split("#")[0].rstrip("/"), f"{BASE}/{route}".rstrip("/"))
                    expect(page.locator("h1")).to_be_visible()
                    # The destination is reachable without JavaScript; the chess
                    # board/sorting bars themselves necessarily require JS.
                    expect(page.locator(landmark)).to_have_count(1)
                    self.visit(page)
                page.context.close()
                self.contexts.remove(page.context)

    def test_reduced_motion(self):
        page = self.page(390, reduced_motion="reduce")
        self.visit(page)
        self.assertTrue(page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"))
        expect(page.locator('#project-preview')).to_be_visible()
        self.assertTrue(page.evaluate("document.getAnimations().every(a => a.playState !== 'running')"))
        self.assert_layout(page, "reduced-motion homepage")

    def test_project_preview_switches_with_keyboard(self):
        page = self.page()
        self.visit(page)
        canvas = page.locator('#project-preview')
        snapshots = set()
        for key, route, title in [('fractal', 'fractal/', 'Fractal renderer'),
                                  ('sorting', 'sorting', 'Sorting visualiser'),
                                  ('chess', 'chess', 'Chess'),
                                  ('study', 'learn', 'Study deck')]:
            button = page.locator(f'[data-preview="{key}"]')
            button.focus()
            page.keyboard.press('Enter')
            expect(button).to_have_attribute('aria-pressed', 'true')
            expect(page.locator('.preview-switcher [aria-pressed="true"]')).to_have_count(1)
            expect(page.locator('#preview-link')).to_have_attribute('href', route)
            expect(page.locator('#preview-title')).to_have_text(title)
            self.assertTrue(canvas.get_attribute('aria-label').strip())
            snapshots.add(canvas.evaluate('canvas => canvas.toDataURL()'))
        self.assertEqual(len(snapshots), 4, 'Each project must draw a distinct preview')
        page.locator('#preview-link').click()
        expect(page.locator('#hero-study-button')).to_be_visible()

    def test_experiment_responsive_routes(self):
        page = self.page()
        for route, landmark in PROJECTS.items():
            self.visit(page, route)
            expect(page.locator(landmark)).to_be_visible()
            for width in WIDTHS:
                with self.subTest(route=route, width=width):
                    page.set_viewport_size({"width": width, "height": 900})
                    self.assert_layout(page, f"{route} {width}px")

    def test_learn_review_persists(self):
        page = self.page(390)
        self.visit(page, "learn")
        page.locator("#hero-study-button").click()
        expect(page.locator("#view-review")).to_be_visible()
        page.locator("#start-session-button").click()
        question = page.locator("#review-front").inner_text()
        self.assertTrue(question.strip())
        expect(page.locator("#review-answer")).to_be_hidden()
        page.locator("#reveal-answer-button").click()
        expect(page.locator("#review-answer")).to_be_visible()
        self.assertTrue(page.locator("#review-back").inner_text().strip())
        page.locator('[data-rating="good"]').click()
        expect(page.locator("#review-front")).not_to_have_text(question)
        page.reload()
        page.locator("#tab-stats").click()
        expect(page.locator("#stats-reviews")).to_have_text("1")
        expect(page.locator("#stats-studied")).to_have_text("1")

    def test_chess_move_engine_flip_reset(self):
        page = self.page(390)
        self.visit(page, "chess")
        expect(page.locator("#board img")).to_have_count(32)
        source = page.locator('#board [data-square="e2"]')
        target = page.locator('#board [data-square="e4"]')
        source.scroll_into_view_if_needed()
        start, end = source.bounding_box(), target.bounding_box()
        self.assertIsNotNone(start)
        self.assertIsNotNone(end)
        page.mouse.move(start["x"] + start["width"] / 2, start["y"] + start["height"] / 2)
        page.mouse.down()
        page.mouse.move(end["x"] + end["width"] / 2, end["y"] + end["height"] / 2, steps=12)
        page.mouse.up()
        expect(page.locator("#move-history")).to_contain_text("e4")
        expect(page.locator("#move-history li").first).to_have_text(re.compile(r"^1\. e4 \S+"), timeout=15000)
        expect(page.locator("#status")).to_contain_text("Your move as White")
        before = page.locator('#board [data-square="a1"]').bounding_box()
        page.locator("#flip-board").click()
        after = page.locator('#board [data-square="a1"]').bounding_box()
        self.assertGreater(abs(after["x"] - before["x"]), 1, "Flip must change board orientation")
        page.locator("#new-game").click()
        expect(page.locator("#move-history")).to_have_text("No moves yet.")
        expect(page.locator("#board img")).to_have_count(32)
        expect(page.locator('#board [data-square="e2"] img')).to_have_attribute("data-piece", "wP")

    def test_sorting_finishes_with_same_values(self):
        page = self.page(390)
        self.visit(page, "sorting")
        page.locator("#array-size").press("Home")
        page.locator("#speed").press("Home")
        expect(page.locator("#bars-bubble > *")).to_have_count(12)
        self.assertTrue(page.locator("#bars-bubble > *").evaluate_all("""bars => bars.every(bar => {
            const style = getComputedStyle(bar);
            return bar.getBoundingClientRect().height > 0 &&
                (style.backgroundImage !== 'none' || style.backgroundColor !== 'rgba(0, 0, 0, 0)');
        })"""), "Sorting bars must have visible paint, not merely DOM elements")
        page.locator("#shuffle").click()
        before = page.locator("#bars-bubble > *").evaluate_all("bars => bars.map(b => parseFloat(b.style.height))")
        page.locator("#run-selected").click()
        for name in ("bubble", "selection", "insertion", "merge"):
            expect(page.locator(f"#status-{name}")).to_have_text("Sorted", timeout=15000)
            values = page.locator(f"#bars-{name} > *").evaluate_all("bars => bars.map(b => parseFloat(b.style.height))")
            self.assertEqual(values, sorted(before), f"{name}: output must be sorted and preserve the input multiset")
        expect(page.locator("#shuffle")).to_be_enabled()
        page.locator("#shuffle").click()
        expect(page.locator("#status-bubble")).to_have_text("Ready")

    def test_fractal_renders_changed_palette(self):
        page = self.page(390)
        self.visit(page, "fractal/")
        canvas = page.locator("#fractalCanvas")
        expect(canvas).to_be_visible()
        expect(page.locator("#renderStatus")).to_have_text("Complete", timeout=20000)
        before = canvas.evaluate("canvas => canvas.toDataURL()")
        # A nonblank canvas, and a different pixel result after a real rerender,
        # catch a disconnected control even when the canvas remains visible.
        self.assertTrue(canvas.evaluate("""canvas => {
            const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
            for (let i = 0; i < pixels.length; i += 4)
                if (pixels[i] || pixels[i + 1] || pixels[i + 2]) return true;
            return false;
        }"""))
        page.locator("#palette").select_option("mono")
        page.locator("#renderButton").click()
        expect(page.locator("#renderStatus")).to_have_text("Complete", timeout=20000)
        self.assertNotEqual(canvas.evaluate("canvas => canvas.toDataURL()"), before)
        self.assertTrue(canvas.evaluate("""canvas => {
            const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
            for (let i = 0; i < pixels.length; i += 4)
                // Brave's canvas privacy protection perturbs readouts by one
                // channel level. Reject visible colour, not one-bit farbling.
                if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) -
                    Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) > 1) return false;
            return true;
        }"""), "Mono palette must produce grayscale pixels")


if __name__ == "__main__":
    if sys.flags.optimize:
        raise SystemExit("Run browser QA without -O so Playwright assertions remain enabled.")
    try:
        # The live site's WAF rejects Python's default User-Agent. This is
        # only a reachability probe; all behavior is checked in a real browser.
        probe = Request(BASE + "/", headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(probe, timeout=3) as response:
            if response.status != 200:
                raise SystemExit(f"Site returned HTTP {response.status}: {BASE}")
    except (URLError, TimeoutError) as error:
        raise SystemExit(f"Built server unavailable at {BASE}: {error}\nStart the built server, then rerun: {sys.executable} {Path(__file__)}") from error
    unittest.main(verbosity=2)
