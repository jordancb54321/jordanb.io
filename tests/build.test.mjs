import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';

test('production build contains the actual site and keeps development files private', () => {
  execFileSync(process.execPath,['scripts/build.mjs']);
  for (const file of ['index.html','styles.css','site.js','project-shell.css','favicon.svg','_worker.js','_headers','learn.html','learn.js','learn-cards.js','chess.html','chess.js','chess-engine-worker.js','sorting.html','sorting.js','fractal/index.html','fractal/app.js','assets/fractal.webp','assets/study.webp','assets/chess.webp','assets/sorting.webp','assets/fractal-zoom.mp4']) {
    assert.ok(existsSync(join('dist',file)), `Missing production file: ${file}`);
    assert.deepEqual(readFileSync(join('dist',file)),readFileSync(file));
  }
  for (const name of ['tests','scripts','.git','.taste-skill','README.md','package.json']) assert.ok(!existsSync(join('dist',name)), `Development path exposed: ${name}`);
  assert.ok(readdirSync('dist/vendor').length > 0);
});
