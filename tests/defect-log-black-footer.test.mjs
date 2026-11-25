import assert from "node:assert/strict";
import {mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";
import {test} from "node:test";
import postcss from "postcss";
import {DEFAULT_SETTINGS, LOG_THEMES, logOutlineSwatch} from "../src/lib/defects/defect-log-settings.ts";

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
 assert.equal(outer.border,"1px solid var(--log-card-border)");
 assert.equal(declarations(light)["--log-card-border"],"var(--log-detailed-frame)");

 assert.equal(declarations(light+" .grouped-defect-row")["border-color"],"var(--log-detailed-frame)");
 for(const [scope,media] of [["always",undefined],["phone","(max-width:620px)"]]){
  const rail=declarations(`.defect-log-app[data-bus-rail="${scope}"] .log-card-group`,media);
  assert.equal(rail["padding-left"],"var(--log-group-number-rail-width)");
 }
 const footer=declarations(detailed+" .log-card-group>.log-bus-end-marker");
 assert.equal(footer.position,"relative");
 assert.equal(footer["z-index"],"2");
 assert.equal(footer["margin-left"],"calc(-1 * var(--log-group-number-rail-width,0px))");
});

test("real Defect Log markup uses saved theme and card view, and Settings uses the resolved swatch",async()=>{
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 const settings=await readFile(new URL("../app/settings/_components/defect-log-settings-modal.tsx",import.meta.url),"utf8");
 assert.match(page,/<main className="defect-log-app"[^>]*data-log-theme=\{settings\.theme\}/);
 assert.match(page,/data-card-view=\{cardView\}/);
 assert.match(settings,/readCardView\(localStorage\.getItem\(CARD_VIEW_KEY\)\)/);
 assert.match(settings,/value=\{logOutlineSwatch\(settings,cardView\)\}/);
});

test("outline swatch follows view and actual theme until explicitly customized",()=>{
 assert.equal(logOutlineSwatch(DEFAULT_SETTINGS,"detailed"),"#000000");
 assert.equal(logOutlineSwatch(DEFAULT_SETTINGS,"compact"),"#9ea6b4");
 const dark={...DEFAULT_SETTINGS,theme:"dark",appearance:LOG_THEMES.dark.appearance};
 const custom={...DEFAULT_SETTINGS,theme:"custom",appearance:{...DEFAULT_SETTINGS.appearance,text:"#ffffff",surface:"#000000"}};
 assert.equal(logOutlineSwatch(custom,"detailed"),"#6b6b6b");
 assert.equal(logOutlineSwatch(dark,"detailed"),logOutlineSwatch(dark,"compact"));
 assert.notEqual(logOutlineSwatch(dark,"detailed"),"#000000");
 assert.equal(logOutlineSwatch({...dark,groupBorder:"#123456"},"detailed"),"#123456");
});

