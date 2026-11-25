import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {test} from "node:test";
import postcss from "postcss";

const read=name=>readFile(new URL("../app/down-sheet/"+name,import.meta.url),"utf8");

test("tablet spacing and outline are scoped to the actual Down Sheet wrapper and not phones",async()=>{
 const [page,source]=await Promise.all([read("page.tsx"),read("down-sheet-tablet.css")]);
 assert.match(page,/import "\.\/down-sheet-tablet\.css";/);
 assert.match(page,/<main className="down-app"/);
 assert.match(page,/<section className="sheet-wrap">/);
 const [media,...rest]=postcss.parse(source).nodes.filter(node=>node.type!=="comment");
 assert.equal(rest.length,0,"no unscoped overrides");
 assert.equal(media.type,"atrule");
 assert.equal(media.name,"media");
 assert.equal(media.params,"(min-width:761px) and (max-width:1400px) and (min-height:600px) and (any-pointer:coarse)");
 assert.equal(media.nodes.length,1,"only the sheet frame changes");
 const [rule]=media.nodes;
 assert.equal(rule.selector,".down-app > .sheet-wrap");
 assert.deepEqual(rule.nodes.map(({prop,value})=>[prop,value]),[
  ["margin-block-start","18px"],["border","2px solid #000"],
 ]);
});
