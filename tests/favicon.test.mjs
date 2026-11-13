import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const file of ['chess.html', 'learn.html', 'sorting.html', 'fractal/index.html']) {
  test(`${file} explicitly loads the shared favicon`, async () => {
    const html = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.match(html, /<link\s+rel="icon"\s+href="\/favicon\.svg"\s+type="image\/svg\+xml"\s*\/?\s*>/);
  });
}
