import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

function section(html, start, end) {
  const startIndex = html.indexOf(start);
  const endIndex = html.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `Expected section ${start}`);
  return html.slice(startIndex, endIndex);
}

test("server-renders the live fleet command dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();

  assert.match(html, /<title>Pace Maintenance Bus Tracking System<\/title>/i);
  assert.match(html, /class="command-bar"/);
  assert.match(html, />ALL BUSES</);
  assert.match(html, />IN SERVICE</);
  assert.match(html, />PENDING REPAIR</);
  assert.match(html, />LOCATE</);
  assert.match(html, /> SETTINGS</);
  assert.match(html, /data-bus-id="b0" data-status="service" data-pending="false"/);
  assert.match(html, /data-bus-id="b20" data-status="out" data-pending="false"/);
  assert.match(html, /IN SERVICE WITH DEFECTS/);
  assert.match(html, /WORK IN PROGRESS/);
  assert.match(html, /DECOMMISSIONED \/ DOWN INDEFINITELY/);
  assert.doesNotMatch(html, /TOW \/ STAGING/);
  assert.match(html, /--status-service:#1764d8/);
  assert.match(html, /--status-defect:#159447/);
  assert.match(html, /--status-shop:#efa400/);
  assert.match(html, /--status-out:#c91f27/);
  assert.match(html, /--status-decommissioned:#343a40/);
  assert.doesNotMatch(html, /TOTAL SPACES:/);
  assert.doesNotMatch(html, /SHOP BAYS \(DIAGONAL - 12 TOTAL\)/);

  const service = section(html, "SERVICE DETAIL AREA (SINGLE FILE)", "PAINT BOOTH");
  assert.equal((service.match(/class="spot"/g) ?? []).length, 8);
  const wall = section(html, "SHOP WALL (SINGLE FILE)", "MAIN GARAGE (BAYS 1-12)");
  assert.equal((wall.match(/class="spot"/g) ?? []).length, 8);
});

test("includes full theme, manual color, highlight, and locate controls", async () => {
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  for (const theme of ["Default", "Terminal", "Black / Dark", "Midnight", "Tactical"]) {
    assert.match(page, new RegExp(`label:\"${theme.replace("/", "\\/")}\"`));
  }
  for (const control of ["Page Background", "Panel Background", "Parking Spaces", "Command Bar", "SECTION BACKGROUNDS", "BUS STATUS COLORS"]) {
    assert.match(page, new RegExp(control));
  }
  assert.match(page, /scrollIntoView\(\{behavior:"smooth"/);
  assert.match(page, /original==="tow"\?"out"/);
  assert.match(page, /statusVersion:3/);
  assert.match(page, /<Icon s=\{bus\.s\}/);
  assert.match(page, /onChange=\{e=>f\("s",e\.target\.value\)\}/);
  assert.doesNotMatch(page, /tow:\["TOW \/ STAGING"/);
  assert.match(css, /\.app\.highlight-service/);
  assert.match(css, /\.app\.highlight-pending/);
  assert.match(css, /@keyframes locate-pulse/);
  assert.match(css, /\.vertical-zone\.tow\{[^}]*border-right-color:transparent/);
});