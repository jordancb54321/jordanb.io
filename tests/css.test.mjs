import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
for (const path of [
  "index.html",
  "chess.html",
  "learn.html",
  "sorting.html",
  "fractal/index.html",
  "404.html",
]) {
  test(`${path} defines every required CSS custom property`, async () => {
    const html = await readFile(new URL(path, root), "utf8");
    const page = new URL(path, "https://jordanb.io/");
    const sheets = [...html.matchAll(/<link\b[^>]*>/gi)]
      .filter(([tag]) => /rel=["']stylesheet["']/.test(tag))
      .map(([tag]) => tag.match(/href=["']([^"']+)["']/)?.[1])
      .filter(Boolean);
    const css = (
      await Promise.all(
        sheets.map((href) => {
          const target = new URL(href, page);
          return readFile(new URL(`.${target.pathname}`, root), "utf8");
        }),
      )
    ).join("\n");
    const defined = new Set(
      [...css.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]),
    );
    // A fallback makes a missing property intentional and safe.
    const required = [...css.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)].map(
      (match) => match[1],
    );
    const missing = [...new Set(required.filter((name) => !defined.has(name)))];
    assert.deepEqual(
      missing,
      [],
      `Undefined properties can make controls and sorting bars invisible: ${missing.join(", ")}`,
    );
  });
}
