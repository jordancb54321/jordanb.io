import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
// Load the real ES-module worker without a package.json or runtime dependency.
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(await read('_worker.js')).toString('base64')}`);
const homepage = await read('index.html');
const origin = 'https://jordanb.io';
const routes = new Map([
  ['/learn', 'learn.html'],
  ['/chess', 'chess.html'],
  ['/sorting', 'sorting.html'],
  ['/fractal/', 'fractal/index.html'],
]);

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(([tag]) => tag);
}
function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1];
}
function boundary(handler) {
  const calls = [];
  return {
    calls,
    env: { ASSETS: { async fetch(request) {
      assert.ok(request instanceof Request);
      calls.push(request);
      return handler(request);
    } } },
  };
}
const request = (path, options) => new Request(new URL(path, origin), options);

// These intentionally describe the redesign contract, not its marketing copy.
test('homepage has one identity heading naming Jordan Betts', () => {
  const headings = [...homepage.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  assert.equal(headings.length, 1);
  assert.match(headings[0][1].replace(/<[^>]*>/g, ' '), /Jordan\s+Betts/i);
});
for (const id of ['work', 'about', 'contact']) {
  test(`homepage links to an existing #${id} section`, () => {
    assert.ok(tags(homepage, 'a').some((tag) => attribute(tag, 'href') === `#${id}`), `Missing #${id} link`);
    assert.match(homepage, new RegExp(`\\bid=["']${id}["']`), `Missing #${id} target`);
  });
}
test('homepage declares its light theme color', () => {
  const meta = tags(homepage, 'meta').find((tag) => attribute(tag, 'name') === 'theme-color');
  assert.equal(attribute(meta ?? '', 'content')?.toLowerCase(), '#f5f5f2');
});
test('homepage loads site.js externally without inline JavaScript', async () => {
  const scripts = [...homepage.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.some(([tag]) => attribute(tag, 'src') === '/site.js'), 'Missing /site.js external script');
  for (const [tag, , body] of scripts) {
    assert.ok(attribute(tag, 'src'), 'Inline script is not allowed');
    assert.equal(body.trim(), '');
  }
  assert.doesNotMatch(homepage, /\son[a-z]+\s*=/i, 'Inline event handlers are not allowed');
  assert.doesNotMatch(homepage, /(?:href|src)\s*=\s*["']\s*javascript:/i);
  assert.ok((await stat(new URL('site.js', root))).isFile());
});

for (const [route, file] of routes) {
  test(`homepage preserves the ${route} experiment link`, () => {
    const paths = tags(homepage, 'a').map((tag) => attribute(tag, 'href')).filter(Boolean)
      .map((href) => new URL(href, origin).pathname);
    assert.ok(paths.includes(route), `Missing ${route}`);
  });
  test(`${route} document and its local script/style dependencies exist`, async () => {
    const html = await read(file);
    assert.match(html, /<main\b/);
    const pageUrl = new URL(route, origin);
    for (const tag of [...tags(html, 'script'), ...tags(html, 'link')]) {
      const href = attribute(tag, 'src') ?? attribute(tag, 'href');
      if (!href) continue;
      const url = new URL(href, pageUrl);
      if (url.origin !== origin || attribute(tag, 'rel') === 'canonical') continue;
      assert.ok((await stat(new URL(`.${url.pathname}`, root))).isFile(), `${route}: ${url.pathname}`);
    }
  });
  test(`worker serves preserved route ${route} with real asset content`, async () => {
    const asset = boundary(async (req) => {
      const pathname = new URL(req.url).pathname;
      // Only substitute Cloudflare's asset boundary: no worker logic is mocked.
      const target = pathname === '/fractal/' ? 'fractal/index.html' : pathname.slice(1);
      try { return new Response(await read(target), { headers: { 'Content-Type': 'text/html' } }); }
      catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'EISDIR') throw error;
        return new Response('Not found', { status: 404 });
      }
    });
    const response = await worker.fetch(request(route), asset.env);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), await read(file));
    assert.deepEqual(asset.calls.map((req) => new URL(req.url).pathname),
      route.endsWith('/') ? [route] : [route, `${route}.html`]);
  });
}

