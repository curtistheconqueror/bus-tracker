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
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
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
  const bays = section(html, "SHOP BAYS (DIAGONAL)", "PIT");
  assert.equal((bays.match(/class="bay"/g) ?? []).length, 9);
  assert.equal((bays.match(/class="bay-placeholder"/g) ?? []).length, 3);
  assert.match(bays, /NEEDS REASSIGNMENT/);

  const service = section(html, "SERVICE DETAIL AREA (SINGLE FILE)", "PAINT BOOTH");
  assert.equal((service.match(/class="spot"/g) ?? []).length, 8);
  const wall = section(html, "SHOP WALL (SINGLE FILE)", "MAIN GARAGE (BAYS 1-12)");
  assert.equal((wall.match(/class="spot"/g) ?? []).length, 8);
  const pit = section(html, "PIT", "BRAKE TEST");
  assert.equal((pit.match(/class="spot"/g) ?? []).length, 2);
  const brake = section(html, "BRAKE TEST", "TOW STAGING");
  assert.equal((brake.match(/class="spot"/g) ?? []).length, 2);
  const east = section(html, '<section class="east lot">', '<section class="road">');
  assert.equal((east.match(/class="spot"/g) ?? []).length, 21);
  const road = section(html, '<section class="road">', '<section class="wall">');
  assert.equal((road.match(/class="spot"/g) ?? []).length, 65);
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
  assert.match(page, /BAY_LAYOUT:\(number\|null\)\[\]=\[null,null,8,6,4,2,null,9,7,5,3,1\]/);
  assert.match(page, /"SHOP BAYS \(DIAGONAL\)":slots\("bay",9,1\)/);
  assert.match(page, /roadcallSolid:boolean;roadcallLocation:string/);
  assert.match(page, /SOLID ORANGE BUS \(NO FLASHING DOT\)/);
  assert.match(page, /ROADCALL LOCATION/);
  assert.match(page, /roadcallLocation:bus\.roadcallLocation\?\?""/);
  assert.match(page, /bus\.roadcall&&bus\.roadcallSolid\?"var\(--roadcall-color\)"/);
  assert.match(css, /--roadcall-color:#f97316/);
  assert.match(css, /\.roadcall-dot\{/);
  assert.match(css, /@keyframes roadcall-dot-pulse/);
  assert.match(css, /\.app\.highlight-service/);
  assert.match(css, /\.app\.highlight-pending/);
  assert.match(css, /@keyframes locate-pulse/);
  assert.match(css, /\.vertical-zone\.tow\{[^}]*border-right-color:transparent/);
  assert.match(page, /LIVE FLEET:/);
  assert.match(page, /buses\.filter\(bus=>bus\.s===status\)\.length/);
  assert.match(page, /data-empty=\{!b\}/);
  assert.match(page, /onDoubleClick=/);
  assert.match(page, /event\.pointerType!=="touch"/);
  assert.match(page, /Protected fleet identity\. Change only in Settings\./);
  assert.match(page, /FLEET NUMBER CONTROL/);
  assert.match(page, /Duplicate numbers are blocked/);
  assert.match(page, /MOVE TO AREA/);
  assert.match(page, /disabled=\{!area\.available\}/);
  assert.match(page, /That destination was just occupied/);
  assert.match(css, /\.service\{width:calc\(75% - 8px\);justify-self:start/);
  assert.match(css, /\.road\{position:absolute;top:0/);
  assert.match(css, /\.app\.highlight-status-out/);
  assert.match(page, /const ROAD_CAPACITY=65/);
  assert.match(page, /"PIT":slots\("pit",2\)/);
  assert.match(page, /"BRAKE TEST":slots\("brake",2\)/);
  assert.match(page, /EAST_SLOTS\.find\(slot=>!occupiedEast\.has\(slot\)\)/);
  assert.match(css, /\.eastgrid\{grid-template-columns:repeat\(3/);
  assert.match(css, /\.roadgrid\{grid-template-columns:repeat\(5/);
  assert.match(css, /\.roadgrid\{[^}]*grid-template-rows:repeat\(13/);
});
test("installs and caches an offline app shell", async () => {
  const [page, layout, worker, manifestText] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.match(page, /navigator\.serviceWorker\.register\("\/sw\.js"\)/);
  assert.match(layout, /manifest:"\/manifest\.webmanifest"/);
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.orientation, "landscape");
  assert.equal(manifest.start_url, "/");
  assert.match(worker, /cacheAppShell/);
  assert.match(worker, /html\.matchAll/);
  assert.match(worker, /request\.mode === "navigate"/);
  assert.match(worker, /caches\.match\("\/"\)/);
});