test("Chromium: work-state changes keep the card and footer aligned",async t=>{
 // Locally the browser is optional; on GitHub's hosted runner this is a required gate.
 const candidates=process.env.CHROME_BIN?[process.env.CHROME_BIN]:["google-chrome","chromium","chromium-browser"];
 const chrome=candidates.find(bin=>spawnSync(bin,["--version"],{timeout:5000,stdio:"ignore"}).status===0);
 if(!chrome){
  assert.notEqual(process.env.GITHUB_ACTIONS,"true","CI requires Chrome for the card geometry regression");
  t.skip("Chrome unavailable; set CHROME_BIN to run the layout fixture");
  return;
 }
 const dir=await mkdtemp(join(tmpdir(),"fleetstep-layout-"));
 try {
  const fixture=join(dir,"card.html");
  const swatches=Object.fromEntries(Object.entries(LOG_THEMES).map(([theme,{appearance}])=>[theme,{
   appearance, compact:logOutlineSwatch({...DEFAULT_SETTINGS,theme,appearance},"compact")
  }]));
  // Real stylesheet in an isolated page. The fixture has no app runtime,
  // requests, or fleet records; it exercises the layout and paint contracts.
  const card=`<!doctype html><meta charset="utf-8"><style>${source}</style>
    <main class="defect-log-app" data-card-view="detailed" data-log-theme="light" data-group-contrast="strong" data-bus-rail="off" data-bus-end="always">
     <div class="log-list"><article class="log-card log-card-group open expanded">
      <div class="log-bus-column">TEST BUS</div><button class="log-group-header">DETAILED</button>
      <div class="grouped-defect-list"><section class="grouped-defect-row">Test defect</section></div>
      <p class="log-bus-end-marker">END OF BUS</p>
     </article></div></main>`;
  await writeFile(fixture,`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; frame-src 'self' about:"><body><pre id="result">pending</pre><script>
    const fixture=${JSON.stringify(card).replaceAll("<","\\u003c")};
    const swatches=${JSON.stringify(swatches)};
    const expect=(ok,label)=>{ if(!ok) throw Error(label) };
    const asHex=str=>"#"+str.match(/\\d+(?:\\.\\d+)?/g).map(n=>Math.round(+n).toString(16).padStart(2,"0")).join("");
    const run=async()=>{
     for(const width of [320,390,1280]){
      const f=document.createElement("iframe"); f.style.width=width+"px"; f.style.height="400px"; f.srcdoc=fixture;
      await new Promise(resolve=>{f.onload=resolve;document.body.append(f)});
      const d=f.contentDocument, w=f.contentWindow, main=d.querySelector("main"), card=d.querySelector("article"), footer=d.querySelector("p");
      const row=d.querySelector(".grouped-defect-row"), lefts=()=>[card,...d.querySelectorAll(".log-bus-column,.log-group-header,.grouped-defect-row,.log-bus-end-marker")].map(x=>x.getBoundingClientRect().left).join(",");
      const setTheme=theme=>{
       main.dataset.logTheme=theme;
       for(const key of ["text","surface","page","muted","accent"]) main.style.setProperty("--log-"+key,swatches[theme].appearance[key]);
      };
      setTheme("light");
      for(const contrast of ["strong","standard"]) for(const rail of ["off","always","phone"]){
       main.dataset.groupContrast=contrast; main.dataset.busRail=rail;
       card.className="log-card log-card-group open expanded";
       const base=lefts();
       for(const [state,color] of [["in-progress","rgb(229, 160, 0)"],["deferred","rgb(14, 116, 144)"],["completed","rgb(19, 128, 74)"],["downing","rgb(191, 37, 45)"],["open",null]]){
        card.className="log-card log-card-group expanded "+state;
        const label=[width,contrast,rail,state].join("/");
        expect(lefts()===base,label+" state moved content");
        const style=w.getComputedStyle(card);
        expect(style.borderLeftWidth==="1px"&&style.borderLeftColor==="rgb(0, 0, 0)",label+" lost the thin frame");
        const stripe=w.getComputedStyle(card,"::before");
        expect(color?(stripe.backgroundColor===color&&stripe.width===(contrast==="strong"?"6px":"4px")):stripe.content==="none",label+" wrong status stripe");
        const rect=footer.getBoundingClientRect(), frame=card.getBoundingClientRect();
        expect(rect.left===frame.left+1&&rect.right===frame.right-1,label+" footer stops short");
        expect(d.elementFromPoint(rect.left+12,rect.top+rect.height/2)===footer,label+" number rail covers footer");
        expect(w.getComputedStyle(footer).backgroundColor==="rgb(0, 0, 0)",label+" wrong footer tone");
       }
       main.dataset.busEnd="off";
       expect(w.getComputedStyle(footer).display==="none","Off no longer hides footer");
       main.dataset.busEnd="phone";
       expect((w.getComputedStyle(footer).display!=="none")===(width<=620),"Phone visibility breakpoint");
       main.dataset.busEnd="always";
      }
      for(const theme of Object.keys(swatches)){
       setTheme(theme);
       for(const view of ["detailed","compact"]){
        main.dataset.cardView=view;
        const blend=swatches[theme].compact, lightDetailed=theme==="light"&&view==="detailed";
        // CSS serializes color-mix as color(srgb...), with float channels.
        const resolved=w.getComputedStyle(card).borderRightColor;
        const hex=resolved.startsWith("color(srgb")?"#"+resolved.match(/\\d+(?:\\.\\d+)?/g).map(n=>Math.round(+n*255).toString(16).padStart(2,"0")).join(""):asHex(resolved);
        expect(hex===(lightDetailed?"#000000":blend),width+" "+theme+"/"+view+" color mismatch: "+hex);
        if(lightDetailed) expect(w.getComputedStyle(row).borderLeftColor==="rgb(0, 0, 0)","defect outline is not black");
       }
      }
      setTheme("light");main.dataset.cardView="detailed";
      main.style.setProperty("--log-card-border","#123456");
      expect(w.getComputedStyle(card).borderLeftColor==="rgb(18, 52, 86)","custom color was overridden");
      f.remove();
     }
    };
    const result=document.getElementById("result");
    run().then(()=>result.textContent="PASS",e=>result.textContent="FAIL: "+e.message);
  </script>`);
  const result=spawnSync(chrome,["--headless","--disable-gpu","--disable-dev-shm-usage","--disable-background-networking","--no-first-run",
   "--virtual-time-budget=5000","--dump-dom","--user-data-dir="+join(dir,"profile"),pathToFileURL(fixture).href],{encoding:"utf8",timeout:30000,maxBuffer:4*1024*1024});
  assert.ifError(result.error);
  assert.equal(result.status,0,result.stderr?.slice(-1500));
  assert.match(result.stdout,/<pre id="result">PASS<\/pre>/,result.stdout?.match(/<pre id="result">[^<]*/)?.[0]||"fixture did not complete");
 } finally {await rm(dir,{force:true,recursive:true})}
});
