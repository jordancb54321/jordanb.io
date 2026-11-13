# jordanb.io

Jordan Betts’ portfolio and browser projects. Static HTML, CSS and JavaScript deployed from this repository’s `main` branch to Cloudflare Pages at https://jordanb.io.

The design uses an off-white background, black typography, dot-matrix details and restrained red accents. The homepage has selectable project previews and a project index. Chess, sorting, the study deck and the fractal renderer share the same visual system.

## Build and check

Use Node 22 or newer. There are no npm dependencies.

```sh
node --test tests/*.test.mjs
node scripts/build.mjs
```

`npm test` and `npm run build` are equivalent when npm is installed. The build copies only approved site paths into `dist`; tools, tests and design notes remain private to the repository.

For a basic local preview:

```sh
python -m http.server 8788 --bind 127.0.0.1 --directory dist
```

A basic static server needs `.html` on `/learn`, `/chess` and `/sorting`. Cloudflare Pages serves the clean routes through `_worker.js`.

## Browser checks

Run against a server that supports clean routes, or the deployed site:

```sh
SITE_URL=https://jordanb.io BROWSER_PATH=/usr/bin/brave-origin uv run --with playwright python tests/browser_check.py
```

Set `BROWSER_PATH` to an installed Chromium browser or leave it unset to use Playwright’s Chromium. Checks cover all five pages at 320, 390, 768 and 1440 pixels, project navigation with mouse and keyboard, no-JavaScript navigation, reduced motion, preview selection, chess moves/reset, sorting results, study progress persistence and changed fractal output.

Fresh project thumbnails and the social card can be captured with:

```sh
SITE_URL=http://127.0.0.1:8790 uv run --with playwright --with pillow python tests/capture_projects.py
```

## Deployment

Cloudflare Pages project `jordanb-io` watches `main`, runs `node scripts/build.mjs`, and publishes `dist`. Production domains are `jordanb.io` and `www.jordanb.io`; the Worker redirects the latter to the canonical apex. The Worker provides security headers, real not-found responses and extensionless document routing. Stockfish and all other dependencies are served locally.
