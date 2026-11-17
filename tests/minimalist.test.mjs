import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {CARD_VIEW_KEY,readCardView} from "../src/lib/settings/card-view.ts";

test("card density is independent presentation state with a safe default",()=>{
 assert.equal(CARD_VIEW_KEY,"pace-defect-log-card-view-v1");
 for(const raw of [null,"","compact","invalid","{bad}"])assert.equal(readCardView(raw),"compact");
 assert.equal(readCardView("detailed"),"detailed");
});
test("compact cards open the existing complete group, not a duplicate record flow",async()=>{
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 assert.match(page,/cardView==="compact"&&!expanded&&<button className="log-compact-open"/);
 assert.match(page,/Open full details and actions for bus/);
 assert.match(page,/setExpandedBusIds\(current=>current.includes\(group.bus.id\)\?current:\[...current,group.bus.id\]\)/);
 assert.match(page,/const result=writeSetting\(localStorage,CARD_VIEW_KEY,value\)/);
 assert.match(page,/Device storage could not remember it/);
 assert.match(page,/data-card-view=\{cardView\}/);
 assert.match(page,/setCardView\(readCardView\(localStorage.getItem\(CARD_VIEW_KEY\)\)\)/);
});
test("mobile map tools are grouped above the map with only one fixed navigation",async()=>{
 const [page,css]=await Promise.all([readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),readFile(new URL("../app/minimalist.css",import.meta.url),"utf8")]);
 assert.ok(page.indexOf('<nav className="phone-command-dock"')<page.indexOf('<div className={"facility"'));
 assert.match(css,/app>\.phone-command-dock\{position:static/);
 assert.match(css,/padding-bottom:calc\(96px \+ env\(safe-area-inset-bottom\)\)/);
});

test("compact summary preserves operating status and the existing status-colour contract",async()=>{
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 assert.match(page,/className="compact-bus log-bus-number" data-status=\{group.bus.s\}/);
 const compact=page.slice(page.indexOf('className="log-compact-open"'),page.indexOf('className="log-focus-button"'));
 assert.match(compact,/STATUS_LABELS\[group.bus.s\]/);
 assert.match(compact,/requestAnimationFrame/);
 assert.match(compact,/querySelector<HTMLButtonElement>\("\.log-group-header"\)/);
});
test("intermediate mobile widths retain usable tools and selected status filters",async()=>{
 const css=await readFile(new URL("../app/minimalist.css",import.meta.url),"utf8");
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(css,/\.app>\.command-bar\{display:none!important\}/);
 assert.match(css,/\.phone-command-sheet\{display:block;position:fixed/);
 assert.match(css,/legend button\[aria-pressed="true"\]\{[^}]*box-shadow/);
 const nav=await readFile(new URL("../src/components/shared/tracker-nav.css",import.meta.url),"utf8");
 assert.match(nav,/color:var\(--app-header-text,var\(--header-text,#fff\)\)/);
 assert.match(nav,/select\{[^}]*color:inherit;[^}]*16px/);
});
