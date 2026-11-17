import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {TRACKER_PAGES} from "../src/lib/settings/tracker-pages.ts";

const nav=await readFile(new URL("../src/components/shared/tracker-nav.tsx",import.meta.url),"utf8");
const css=await readFile(new URL("../src/components/shared/tracker-nav.css",import.meta.url),"utf8");

test("compact navigation partitions the canonical routes without losing secondary pages",()=>{
 const primary=JSON.parse(nav.match(/const PRIMARY=(\[[^;]+\]);/)[1]);
 assert.deepEqual(primary,["/","/down-sheet","/defect-log"]);
 assert.deepEqual(TRACKER_PAGES.filter(page=>!primary.includes(page.href)).map(page=>page.href),["/fixed-repairs","/lists","/incidents","/shop-talk","/settings"]);
 assert.match(nav,/const morePages=pages\.filter\(page=>!PRIMARY\.includes\(page\.href\)\)/);
 assert.match(nav,/page\.href==="\/lists"&&hiddenInLite\(mode,"campaignsPage"\)/);
 assert.match(nav,/pages\.map\(page=><option/);
 assert.match(nav,/morePages\.map\(page=><a/);
});

test("navigation uses native selection, route links, and dismissible non-modal More",()=>{
 assert.match(nav,/select aria-label="Choose page" value=\{active\}/);
 assert.match(nav,/aria-current=\{current\?"page":undefined\}/);
 assert.match(nav,/aria-expanded=\{moreOpen\}/);
 assert.match(nav,/event\.key==="Escape"/);
 assert.match(nav,/moreButton\.current\?\.focus\(\)/);
 assert.match(nav,/document\.removeEventListener\("keydown",onKey\)/);
 assert.match(nav,/createPortal\(/);
 assert.match(nav,/,document\.body\)/);
 assert.match(nav,/useSyncExternalStore\(subscribe,clientSnapshot,serverSnapshot\)/);
 assert.doesNotMatch(nav,/role="menu"/); // Ordinary links retain native Tab semantics.
});

test("mobile shell reserves safe-area space and keeps touch targets usable",()=>{
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(css,/\.tracker-desktop-links\{display:none\}/);
 assert.match(css,/\.tracker-bottom-nav\{[^}]*position:fixed[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)[^}]*env\(safe-area-inset-bottom\)/);
 assert.match(css,/\.tracker-bottom-nav>button\{[^}]*min-height:48px/);
 assert.match(css,/\.tracker-more-menu>a\{[^}]*min-height:46px/);
 assert.match(css,/@media print\{\.tracker-mobile-shell\{display:none\}\}/);
});
