import test from "node:test";
import assert from "node:assert/strict";
import {normalizeDownSheetDisplay} from "../src/lib/down-sheet/down-sheet-display-settings.ts";

test("the Down Sheet title grows slightly without replacing custom sizes", () => {
  const read = (sheetTitle) => normalizeDownSheetDisplay({styles:{sheetTitle}}).styles.sheetTitle;
  assert.equal(read(undefined).fontSize,17);
  assert.deepEqual(read({color:"#123456",fontSize:15}),{color:"#123456",fontSize:17});
  assert.equal(read({fontSize:21}).fontSize,21);
  const chosen = read({fontSize:15,customSize:true});
  assert.equal(chosen.fontSize,15);
  assert.deepEqual(read(JSON.parse(JSON.stringify(chosen))),chosen);
});
