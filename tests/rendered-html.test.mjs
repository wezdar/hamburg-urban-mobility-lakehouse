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
  assert.match(html, /<html[^>]+lang="de"[^>]+dir="ltr"/i);
  assert.match(html, /Mobilität,/);
  assert.match(html, /Offizielles Datenuniversum/);
  assert.match(html, /StadtRAD live/);
  assert.match(html, /Helle, interaktive Hamburg-Karte/);
  assert.match(html, /12-Stunden-Verfügbarkeitsprognose/);
  assert.match(html, /Historischer Explorer/);
  assert.match(html, /Anomalien, Wirkung und Modellgüte/);
  assert.match(html, /Nachhaltigkeitsszenario/);
  assert.match(html, /Vollständig nachvollziehbar/);
  assert.match(html, /OPEN­TELEMETRY/);
  assert.match(html, /Lakehouse-Architektur/);
  assert.match(html, /Hamburg Urban Data Platform/);
  assert.match(html, /459,0M\+/);
  assert.match(html, /84\.191/);
  assert.match(html, /aria-label="Deutsch"/);
  assert.match(html, /aria-label="English"/);
  assert.match(html, /aria-label="Français"/);
  assert.match(html, /aria-label="العربية"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("committed official urban layers have recruiter-visible scale and provenance", async () => {
  const snapshot = await import("../app/data/urban-intelligence.json", { with: { type: "json" } });
  const payload = snapshot.default;
  assert.ok(payload.trafficEvents.length >= 10);
  assert.ok(payload.transitStops.length >= 10);
  assert.equal(payload.provenance.traffic.license, "DL-DE-BY-2.0");
  assert.equal(payload.provenance.transit.license, "DL-DE-BY-2.0");
  assert.equal(payload.emissionsModel.avoidedCarKgPerKm, 0.148);
});

test("live endpoint always returns a usable payload", async () => {
  const response = await render("/api/live");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.ok(payload.metrics.stations >= 300);
  assert.ok(payload.coverage.estimatedBackfillableRows >= 100_000_000);
  assert.equal(payload.universe.totalStreams, 84_191);
  assert.ok(payload.universe.verifiedSampleRows >= 100_000);
  assert.equal(payload.source.license, "DL-DE-BY-2.0");
});
