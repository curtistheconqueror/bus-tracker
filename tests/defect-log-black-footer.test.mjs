import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {test} from "node:test";
import postcss from "postcss";

const source=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
const css=postcss.parse(source);
const detailed='.defect-log-app[data-card-view="detailed"]';
const light=detailed+'[data-log-theme="light"]';
function declarations(selector,media){
 const result={};
 css.walkRules(rule=>{
  if(rule.selectors.includes(selector)&&
   (rule.parent.type==="atrule"?rule.parent.params:undefined)===media){
   rule.walkDecls(decl=>{result[decl.prop]=decl.value});
  }
 });
 return result;
}

test("black footer preserves existing scope, height, and text contrast",()=>{
 const marker=".log-bus-end-marker";
 const footer=declarations(detailed+" .log-card-group>"+marker);
 assert.equal(declarations(detailed)["--log-detailed-frame"],"#000");
 assert.equal(footer.background,"var(--log-detailed-frame)");
 assert.equal(footer.color,"#fff");
 assert.equal(footer.display,undefined,"paint must not turn on a hidden footer");
 assert.equal(footer.padding,undefined,"keep the existing footer height");
 assert.equal(declarations(marker).display,"none");
 for(const [scope,media] of [["always",undefined],["phone","(max-width:620px)"]]){
  const enabled=declarations(`.defect-log-app[data-bus-end="${scope}"] ${marker}`,media);
  assert.equal(enabled.display,"block");
  assert.equal(enabled.padding,"9px 10px");
 }
});

test("the detailed light theme uses a thin outline without replacing state rails or custom colors",()=>{
 const outer=declarations(light+" .log-card-group");
 for(const edge of ["top","right","bottom"]) assert.equal(outer[`border-${edge}-width`],"1px");
 assert.equal(outer["border-left"],undefined);
 assert.equal(declarations(light)["--log-card-border"],"var(--log-detailed-frame)");
 assert.equal(declarations(light+" .log-card-group:not(:is(.in-progress,.deferred,.completed,.downing))")["border-left"],"1px solid var(--log-card-border)");
 assert.equal(declarations(light+" .grouped-defect-row")["border-color"],"var(--log-detailed-frame)");
 for(const [scope,media] of [["always",undefined],["phone","(max-width:620px)"]]){
  const rail=declarations(`.defect-log-app[data-bus-rail="${scope}"] .log-card-group`,media);
  assert.equal(rail["padding-left"],"var(--log-group-number-rail-width)");
 }
 const footer=declarations(detailed+" .log-card-group>.log-bus-end-marker");
 assert.equal(footer["margin-left"],"calc(-1 * var(--log-group-number-rail-width,0px))");
});
