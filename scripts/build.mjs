import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const output = new URL("dist/", root);
// Explicit site-only allowlist; captures, tests, source notes and tooling never ship.
const paths = [
  "index.html",
  "404.html",
  "styles.css",
  "site.js",
  "project-shell.css",
  "favicon.svg",
  "_worker.js",
  "_headers",
  "robots.txt",
  "llms.txt",
  "chess.html",
  "chess.css",
  "chess.js",
  "chess-engine-worker.js",
  "learn.html",
  "learn.css",
  "learn.js",
  "learn-cards.js",
  "sorting.html",
  "sorting.css",
  "sorting.js",
  "fractal",
  "vendor",
  "assets",
];
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const path of paths)
  await cp(new URL(path, root), new URL(path, output), { recursive: true });
console.log(
  `Built ${paths.length} allowlisted site paths in ${fileURLToPath(output)}`,
);
