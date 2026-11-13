"""Capture real project UIs; run with --fractal-only to preserve other assets.

uv run --with playwright --with pillow python tests/capture_projects.py --fractal-only
Use --verify-only to check the saved fractal images and every encoded video frame.
"""
import argparse
from hashlib import sha256
from io import BytesIO
from pathlib import Path
import subprocess

from PIL import Image, ImageOps, ImageStat
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'assets'
FRAMES = ROOT / '.taste-skill' / 'film-frames'


def assert_rendered(image, label):
    """Reject black/flat captures, including a flat crop of a valid canvas."""
    rgb = image.convert('RGB')
    extrema = rgb.getextrema()
    assert any(high - low >= 20 for low, high in extrema), f'{label}: flat canvas pixels {extrema}'
    assert max(ImageStat.Stat(rgb).stddev) > 5, f'{label}: insufficient rendered detail'


def save_picture(page, selector, name):
    source = ROOT / '.taste-skill' / f'{name}-source.png'
    page.locator(selector).screenshot(path=str(source))
    with Image.open(source) as image:
        picture = ImageOps.fit(image.convert('RGB'), (1200, 750))
        picture.save(OUTPUT / f'{name}.webp', quality=88)
    print(f'Captured {name}: {selector}')


def wait_for_fractal(page):
    page.wait_for_function("document.querySelector('#renderStatus').textContent === 'Complete' && !document.querySelector('#renderButton').disabled", timeout=60000)
    page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
    # Inspect the actual canvas, not the surrounding interface or its background.
    stats = page.locator('#fractalCanvas').evaluate('''canvas => {
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let min = 255, max = 0;
        for (let i = 0; i < pixels.length; i += 4) {
            min = Math.min(min, pixels[i]); max = Math.max(max, pixels[i]);
        }
        return {min, max, width: canvas.width, height: canvas.height};
    }''')
    assert stats['max'] - stats['min'] >= 20, f'Flat runtime canvas: {stats}'


def capture_fractal(page):
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:8788/fractal/')
    # Frame the real UI canvas at 16:9. The normal stretched control-panel layout
    # is taller than the viewport; locator screenshots can resize/re-render it,
    # and a central landscape crop of Classic is entirely inside the black set.
    page.add_style_tag(content='.canvas-frame { flex: none !important; min-height: 0 !important; height: 621px !important; } .viewer { align-self: start !important; }')
    page.locator('#palette').select_option('mono')
    page.locator('#presetSelect').select_option(label='Seahorse Valley')
    canvas = page.locator('#fractalCanvas')
    canvas.scroll_into_view_if_needed()
    # Explicitly finish rendering after all layout and selection changes.
    page.evaluate('async () => { await renderFractal(); }')
    wait_for_fractal(page)
    source = ROOT / '.taste-skill' / 'fractal-source.png'
    canvas.screenshot(path=str(source))
    with Image.open(source) as image:
        assert_rendered(image, 'canvas screenshot')
        for name, size in [('fractal', (1200, 750)), ('fractal-wide', (1440, 810))]:
            picture = ImageOps.fit(image.convert('RGB'), size)
            assert_rendered(picture, name)
            picture.save(OUTPUT / f'{name}.webp', quality=90)
    hashes = set()
    for index in range(60):
        if index:
            # Use the app's real zoom interaction and renderer. Small bounded
            # steps give a smooth recording rather than random auto-zoom jumps.
            page.evaluate('() => zoomAt(canvas.width / 2, canvas.height / 2, 0.985)')
            wait_for_fractal(page)
        frame = canvas.screenshot()
        with Image.open(BytesIO(frame)) as image:
            assert_rendered(image, f'frame {index}')
            hashes.add(sha256(image.convert('RGB').tobytes()).hexdigest())
        (FRAMES / f'{index:03d}.png').write_bytes(frame)
    assert len(hashes) == 60, f'Expected 60 different real frames; got {len(hashes)}'
    assert not errors, f'Fractal runtime errors: {errors}'
    print(f'Captured Seahorse Valley, mono; 60 distinct completed real canvas frames; no page errors.')
    subprocess.run([
        'ffmpeg', '-y', '-framerate', '10', '-i', str(FRAMES / '%03d.png'),
        '-frames:v', '60', '-vf', 'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart', '-an', str(OUTPUT / 'fractal-zoom.mp4'),
    ], check=True, capture_output=True)


def verify_fractal_assets():
    for name, size in [('fractal.webp', (1200, 750)), ('fractal-wide.webp', (1440, 810))]:
        with Image.open(OUTPUT / name) as image:
            assert image.size == size, f'{name}: wrong dimensions {image.size}'
            assert_rendered(image, name)
            print(f'PASS {name}: {image.size}, RGB extrema {image.convert("RGB").getextrema()}')
    # Decode the deliverable, not merely its source frames or container metadata.
    result = subprocess.run([
        'ffmpeg', '-v', 'error', '-i', str(OUTPUT / 'fractal-zoom.mp4'),
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-',
    ], check=True, capture_output=True)
    frame_bytes = 1280 * 720 * 3
    assert len(result.stdout) == 60 * frame_bytes, 'Video must decode to exactly 60 1280x720 RGB frames'
    hashes = set()
    for index in range(60):
        raw = result.stdout[index * frame_bytes:(index + 1) * frame_bytes]
        image = Image.frombytes('RGB', (1280, 720), raw)
        assert_rendered(image, f'decoded video frame {index}')
        hashes.add(sha256(raw).hexdigest())
    assert len(hashes) == 60, f'Only {len(hashes)} distinct decoded video frames'
    print('PASS fractal-zoom.mp4: 60/60 non-uniform, distinct decoded frames (1280x720).')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fractal-only', action='store_true')
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    if args.verify_only:
        verify_fractal_assets()
        return
    OUTPUT.mkdir(exist_ok=True)
    FRAMES.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path='/opt/brave-origin-bin/brave', headless=True)
        page = browser.new_page(viewport={'width': 1600, 'height': 1050}, device_scale_factor=1)
        if not args.fractal_only:
            page.goto('http://127.0.0.1:8788/chess.html')
            page.locator('#board img').first.wait_for()
            save_picture(page, '.chess-layout', 'chess')
            page.goto('http://127.0.0.1:8788/learn.html')
            page.locator('#hero-study-button').click()
            page.locator('#start-session-button').click()
            page.locator('#reveal-answer-button').click()
            save_picture(page, '#review-session', 'study')
            page.goto('http://127.0.0.1:8788/sorting.html')
            page.locator('#bars-bubble > *').first.wait_for()
            save_picture(page, '#sorting-grid', 'sorting')
        capture_fractal(page)
        browser.close()
    verify_fractal_assets()


if __name__ == '__main__':
    main()
