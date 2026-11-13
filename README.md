# jordanb.io

Jordan Betts' portfolio, built with HTML, CSS and a small amount of JavaScript. Nothing-inspired dot-matrix headings, off-white and black sections, and red actions. Short factual copy and images of the actual projects.

## Run locally

Use Node 22 or newer. There are no npm dependencies.

    npm test
    npm run build
    python -m http.server 8788 --bind 127.0.0.1 --directory dist

Open http://127.0.0.1:8788/. A plain Python server does not resolve the extensionless /learn, /chess and /sorting links; use their .html addresses locally, or Cloudflare Pages for the complete routing behavior.

For full routing and security-header behavior, serve the build through the actual Pages worker:

    npx wrangler pages dev dist --ip 127.0.0.1 --port 8789
    SITE_URL=http://127.0.0.1:8789 BROWSER_PATH=/usr/bin/brave-origin uv run --with playwright python tests/browser_check.py

Set BROWSER_PATH to an installed Chromium/Brave executable, or install Playwright's Chromium. Set SITE_URL to check a deployment. The browser checks click the real clean project links with mouse and keyboard, check all pages at 320/390/768/1440px, disable JavaScript for navigation checks, exercise reduced motion and video playback, and use each of the four tools. Brave's one-level canvas readout noise is tolerated in the grayscale check; its privacy settings are not changed. The Node tests execute the real Pages worker against an isolated asset boundary and check redirects, routing, headers and production packaging.

## Pages

- index.html, styles.css and site.js: portfolio, unequal project mosaic and optional fractal recording playback.
- learn.html: local-first study deck. Existing browser progress and storage keys are unchanged.
- chess.html: the JavaScript chess bot and local Stockfish engine.
- sorting.html: eight sorting algorithms.
- fractal/: the canvas renderer.
- project-shell.css: shared typography, navigation and control styling for the existing experiments.

Every project has an ordinary link, with no JavaScript required to navigate. The old hover-preview chooser was replaced with four visible projects. Reduced-motion preferences stop automatic movement. The fractal screen recording has a play/pause button and pauses when off screen or when the tab is hidden.

## Images and fonts

The four WebP images and the short MP4 show this site's actual browser experiments. They were captured locally, not generated or taken from stock libraries. The capture workflow is tests/capture_projects.py (requires a local server, Playwright, Pillow and ffmpeg). Image capture is a maintenance task, not part of the production build.

Doto and Public Sans are served locally; Big Shoulders is retained for compatibility with older app assets. Their SIL Open Font License files are in assets/fonts/. No analytics, remote font service or frontend framework is included.

The CSS regression tests check that every page defines the custom properties its stylesheets require. This guards against invisible visualisations after shared-theme changes.

## Deploy

GitHub: jordancb54321/jordanb.io, production branch main.
Cloudflare Pages project: jordanb-io, serving jordanb.io and redirecting www.jordanb.io to the apex.

Pages runs `node scripts/build.mjs` and publishes only `dist`. The build copies an explicit list of site files, including the Pages worker, existing experiment assets and fonts. Tests, design captures, source notes and tooling do not ship.

The separate Trailhead app at home.jordanb.io is not part of this deployment and must not be modified when publishing this site.
