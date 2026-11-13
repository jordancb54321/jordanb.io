"""Capture the redesigned tools for the homepage and social card.

Serve the production build first. Run:
SITE_URL=http://127.0.0.1:8790 uv run --with playwright --with pillow python tests/capture_projects.py
"""
from io import BytesIO
from pathlib import Path
import os
from PIL import Image, ImageOps, ImageStat
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('SITE_URL', 'http://127.0.0.1:8790').rstrip('/')


def capture(locator, name):
    with Image.open(BytesIO(locator.screenshot())) as source:
        assert max(ImageStat.Stat(source.convert('RGB')).stddev) > 5, f'Flat capture: {name}'
        image = ImageOps.pad(source.convert('RGB'), (1200, 750), color='#f5f5f2')
        image.save(ROOT / 'assets' / f'{name}.webp', quality=88)
    print(f'Captured {name}')


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('BROWSER_PATH', '/usr/bin/brave-origin'), headless=True)
    page = browser.new_page(viewport={'width':1280, 'height':1000}, device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE + '/chess')
    page.evaluate('document.fonts.ready')
    expect(page.locator('#board img')).to_have_count(32)
    capture(page.locator('#board'), 'chess')
    page.goto(BASE + '/sorting')
    expect(page.locator('#bars-bubble > *')).to_have_count(28)
    capture(page.locator('[data-panel="bubble"]'), 'sorting')
    page.goto(BASE + '/learn')
    page.locator('#hero-study-button').click()
    page.locator('#start-session-button').click()
    expect(page.locator('#review-front')).to_be_visible()
    page.evaluate('document.fonts.ready')
    capture(page.locator('.flashcard'), 'study')
    page.goto(BASE + '/fractal/')
    page.locator('#palette').select_option('mono')
    page.locator('#presetSelect').select_option(label='Seahorse Valley')
    canvas = page.locator('#fractalCanvas')
    canvas.scroll_into_view_if_needed()
    page.evaluate('async () => { await renderFractal(); }')
    expect(page.locator('#renderStatus')).to_have_text('Complete', timeout=30000)
    capture(canvas, 'fractal')
    page.set_viewport_size({'width':1200,'height':630})
    page.goto(BASE + '/')
    page.evaluate('document.fonts.ready')
    with Image.open(BytesIO(page.screenshot())) as social:
        social.convert('RGB').save(ROOT / 'assets' / 'social.jpg', quality=88)
    assert not errors, errors
    browser.close()
