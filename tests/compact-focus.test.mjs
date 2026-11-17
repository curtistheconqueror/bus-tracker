import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";

const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
const header=page.slice(page.indexOf('<button className="log-card-main log-group-header"'));
const handler=header.match(/onClick=\{([\s\S]*?)\}>\n/)[1].replaceAll("querySelector<HTMLButtonElement>","querySelector");
function runCollapse({cardView="compact",expanded=true,focused=true}={}){
 const group={bus:{id:"fixture"}},frames=[];
 let ids=expanded?[group.bus.id]:[],focusCount=0;
 const document={activeElement:null};
 const opener={focus(){focusCount++;document.activeElement=opener}};
 const card={querySelector(selector){assert.equal(selector,".log-compact-open");return opener}};
 const currentTarget={closest(selector){assert.equal(selector,"article");return card}};
 const other={};document.activeElement=focused?currentTarget:other;
 const onClick=vm.runInNewContext("("+handler+")",{cardView,expanded,document,group,setExpandedBusIds(update){ids=update(ids)},requestAnimationFrame(callback){frames.push(callback)}});
 onClick({currentTarget});frames.forEach(callback=>callback());
 return {ids,focusCount,activeElement:document.activeElement,opener,other,frameCount:frames.length};
}
test("the actual group collapse handler restores a focused compact opener",()=>{
 const result=runCollapse();assert.deepEqual(result.ids,[]);assert.equal(result.focusCount,1);assert.equal(result.activeElement,result.opener);
});
test("collapse does not steal unrelated focus or change detailed-card behavior",()=>{
 const unfocused=runCollapse({focused:false});assert.equal(unfocused.focusCount,0);assert.equal(unfocused.frameCount,0);assert.equal(unfocused.activeElement,unfocused.other);
 const detailed=runCollapse({cardView:"detailed"});assert.deepEqual(detailed.ids,[]);assert.equal(detailed.focusCount,0);
 const opening=runCollapse({expanded:false});assert.deepEqual([...opening.ids],["fixture"]);assert.equal(opening.focusCount,0);
});
function luminance(hex){const c=hex.match(/[a-f\d]{2}/gi).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722}
function contrast(a,b){const light=luminance(a),dark=luminance(b);return (Math.max(light,dark)+.05)/(Math.min(light,dark)+.05)}
test("More menu and dark dock have separately scoped focus outlines above 3:1",async()=>{
 const css=await readFile(new URL("../src/components/shared/tracker-nav.css",import.meta.url),"utf8");
 const menu=css.match(/\.tracker-more-menu :is\(a,button\):focus-visible\{outline:3px solid (#[a-f\d]{6})/i)?.[1];
 const dock=css.match(/\.tracker-bottom-nav :is\(a,button\):focus-visible\{outline:3px solid (#[a-f\d]{6})/i)?.[1];
 assert.ok(menu,"a light menu must not inherit the dock outline");assert.ok(dock,"the navy dock needs its own contrasting outline");
 for(const background of ["#ffffff","#e8f7ef","#edf2f8","#f2f6fa"])assert.ok(contrast(menu,background)>=3,background);
 assert.ok(contrast(dock,"#041d47")>=3);assert.ok(contrast(dock,"#1a3157")>=3);
 assert.match(css,/select:focus-visible\{outline:3px solid currentColor/);
});
