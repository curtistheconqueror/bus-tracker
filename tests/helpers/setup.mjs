/* Shared test setup: the in-memory LocalStorage stand-in, the production
   worker renderer and the HTML section slicer. */

import assert from "node:assert/strict";

export function memoryStorage(initial={}){
 const values=new Map(Object.entries(initial));
 return {
  getItem:key=>values.has(key)?values.get(key):null,
  setItem:(key,value)=>values.set(key,String(value)),
  value:key=>values.get(key),
 };
}

export async function render(path = "/") {
  const workerUrl = new URL("../../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost" + path, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

export function section(html, start, end) {
  const startIndex = html.indexOf(start);
  const endIndex = html.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `Expected section ${start}`);
  return html.slice(startIndex, endIndex);
}
