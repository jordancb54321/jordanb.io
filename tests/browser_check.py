"""Real-browser checks for the portfolio and its existing experiments."""
import os
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('SITE_URL', 'http://127.0.0.1:8788').rstrip('/')
BROWSER = '/opt/brave-origin-bin/brave'

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=BROWSER, headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE + '/')
    expect(page.locator('h1')).to_have_text('Jordan Betts')
    selectors = page.locator('[data-project-select]')
    expect(selectors).to_have_count(4)
    for index in range(4):
        selectors.nth(index).click()
        expect(selectors.nth(index)).to_have_attribute('aria-pressed', 'true')
        expect(page.locator('[data-project-picture].is-active')).to_have_count(1)
        assert page.locator('[data-project-picture].is-active').get_attribute('data-project-picture') == str(index)
    selectors.nth(0).focus()
    page.keyboard.press('Enter')
    expect(selectors.nth(0)).to_have_attribute('aria-pressed', 'true')
    for width in [1440, 768, 390, 320]:
        page.set_viewport_size({'width': width, 'height': 900})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'Overflow at {width}px'
        assert page.locator('h1').is_visible()
        if width == 390:
            thumbnails = page.locator('.mobile-picture img')
            for image in thumbnails.all():
                box = image.bounding_box()
                assert box['height'] <= box['width'] * 0.7, f'Distorted project screenshot: {box}'
        assert page.locator('a[href="mailto:jordanb03@protonmail.com"]').first.is_visible()
    for route, landmark in [('learn.html', '#hero-study-button'), ('chess.html', '#board'), ('sorting.html', '#bars-bubble'), ('fractal/', '#fractalCanvas')]:
        page.goto(BASE + '/' + route)
        expect(page.locator(landmark)).to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'{route} mobile overflow'
    page.goto(BASE + '/chess.html')
    expect(page.locator('#board img')).to_have_count(32)
    page.locator('#flip-board').click()
    page.locator('#new-game').click()
    page.goto(BASE + '/learn.html')
    page.locator('#hero-study-button').click()
    expect(page.locator('#view-review')).to_be_visible()
    page.goto(BASE + '/sorting.html')
    before = page.locator('#bars-bubble').inner_html()
    page.locator('#shuffle').click()
    assert page.locator('#bars-bubble').inner_html() != before
    page.goto(BASE + '/fractal/')
    page.locator('#palette').select_option('mono')
    page.locator('#renderButton').click()
    expect(page.locator('#fractalCanvas')).to_be_visible()
    assert not errors, errors
    fallback = browser.new_context(java_script_enabled=False, viewport={'width': 390, 'height': 844})
    plain = fallback.new_page()
    plain.goto(BASE + '/')
    expect(plain.locator('h1')).to_have_text('Jordan Betts')
    for target in ['fractal/', 'learn', 'chess', 'sorting']:
        assert plain.locator(f'a[href="{target}"]').first.is_visible()
    assert plain.locator('img').count() >= 4
    calm = browser.new_context(reduced_motion='reduce')
    quiet = calm.new_page()
    quiet.goto(BASE + '/')
    assert quiet.evaluate("document.getAnimations().filter(a => a.playState === 'running').length") == 0
    browser.close()
    print('PASS: project previews, keyboard, 320–1440px layouts, no-JS, reduced motion and four working experiments; no JS errors.')
