import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Hamburg mobility product", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>ElbeFlow — Hamburg Urban Mobility Lakehouse<\/title>/i);
  assert.match(html, /Mobility,/);
  assert.match(html, /Network pulse/);
  assert.match(html, /Lakehouse architecture/);
  assert.match(html, /Hamburg Urban Data Platform/);
  assert.match(html, /210\.1M\+/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("live endpoint always returns a usable payload", async () => {
  const response = await render("/api/live");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload.metrics.stations >= 300);
  assert.ok(payload.coverage.estimatedBackfillableRows >= 100_000_000);
  assert.equal(payload.source.license, "DL-DE-BY-2.0");
});