for (const host of ['www.jordanb.io', 'jordanb-io.pages.dev']) {
  test(`worker redirects ${host} to HTTPS canonical host preserving path/query`, async () => {
    const asset = boundary(() => { throw new Error('Redirect must not fetch assets'); });
    const response = await worker.fetch(new Request(`http://${host}/learn?topic=css&next=%2Fchess`), asset.env);
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('Location'), `${origin}/learn?topic=css&next=%2Fchess`);
    assert.equal(asset.calls.length, 0);
  });
}
test('worker does not redirect an unrelated hostname', async () => {
  const asset = boundary(() => new Response('preview'));
  const response = await worker.fetch(new Request('https://preview.example/'), asset.env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Location'), null);
  assert.equal(asset.calls.length, 1);
});
test('clean URL fallback retains query and request headers', async () => {
  const asset = boundary((req) => new URL(req.url).pathname.endsWith('.html')
    ? new Response('fallback', { status: 200 }) : new Response('missing', { status: 404 }));
  const response = await worker.fetch(request('/learn?topic=css', { headers: { 'X-Test': 'preserved' } }), asset.env);
  assert.equal(await response.text(), 'fallback');
  assert.equal(asset.calls[1].url, `${origin}/learn.html?topic=css`);
  assert.equal(asset.calls[1].headers.get('X-Test'), 'preserved');
});
for (const [path, method] of [['/missing.js', 'GET'], ['/missing/', 'GET'], ['/missing', 'HEAD'], ['/missing', 'POST']]) {
  test(`worker does not attempt HTML fallback for ${method} ${path}`, async () => {
    const asset = boundary(() => new Response(null, { status: 404 }));
    const response = await worker.fetch(request(path, { method }), asset.env);
    assert.equal(response.status, 404);
    assert.equal(asset.calls.length, 1);
  });
}
test('worker keeps successful assets intact without fallback', async () => {
  const asset = boundary(() => new Response('asset body', {
    status: 202, statusText: 'Accepted', headers: { ETag: 'test-tag', 'Cache-Control': 'public, max-age=60' },
  }));
  const response = await worker.fetch(request('/learn'), asset.env);
  assert.equal(response.status, 202);
  assert.equal(response.statusText, 'Accepted');
  assert.equal(await response.text(), 'asset body');
  assert.equal(response.headers.get('ETag'), 'test-tag');
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=60');
  assert.equal(asset.calls.length, 1);
});
test('worker preserves fallback 404 instead of returning the homepage', async () => {
  const asset = boundary((req) => new Response(`Missing ${new URL(req.url).pathname}`, {
    status: 404, statusText: 'Not Found', headers: { 'X-Asset': 'not-found' },
  }));
  const response = await worker.fetch(request('/does-not-exist'), asset.env);
  assert.equal(response.status, 404);
  assert.equal(response.statusText, 'Not Found');
  assert.equal(await response.text(), 'Missing /does-not-exist.html');
  assert.equal(response.headers.get('X-Asset'), 'not-found');
  assert.equal(asset.calls.length, 2);
});
for (const status of [200, 404, 500]) {
  test(`worker applies security headers to asset status ${status}`, async () => {
    const asset = boundary(() => new Response('body', { status }));
    const response = await worker.fetch(request('/asset.txt'), asset.env);
    assert.equal(response.status, status);
    assert.equal(response.headers.get('Strict-Transport-Security'), 'max-age=31536000; includeSubDomains');
    assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(response.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
    assert.equal(response.headers.get('Permissions-Policy'), 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()');
    const csp = response.headers.get('Content-Security-Policy');
    const directives = new Map(csp.split(';').map((part) => {
      const [name, ...values] = part.trim().split(/\s+/);
      return [name, values];
    }));
    assert.deepEqual(directives.get('default-src'), ["'self'"]);
    assert.deepEqual(directives.get('script-src'), ["'self'", "'wasm-unsafe-eval'"]);
    for (const name of ['worker-src', 'connect-src', 'font-src', 'base-uri', 'form-action']) {
      assert.deepEqual(directives.get(name), ["'self'"]);
    }
    for (const name of ['object-src', 'frame-ancestors']) assert.deepEqual(directives.get(name), ["'none'"]);
    assert.deepEqual(directives.get('img-src'), ["'self'", 'data:']);
    assert.deepEqual(directives.get('style-src'), ["'self'", "'unsafe-inline'"]);
    assert.ok(directives.has('upgrade-insecure-requests'));
  });
}
test('worker forces fractal application revalidation without changing other cache rules', async () => {
  const asset = boundary(() => new Response('js', { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } }));
  const fractal = await worker.fetch(request('/fractal/app.js?v=guided-auto-zoom-2'), asset.env);
  assert.equal(fractal.headers.get('Cache-Control'), 'public, max-age=0, must-revalidate');
  const vendor = await worker.fetch(request('/vendor/stockfish/stockfish-18-lite-single.js'), asset.env);
  assert.equal(vendor.headers.get('Cache-Control'), 'public, max-age=31536000, immutable');
});
test('HTML responses give Cloudflare an unpredictable CSP nonce without allowing unsafe inline scripts', async () => {
  const asset = boundary(() => new Response('<!doctype html><h1>Test</h1>', {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  }));
  const first = await worker.fetch(request('/'), asset.env);
  const second = await worker.fetch(request('/'), asset.env);
  const nonceFrom = (response) => response.headers.get('Content-Security-Policy').match(/'nonce-([^']+)'/)?.[1];
  const firstNonce = nonceFrom(first);
  const secondNonce = nonceFrom(second);
  assert.ok(firstNonce, 'HTML CSP must provide a nonce for Cloudflare JavaScript detections');
  assert.ok(secondNonce);
  assert.equal(Buffer.from(firstNonce, 'base64').length, 16);
  assert.notEqual(firstNonce, secondNonce, 'Never reuse a response nonce');
  const scriptPolicy = first.headers.get('Content-Security-Policy').split(';').find((part) => part.trim().startsWith('script-src '));
  assert.ok(scriptPolicy.includes("'self'"));
  assert.ok(scriptPolicy.includes("'wasm-unsafe-eval'"));
  assert.ok(!scriptPolicy.includes("'unsafe-inline'"));
  assert.equal(await first.text(), '<!doctype html><h1>Test</h1>');
});

test('chess worker, engine binary and piece assets remain present', async () => {
  const files = ['chess-engine-worker.js', 'vendor/stockfish/stockfish-18-lite-single.js', 'vendor/stockfish/stockfish-18-lite-single.wasm'];
  for (const color of ['w', 'b']) for (const piece of ['K', 'Q', 'R', 'B', 'N', 'P']) files.push(`vendor/img/chesspieces/wikipedia/${color}${piece}.png`);
  for (const file of files) assert.ok((await stat(new URL(file, root))).size > 0, file);
});
