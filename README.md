# jordanb.io

Jordan Betts' portfolio, built with HTML, CSS and a small amount of JavaScript. A red, black and grey redesign puts the work up front, with screenshots of the actual projects rather than mockups.

## Run locally

Use Node 22 or newer. There are no npm dependencies.

    npm test
    npm run build
    python -m http.server 8788 --bind 127.0.0.1 --directory dist

Open http://127.0.0.1:8788/. A plain Python server does not resolve the extensionless /learn, /chess and /sorting links; use their .html addresses locally, or Cloudflare Pages for the complete routing behavior.

Browser checks, with the server running:

    uv run --with playwright python tests/browser_check.py

The browser checks use the installed Brave executable at /opt/brave-origin-bin/brave. Set SITE_URL to check another deployment. The Node tests execute the real Pages worker against an isolated asset boundary and check its redirects, routing, headers and production packaging.

## Pages

- index.html, styles.css and site.js: portfolio and project preview chooser.
- learn.html: local-first study deck. Existing browser progress and storage keys are unchanged.
- chess.html: the JavaScript chess bot and local Stockfish engine.
- sorting.html: eight sorting algorithms.
- fractal/: the canvas renderer.
- project-shell.css: shared red/grey styling for the existing experiments.

The project chooser supports pointer, touch and keyboard input. Every project has an ordinary link and a no-JavaScript fallback. Reduced-motion preferences stop automatic movement. The screen recording has a play/pause button and pauses when off screen or when the tab is hidden.

## Images and fonts

The four WebP images and the short MP4 show this site's actual browser experiments. They were captured locally, not generated or taken from stock libraries. The capture workflow is tests/capture_projects.py (requires a local server, Playwright, Pillow and ffmpeg). Image capture is a maintenance task, not part of the production build.

Big Shoulders and Public Sans are served locally. Their SIL Open Font License files are in assets/fonts/. No analytics, remote font service or frontend framework is included.

## Deploy

GitHub: jordancb54321/jordanb.io, production branch main.
Cloudflare Pages project: jordanb-io, serving jordanb.io and redirecting www.jordanb.io to the apex.

Pages runs `node scripts/build.mjs` and publishes only `dist`. The build copies an explicit list of site files, including the Pages worker, existing experiment assets and fonts. Tests, design captures, source notes and tooling do not ship.

The separate Trailhead app at home.jordanb.io is not part of this deployment and must not be modified when publishing this site.
