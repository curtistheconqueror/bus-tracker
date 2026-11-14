/* SCAN PAPER: which sheet a photo is, and getting it to the scanner that reads it. */

import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");
/* Comments out, so an assertion about the code cannot be satisfied by prose
   about the code. The same naive strip the other suites use; none of the files
   read through it holds a string with a comment opener in it. */
const code = source => source.replace(/\/\*[\s\S]*?\*\//g, "");
const count = (source, pattern) => (source.match(pattern) || []).length;

const page = (number, kind, confidence = 0.95) => ({ page: number, kind, confidence });

const SCANNERS = [
  ["heat", "../app/defect-log/_components/heat-scanner.tsx", "readSheets", false, "sweep-handed"],
  ["sweep", "../app/defect-log/_components/sweep-scanner.tsx", "readSheets", true, "sweep-handed"],
  ["down-sheet", "../app/down-sheet/_components/down-sheet-scanner.tsx", "readSheet", true, "scan-handed"],
];

test("the table of sheets: three kinds, each read on a page this app has", async () => {
  const { PAPER_KINDS, PAPER_MAX_PHOTOS, isPaperKind, paperKind, paperNamed, paperNamedInSentence, paperListWords, paperPageLabel } = await import("../src/lib/scan/paper-kinds.ts");
  const { TRACKER_PAGES } = await import("../src/lib/settings/tracker-pages.ts");
  assert.deepEqual(PAPER_KINDS.map(item => item.kind), ["down-sheet", "sweep", "heat"]);
  assert.equal(new Set(PAPER_KINDS.map(item => item.label)).size, 3, "no two sheets share a name");
  for (const item of PAPER_KINDS) {
    assert.ok(TRACKER_PAGES.some(entry => entry.href === item.route), item.kind + " is read on a page the nav knows");
    assert.ok(item.looksLike.length > 80, item.kind + " is described well enough to be told apart");
    assert.equal(paperKind(item.kind), item);
  }
  /* The page NAME is never typed here: it is whatever the nav calls that route. */
  assert.equal(paperPageLabel("down-sheet"), TRACKER_PAGES.find(entry => entry.href === "/down-sheet").label);
  assert.equal(paperPageLabel("heat"), TRACKER_PAGES.find(entry => entry.href === "/defect-log").label);
  assert.equal(paperNamed("down-sheet"), "A VEHICLE DOWN SHEET");
  assert.equal(paperNamed("heat"), "A HEAT CHECK SHEET");
  /* ONE NAME PER SHEET. The shouted label is the sentence name in capitals,
     derived, so a heading and a sentence cannot name a sheet differently —
     and "Ventra" keeps its capital in a sentence. */
  for (const item of PAPER_KINDS) assert.equal(item.label, item.name.toUpperCase(), item.kind);
  assert.deepEqual(PAPER_KINDS.map(item => item.label), ["VEHICLE DOWN SHEET", "FAREBOX / VENTRA SWEEP", "HEAT CHECK SHEET"]);
  assert.equal(paperNamedInSentence("down-sheet"), "a Vehicle Down Sheet");
  assert.equal(paperNamedInSentence("sweep"), "a farebox / Ventra sweep");
  assert.equal(paperListWords(), "A Vehicle Down Sheet, a farebox / Ventra sweep, or a heat check sheet");
  assert.doesNotMatch(await read("../src/lib/scan/paper-kinds.ts"), /label:"/, "no label is typed by hand");
  for (const bad of ["", "other", "Heat", "HEAT", "ventra", null, undefined, 3, {}]) assert.equal(isPaperKind(bad), false, JSON.stringify(bad) + " is not a sheet");
  /* AN UNKNOWN KIND IS A BUG, NOT THE DOWN SHEET. The lookup fell back to the
     first row once, and the first row is the one scanner that replaces a
     record. */
  assert.throws(() => paperKind("bogus"), /Unknown kind of paper: bogus/);
  assert.throws(() => paperPageLabel("bogus"));
  /* No scanner takes fewer photos than SCAN PAPER can hand it. */
  for (const [, file] of SCANNERS) {
    const limit = Number((await read(file)).match(/const MAX_FILES=(\d+);/)?.[1]);
    assert.ok(limit >= PAPER_MAX_PHOTOS, file + " takes at least " + PAPER_MAX_PHOTOS + " photos");
  }
});

test("the address one page uses to ask another for a scanner", async () => {
  const { paperScanHref, paperArrival, PAPER_MAX_PHOTOS } = await import("../src/lib/scan/paper-kinds.ts");
  const { heatScanHref, HEAT_SCAN_PARAM, HEAT_SCAN_VALUE } = await import("../src/lib/defects/heat-check-log.ts");
  assert.equal(paperScanHref("down-sheet", 2), "/down-sheet?scan=down-sheet&photos=2");
  assert.equal(paperScanHref("sweep", 1), "/defect-log?scan=sweep&photos=1");
  assert.equal(paperScanHref("heat"), "/defect-log?scan=heat", "no photos, no count: the address Fleet Campaigns has always used");
  assert.equal(heatScanHref(), paperScanHref("heat"), "the campaign's link is the same address, not a second spelling of it");
  assert.equal(HEAT_SCAN_PARAM, "scan");
  assert.equal(HEAT_SCAN_VALUE, "heat");
  assert.equal(paperScanHref("heat", 99), "/defect-log?scan=heat&photos=" + PAPER_MAX_PHOTOS, "never asks for more than a scanner takes");
  assert.equal(paperScanHref("heat", -3), "/defect-log?scan=heat");
  assert.equal(paperScanHref("heat", "x"), "/defect-log?scan=heat");
  assert.throws(() => paperScanHref("bogus", 2), "an address is never built for a sheet that does not exist");

  assert.deepEqual(paperArrival("?scan=down-sheet&photos=2", "/down-sheet"), { kind: "down-sheet", expected: 2 });
  assert.deepEqual(paperArrival("?scan=heat", "/defect-log"), { kind: "heat", expected: 0 });
  assert.deepEqual(paperArrival("?quick=no-heat&scan=sweep&photos=6", "/defect-log"), { kind: "sweep", expected: 6 });
  /* THE WRONG PAGE OPENS NOTHING. A heat sheet asked of the Down Sheet has no
     scanner there, and opening the one that IS there is the mistake. */
  assert.equal(paperArrival("?scan=heat&photos=1", "/down-sheet"), null);
  assert.equal(paperArrival("?scan=down-sheet&photos=1", "/defect-log"), null);
  assert.equal(paperArrival("?scan=other", "/defect-log"), null);
  assert.equal(paperArrival("?scan=bogus&photos=2", "/down-sheet"), null, "a sheet nobody has heard of opens nothing, and does not throw");
  assert.equal(paperArrival("", "/defect-log"), null);
  assert.equal(paperArrival("?photos=3", "/defect-log"), null, "a count with no sheet asks for nothing");
  for (const junk of ["-1", "1.5", "abc", "1e3", "", " 2"]) assert.deepEqual(paperArrival("?scan=heat&photos=" + encodeURIComponent(junk), "/defect-log"), { kind: "heat", expected: 0 }, "photos=" + junk + " expects none");
  assert.deepEqual(paperArrival("?scan=heat&photos=40", "/defect-log"), { kind: "heat", expected: PAPER_MAX_PHOTOS });
});

test("nothing the first look sends back is trusted as it arrives", async () => {
  const { normalizePaperPages, paperPlaced, PAPER_SURE } = await import("../src/lib/scan/paper-identify.ts");
  assert.deepEqual(normalizePaperPages({ pages: [{ page: 1, document: "heat", confidence: 0.9 }] }, 1), [page(1, "heat", 0.9)]);
  /* One entry per photo SENT, in order, whatever came back. */
  assert.deepEqual(normalizePaperPages({ pages: [{ page: 2, document: "sweep", confidence: 0.8 }] }, 3), [page(1, "other", 0), page(2, "sweep", 0.8), page(3, "other", 0)]);
  assert.deepEqual(normalizePaperPages({ pages: [{ page: 2, document: "heat", confidence: 1 }, { page: 1, document: "heat", confidence: 1 }] }, 2).map(item => item.page), [1, 2]);
  /* A page that was never sent, a second answer for one that was, and a kind
     this app does not have. */
  assert.deepEqual(normalizePaperPages({ pages: [{ page: 5, document: "heat", confidence: 1 }, { page: 0, document: "heat", confidence: 1 }, { page: 1.5, document: "heat", confidence: 1 }, { page: "1", document: "heat", confidence: 1 }] }, 1), [page(1, "other", 0)]);
  assert.deepEqual(normalizePaperPages({ pages: [{ page: 1, document: "sweep", confidence: 0.9 }, { page: 1, document: "heat", confidence: 1 }] }, 1), [page(1, "sweep", 0.9)], "the first answer for a page stands");
  for (const document of ["ventra", "Heat", "DOWN-SHEET", "", 7, null, undefined, ["heat"]]) assert.equal(normalizePaperPages({ pages: [{ page: 1, document, confidence: 1 }] }, 1)[0].kind, "other", JSON.stringify(document));
  /* Confidence is a number between 0 and 1 or it is nothing. */
  for (const [given, kept] of [[1.7, 1], [-0.2, 0], ["0.9", 0], [NaN, 0], [Infinity, 0], [null, 0], [undefined, 0]]) assert.equal(normalizePaperPages({ pages: [{ page: 1, document: "heat", confidence: given }] }, 1)[0].confidence, kept, String(given));
  for (const payload of [null, undefined, "heat", 4, [], {}, { pages: "heat" }, { pages: [null, 3, "x", []] }]) assert.deepEqual(normalizePaperPages(payload, 2), [page(1, "other", 0), page(2, "other", 0)], JSON.stringify(payload));
  assert.deepEqual(normalizePaperPages({ pages: [{ page: 1, document: "heat", confidence: 1 }] }, 0), []);

  /* AN ANSWER THE READER WAS UNSURE OF IS NOT AN ANSWER. */
  assert.equal(paperPlaced(page(1, "heat", PAPER_SURE)), "heat", "exactly sure enough counts");
  assert.equal(paperPlaced(page(1, "heat", PAPER_SURE - 0.01)), null);
  assert.equal(paperPlaced(page(1, "other", 1)), null, "a confident 'other' is still not a sheet");
});

test("the app decides by itself only when every page agrees", async () => {
  const { paperVerdict, paperChoice, paperUnread } = await import("../src/lib/scan/paper-identify.ts");
  assert.deepEqual(paperVerdict([page(1, "heat")]), { decided: true, choice: { kind: "heat", send: [1], leftOut: [] } });
  assert.deepEqual(paperVerdict([page(1, "sweep"), page(2, "sweep"), page(3, "sweep")]), { decided: true, choice: { kind: "sweep", send: [1, 2, 3], leftOut: [] } });
  assert.equal(paperVerdict([]).decided, false, "no photos is never a decision");

  /* ONE UNPLACED PAGE IS ENOUGH TO ASK. The page that was placed is offered
     first; the others are offered too, because the unplaced page could be
     any of them. */
  const partly = paperVerdict([page(1, "heat"), page(2, "other", 0)]);
  assert.equal(partly.decided, false);
  assert.equal(partly.why, "unplaced");
  assert.deepEqual(partly.choices.map(choice => choice.kind), ["heat", "down-sheet", "sweep"]);
  assert.deepEqual(partly.choices[0], { kind: "heat", send: [1, 2], leftOut: [] }, "the page nobody could place goes along with the one that was");
  assert.deepEqual(partly.choices[1], { kind: "down-sheet", send: [2], leftOut: [{ page: 1, kind: "heat" }] }, "and the heat page never goes to the Down Sheet scanner");
  /* Unsure counts as unplaced, not as agreement. */
  assert.equal(paperVerdict([page(1, "heat"), page(2, "heat", 0.4)]).decided, false);
  assert.equal(paperVerdict([page(1, "heat", 0.59)]).decided, false);

  /* TWO DIFFERENT SHEETS: asked, and only the sheets that are there are
     offered. Picking one sends its own pages and names the rest. */
  const mixed = paperVerdict([page(1, "down-sheet"), page(2, "heat"), page(3, "heat")]);
  assert.equal(mixed.decided, false);
  assert.equal(mixed.why, "mixed");
  assert.deepEqual(mixed.choices, [
    { kind: "down-sheet", send: [1], leftOut: [{ page: 2, kind: "heat" }, { page: 3, kind: "heat" }] },
    { kind: "heat", send: [2, 3], leftOut: [{ page: 1, kind: "down-sheet" }] },
  ], "the sweep scanner is not offered: no page would go to it");
  /* With a page nobody could place in the batch, every sheet can be picked. */
  const mixedAndLost = paperVerdict([page(1, "down-sheet"), page(2, "heat"), page(3, "other")]);
  assert.equal(mixedAndLost.why, "mixed");
  assert.deepEqual(mixedAndLost.choices.map(choice => [choice.kind, choice.send]), [["down-sheet", [1, 3]], ["heat", [2, 3]], ["sweep", [3]]]);

  /* Nothing placed at all: every sheet, every page. */
  const lost = paperVerdict([page(1, "other", 0.9), page(2, "other", 0)]);
  assert.equal(lost.why, "unplaced");
  assert.deepEqual(lost.choices.map(choice => [choice.kind, choice.send, choice.leftOut]), [["down-sheet", [1, 2], []], ["sweep", [1, 2], []], ["heat", [1, 2], []]]);

  /* NO CHOICE EVER SENDS A PAGE THAT WAS PLACED AS ANOTHER SHEET, whatever is
     asked. "Placed" is the PAPER_SURE line: the same kinds at 0.5 all go
     along, which is why the screen has to say so — see the next test. */
  const kinds = ["down-sheet", "sweep", "heat", "other"];
  for (const first of kinds) for (const second of kinds) for (const pick of ["down-sheet", "sweep", "heat"]) {
    const pages = [page(1, first), page(2, second)], choice = paperChoice(pages, pick);
    for (const sent of choice.send) assert.ok(["other", pick].includes(pages[sent - 1].kind), pick + " was sent a " + pages[sent - 1].kind);
    assert.equal(choice.send.length + choice.leftOut.length, 2, "every page is either sent or named as left out");
    assert.deepEqual(paperChoice([page(1, first, 0.5), page(2, second, 0.5)], pick), { kind: pick, send: [1, 2], leftOut: [] }, "a page the reader only leaned on is not held back");
  }

  /* THE LOOK NEVER HAPPENED: asked, everything offered, everything sent. */
  assert.deepEqual(paperUnread(2), { decided: false, why: "unread", choices: [
    { kind: "down-sheet", send: [1, 2], leftOut: [] }, { kind: "sweep", send: [1, 2], leftOut: [] }, { kind: "heat", send: [1, 2], leftOut: [] }] });
});

test("what the person is told, in the words the screen draws", async () => {
  const { paperVerdict, paperUnread, paperAskWords, paperLeftOutWords, paperPagesWords, paperWhereWords, paperReadsAsWords, normalizePaperPages } = await import("../src/lib/scan/paper-identify.ts");
  const ask = pages => paperAskWords(paperVerdict(pages), pages);
  assert.equal(paperPagesWords([2]), "PAGE 2");
  assert.equal(paperPagesWords([1, 3]), "PAGES 1 AND 3");
  assert.equal(paperPagesWords([1, 2, 4]), "PAGES 1, 2 AND 4");
  assert.equal(paperPagesWords([]), "NO PAGES");
  assert.equal(paperReadsAsWords("sweep"), "THIS READS AS A FAREBOX / VENTRA SWEEP");

  const mixedPages = [page(1, "down-sheet"), page(2, "heat"), page(3, "heat"), page(4, "other", 0)], mixed = paperVerdict(mixedPages);
  assert.equal(paperAskWords(mixed, mixedPages), "These photos are not all the same sheet: page 1 reads as a Vehicle Down Sheet and pages 2 and 3 as a heat check sheet. PAGE 4 could not be made out. Each kind is read on its own, so pick which to read now.");
  /* WHAT A CHOICE LEAVES OUT says what the page reads as and gives no advice.
     It told people to "scan it on its own next" — the wrong advice exactly
     when the look was wrong and the page belongs to the sheet being picked. */
  assert.equal(paperLeftOutWords(mixed.choices[0]), "LEAVES OUT PAGES 2 AND 3, which read as a heat check sheet.");
  assert.equal(paperLeftOutWords(mixed.choices[1]), "LEAVES OUT PAGE 1, which reads as a Vehicle Down Sheet.");
  assert.equal(paperLeftOutWords(mixed.choices[2]), "LEAVES OUT PAGE 1, which reads as a Vehicle Down Sheet, AND PAGES 2 AND 3, which read as a heat check sheet.");
  assert.equal(paperLeftOutWords({ kind: "heat", send: [1], leftOut: [] }), "", "nothing left out, nothing said");
  for (const choice of mixed.choices) assert.doesNotMatch(paperLeftOutWords(choice), /on (its|their) own/i);

  /* WHY A PAGE WAS NOT PLACED, because the three reasons are different and
     the person is about to send that page somewhere. They were one sentence,
     which hid the case where the reader was SURE the page is no shop sheet and
     threw away the sheet it leaned towards. */
  assert.equal(ask([page(1, "heat"), page(2, "other", 0)]), "PAGE 2 could not be made out. Pick the sheet these are. Every page named here goes with the one you pick.");
  assert.equal(ask([page(1, "down-sheet"), page(2, "other", 0.99)]), "PAGE 2 does not look like any of these sheets. Pick the sheet these are. Every page named here goes with the one you pick.");
  assert.equal(ask([page(1, "down-sheet"), page(2, "heat", 0.59)]), "PAGE 2 might be a heat check sheet, but the reader was not sure. Pick the sheet these are. Every page named here goes with the one you pick.");
  assert.equal(ask([page(1, "other", 0.99), page(2, "heat", 0.2), page(3, "other", 0.1), page(4, "other", 0.7)]), "PAGES 1 AND 4 do not look like any of these sheets. PAGE 2 might be a heat check sheet, but the reader was not sure. PAGE 3 could not be made out. Pick the sheet these are. Every page named here goes with the one you pick.");
  assert.equal(ask([page(1, "other", 0)]), "PAGE 1 could not be made out. Pick the sheet it is.");
  assert.equal(ask([page(1, "sweep", 0.3)]), "PAGE 1 might be a farebox / Ventra sweep, but the reader was not sure. Pick the sheet it is.");
  /* A failed look says why, once, without a doubled full stop. */
  assert.equal(paperAskWords(paperUnread(1), normalizePaperPages(null, 1), "Photo processing is not configured yet."), "The photos could not be looked at first (Photo processing is not configured yet), so pick the sheet yourself.");
  assert.equal(paperAskWords(paperUnread(1), normalizePaperPages(null, 1)), "The photos could not be looked at first, so pick the sheet yourself.");
  assert.equal(ask([page(1, "heat")]), "", "a decision asks nothing");

  assert.equal(paperWhereWords("heat", "/defect-log"), "READ HERE");
  assert.equal(paperWhereWords("heat", "/down-sheet"), "READ ON THE DEFECT LOG PAGE");
  assert.equal(paperWhereWords("down-sheet", "/defect-log"), "READ ON THE DOWN SHEET PAGE");
});

test("the question the first look asks is built from the table of sheets", async () => {
  const { paperIdentifyPrompt, PAPER_DOCUMENT_VALUES, PAPER_SURE } = await import("../src/lib/scan/paper-identify.ts");
  const { PAPER_KINDS } = await import("../src/lib/scan/paper-kinds.ts");
  const prompt = paperIdentifyPrompt();
  for (const item of PAPER_KINDS) {
    assert.ok(prompt.includes("- \"" + item.kind + "\": " + item.looksLike), item.kind + " is described in the prompt in the table's own words");
  }
  assert.deepEqual([...PAPER_DOCUMENT_VALUES], [...PAPER_KINDS.map(item => item.kind), "other"], "the answer may be any sheet in the table, or 'other', and nothing else");
  assert.ok(prompt.includes("confidence below " + PAPER_SURE), "the threshold the app applies is the one the reader is told");
  assert.match(prompt, /do not return any bus numbers/i, "the look identifies; it does not read");
  /* Nothing outside the table's own rows counts the sheets, so a fourth row
     does not leave the prompt saying "all three". */
  const frame = PAPER_KINDS.reduce((text, item) => text.replace(item.looksLike, ""), prompt);
  assert.doesNotMatch(frame, /\b(three|two|four|3|4)\b/i);

  const route = await read("../app/api/scan-identify/route.ts");
  assert.match(code(route), /text:paperIdentifyPrompt\(\)/, "the route asks the table's question and writes none of its own");
  assert.match(code(route), /enum:\[\.\.\.PAPER_DOCUMENT_VALUES\]/);
  assert.match(code(route), /files\.length>PAPER_MAX_PHOTOS/);
  assert.ok(route.includes("OPENROUTER_API_KEY"));
  assert.ok(route.includes("https://openrouter.ai/api/v1/chat/completions"));
  assert.match(code(route), /if\(!key\)return json\(\{error:"Photo processing is not configured yet\."\},503\)/);
  /* It decides nothing: no verdict, no threshold, no kind is named in it. */
  assert.doesNotMatch(code(route), /paperVerdict|paperPlaced|PAPER_SURE|"heat"|"sweep"|"down-sheet"/);
});

test("the photos go from SCAN PAPER to a scanner once, in memory, whole or not at all", async () => {
  const { offerPaperPhotos, takePaperPhotos, paperHandIn, handedFiles, handedStart, paperLostWords, paperHandedWords, paperHeldBackWords, PAPER_HANDOFF_MS } = await import("../src/lib/scan/paper-handoff.ts");
  const a = { name: "a.jpg" }, b = { name: "b.jpg" }, T = 1_000_000, none = { files: [], leftOut: 0 };

  offerPaperPhotos("heat", [a, b], 0, T);
  assert.deepEqual(takePaperPhotos("heat", T + 500), { files: [a, b], leftOut: 0 });
  assert.deepEqual(takePaperPhotos("heat", T + 600), none, "taken once");

  /* PHOTOS OFFERED FOR ONE SHEET ARE NEVER COLLECTED FOR ANOTHER — and are not
     left for a third request either. */
  offerPaperPhotos("down-sheet", [a], 0, T);
  assert.deepEqual(takePaperPhotos("sweep", T + 1), none);
  assert.deepEqual(takePaperPhotos("down-sheet", T + 2), none, "the wrong request emptied the holder");

  /* For the next page, not for later. */
  offerPaperPhotos("sweep", [a], 0, T);
  assert.deepEqual(takePaperPhotos("sweep", T + PAPER_HANDOFF_MS + 1), none);
  offerPaperPhotos("sweep", [a], 0, T);
  assert.deepEqual(takePaperPhotos("sweep", T + PAPER_HANDOFF_MS).files, [a]);
  offerPaperPhotos("sweep", [a], 0, T);
  assert.deepEqual(takePaperPhotos("sweep", T - 5), none, "a clock that went backwards hands nothing over");

  /* The holder keeps its own list: emptying the caller's array afterwards
     does not empty the hand-off. */
  const mine = [a, b];
  offerPaperPhotos("heat", mine, 0, T); mine.length = 0;
  assert.deepEqual(takePaperPhotos("heat", T).files, [a, b]);

  /* HOW MANY PAGES WERE HELD BACK TRAVELS WITH THE PHOTOS, and is a whole
     number or nothing. */
  offerPaperPhotos("down-sheet", [a], 2, T);
  assert.deepEqual(takePaperPhotos("down-sheet", T), { files: [a], leftOut: 2 });
  for (const junk of [-1, NaN, "x", null, undefined]) { offerPaperPhotos("heat", [a], junk, T); assert.equal(takePaperPhotos("heat", T).leftOut, 0, String(junk)); }
  offerPaperPhotos("heat", [a], 1.9, T); assert.equal(takePaperPhotos("heat", T).leftOut, 1);

  /* ARRIVING. The address says how many were sent; the result says whether
     they came. */
  offerPaperPhotos("down-sheet", [a, b], 1, T);
  assert.deepEqual(paperHandIn("?scan=down-sheet&photos=2", "/down-sheet", T + 1), { kind: "down-sheet", files: [a, b], expected: 2, leftOut: 1 });
  assert.deepEqual(paperHandIn("?scan=down-sheet&photos=2", "/down-sheet", T + 2), { kind: "down-sheet", files: [], expected: 2, leftOut: 0 }, "a reload: the request is still in the address and the photos are gone");
  assert.equal(paperHandIn("?scan=heat&photos=1", "/down-sheet", T), null, "not this page's sheet");
  assert.equal(paperHandIn("", "/down-sheet", T), null);
  /* The campaign's link sends no photos and takes none — photos waiting for
     another scanner are not swallowed by it. */
  offerPaperPhotos("sweep", [a], 0, T);
  assert.deepEqual(paperHandIn("?scan=heat", "/defect-log", T), { kind: "heat", files: [], expected: 0, leftOut: 0 });
  assert.deepEqual(takePaperPhotos("sweep", T).files, [a]);
  /* ALL OF THEM OR NONE OF THEM. A hand-off that does not match the count in
     the address is lost outright, in both directions: part of a sheet read as
     the whole of it is worse than reading nothing, and on the Down Sheet part
     of a sheet would replace the sheet. */
  offerPaperPhotos("down-sheet", [a, b], 0, T);
  assert.deepEqual(paperHandIn("?scan=down-sheet&photos=3", "/down-sheet", T), { kind: "down-sheet", files: [], expected: 3, leftOut: 0 }, "two arrived where three were sent: none are used");
  offerPaperPhotos("heat", [a, b], 4, T);
  assert.deepEqual(paperHandIn("?scan=heat&photos=1", "/defect-log", T), { kind: "heat", files: [], expected: 1, leftOut: 0 }, "nor are two used where one was sent");

  /* WHAT A SCANNER STARTS WITH. Only a hand-off for its own sheet counts. */
  const handed = { kind: "heat", files: [a, b], expected: 2, leftOut: 0 };
  const quiet = { files: [], lost: "", note: "", warning: "", read: false };
  assert.deepEqual(handedFiles(handed, "heat"), [a, b]);
  assert.deepEqual(handedFiles(handed, "sweep"), [], "the sweep scanner on the same page does not pick up the heat sheet's photos");
  assert.deepEqual(handedFiles(null, "heat"), []);
  assert.deepEqual(handedFiles(undefined, "heat"), []);
  assert.deepEqual(handedStart(handed, "heat"), { files: [a, b], lost: "", note: "OPENED BY SCAN PAPER AS A HEAT CHECK SHEET. The photos taken there are read straight away.", warning: "", read: true });
  assert.deepEqual(handedStart(handed, "sweep"), quiet);
  assert.deepEqual(handedStart(null, "heat"), quiet, "the scanner's own button: empty, silent, and it waits to be told to read");
  assert.deepEqual(handedStart({ kind: "heat", files: [], expected: 0, leftOut: 0 }, "heat"), quiet, "the campaign's link: the same");

  /* LOST ON THE WAY IS SAID, and nothing is read. */
  const lost = handedStart({ kind: "down-sheet", files: [], expected: 1, leftOut: 0 }, "down-sheet");
  assert.deepEqual(lost, { ...quiet, lost: "The photo did not come across from the other page. Add it again." });
  assert.equal(paperLostWords({ kind: "down-sheet", files: [], expected: 3, leftOut: 0 }, "down-sheet"), "The 3 photos did not come across from the other page. Add them again.");
  assert.equal(paperLostWords({ kind: "down-sheet", files: [], expected: 2, leftOut: 0 }, "heat"), "", "another scanner's loss is not this one's to report");
  assert.equal(paperLostWords(handed, "heat"), "");
  assert.equal(paperHandedWords({ kind: "sweep", files: [a], expected: 1, leftOut: 0 }, "sweep"), "OPENED BY SCAN PAPER AS A FAREBOX / VENTRA SWEEP. The photos taken there are read straight away.");

  /* PAGES HELD BACK ARE SAID IN THE SCANNER, where the photos can be changed.
     The first look is a guess about each page; a third page of the Down Sheet
     read as a heat sheet would otherwise be left out without a trace, and its
     buses would show as coming off the sheet. */
  const short = handedStart({ kind: "down-sheet", files: [a, b], expected: 2, leftOut: 1 }, "down-sheet");
  assert.equal(short.warning, "1 PHOTO WAS LEFT OUT because it read as a different sheet. If it belongs to this one, press CHANGE PHOTOS and add it before you approve anything.");
  assert.equal(short.read, true, "they are still read: the person picked this sheet, and the warning is on the screen the read lands on");
  assert.equal(paperHeldBackWords({ kind: "heat", files: [a], expected: 1, leftOut: 3 }, "heat"), "3 PHOTOS WERE LEFT OUT because they read as a different sheet. If any of them belong to this one, press CHANGE PHOTOS and add them before you approve anything.");
  assert.equal(paperHeldBackWords({ kind: "heat", files: [a], expected: 1, leftOut: 3 }, "sweep"), "");
  assert.equal(paperHeldBackWords({ kind: "heat", files: [], expected: 1, leftOut: 3 }, "heat"), "", "nothing arrived, so there is no batch to be short");
});

test("the photos are never written down on the way", async () => {
  /* A photograph of a shop sheet carries names and initials. The hand-off is
     memory and nothing else: no storage, no address, no upload-and-fetch. */
  const handoff = code(await read("../src/lib/scan/paper-handoff.ts"));
  assert.doesNotMatch(handoff, /localStorage|sessionStorage|indexedDB|caches\.|fetch\(|createObjectURL|FileReader|toDataURL|setItem/);
  const kinds = code(await read("../src/lib/scan/paper-kinds.ts"));
  assert.doesNotMatch(kinds, /localStorage|sessionStorage|setItem/);
  /* Neither page touches the photos it is handed: it passes the hand-off to
     a scanner whole. A page that reached into `.files` would be the place a
     photo got stored, and neither has a reason to. */
  for (const file of ["../app/defect-log/page.tsx", "../app/down-sheet/page.tsx"]) assert.doesNotMatch(code(await read(file)), /(handed|arrived|next)\??\.files/, file);
  assert.doesNotMatch(code(await read("../src/components/scan/scan-paper.tsx")), /localStorage|sessionStorage|indexedDB|FileReader|toDataURL|setItem/);
  /* And no new storage key came with any of it. */
  for (const file of ["../src/lib/scan/paper-handoff.ts", "../src/lib/scan/paper-kinds.ts", "../src/lib/scan/paper-identify.ts", "../src/components/scan/scan-paper.tsx"]) assert.doesNotMatch(await read(file), /pace-[a-z-]+-v\d/, file + " names no storage key");
  /* The three modules are domain: no JSX and no React. */
  for (const file of ["../src/lib/scan/paper-handoff.ts", "../src/lib/scan/paper-kinds.ts", "../src/lib/scan/paper-identify.ts"]) assert.doesNotMatch(await read(file), /from "react"|<\/[a-z]+>/, file);
});

test("SCAN PAPER on the screen: it identifies, hands on, and files nothing", async () => {
  const [paper, css, logPage, downPage, logCss, downCss] = await Promise.all([
    read("../src/components/scan/scan-paper.tsx"), read("../src/components/scan/scan-paper.css"),
    read("../app/defect-log/page.tsx"), read("../app/down-sheet/page.tsx"),
    read("../app/defect-log/defect-log.css"), read("../app/down-sheet/down-sheet.css"),
  ]);
  const body = code(paper);
  /* It asks its one question of SMALL copies, at the one route. */
  assert.match(body, /form\.append\("photos",await scanGlancePhoto\(batch\[index\]\.file,index\+1\)\)/);
  assert.match(body, /fetch\("\/api\/scan-identify",\{method:"POST",body:form,signal:asking\.signal\}\)/);
  assert.doesNotMatch(body, /scanReadyPhoto|\/api\/(down-sheet-scan|sweep-scan|heat-sheet-scan)/, "it never does a scanner's read");
  /* IT TOUCHES NO RECORD. Nothing here can file, import or store. */
  assert.doesNotMatch(body, /localStorage|sessionStorage|writeSetting|writeFleetStorage|writeDownSheetStorage|setItem|saveDefectLogRecord/);
  /* Every rule comes from src/lib/scan: the verdict, the pages, the words. */
  assert.match(body, /pages=normalizePaperPages\(payload,batch\.length\);\s*verdict=paperVerdict\(pages\);/);
  assert.doesNotMatch(body, /confidence|PAPER_SURE|"heat"|"sweep"|"down-sheet"/, "no sheet is addressed and no threshold applied in the component");
  /* AND NO SHEET IS NAMED IN IT, in any spelling: the introduction is the
     table's own list, so a sheet added to the table is in it. */
  assert.doesNotMatch(body, /down sheet|ventra|farebox|heat check|sweep/i);
  assert.match(body, /<span>\{paperListWords\(\)\}\. The app works out which it is/);
  /* A FAILED LOOK IS NOT A DEAD END: the person is asked instead. */
  assert.match(body, /catch\(reason\)\{[\s\S]{0,260}verdict=paperUnread\(batch\.length\);/);
  /* A dropped connection is said as one. The browser's own words for it are
     "Failed to fetch", which tells a foreman nothing. */
  assert.match(body, /problem=reason instanceof TypeError\?"no connection to the reader":reason instanceof Error\?reason\.message:"";/);
  assert.match(body, /payload=\(await response\.json\(\) as typeof payload\)\|\|\{\}/, "an empty answer is not mistaken for a dropped connection");

  /* CANCEL MEANS CANCEL. Closing the box aborts the look, and an answer that
     arrives after it closed opens nothing — it used to open a scanner and send
     the full-size photos to be read, after the person had backed out. */
  assert.match(body, /return\(\)=>\{open\.current=false;request\.current\?\.abort\(\);/);
  assert.match(body, /const batch=photos,asking=new AbortController\(\);\s*request\.current=asking;/);
  const afterLook = body.slice(body.indexOf("verdict=paperUnread(batch.length);"));
  assert.match(afterLook, /^verdict=paperUnread\(batch\.length\);\s*\}\s*if\(!open\.current\|\|asking\.signal\.aborted\)return;\s*setBusy\(false\);/, "nothing that came back is acted on, and no state is set, once it has closed");
  assert.match(body, /const send=\(choice:PaperChoice,batch:SelectedPhoto\[\]\)=>\{\s*if\(!open\.current\|\|leaving\)return;/);
  /* ONCE THE PAGE IS BEING LEFT, NOTHING PRETENDS TO CALL IT BACK: both ways
     of closing go dead, because the move has started and closing would not
     stop it. */
  assert.equal(count(body, /onClick=\{onClose\} disabled=\{Boolean\(leaving\)\}/g), 2, "× and CANCEL");
  assert.equal(count(body, /onClick=\{onClose\}/g), 2, "and there is no third way to close");

  /* ONLY A SHEET THIS PAGE READS, WITH EVERY PAGE AGREED, GOES STRAIGHT THROUGH. */
  assert.match(body, /if\(verdict\.decided&&paperKind\(verdict\.choice\.kind\)\.route===here\)\{send\(verdict\.choice,batch\);return\}\s*setLooked\(/);
  /* THE PAGES SENT ARE THE CHOICE'S, from the photos the look was started
     with, and the number held back goes with them. */
  assert.match(body, /const files=choice\.send\.map\(page=>batch\[page-1\]\?\.file\)/);
  assert.match(body, /if\(paperKind\(choice\.kind\)\.route===here\)\{onHere\(\{kind:choice\.kind,files,expected:files\.length,leftOut:choice\.leftOut\.length\}\);return\}/);
  /* Elsewhere: memory first, then the router. */
  assert.match(body, /offerPaperPhotos\(choice\.kind,files,choice\.leftOut\.length\);\s*try\{router\.push\(href\)\}catch\{window\.location\.assign\(href\)\}/);
  assert.match(body, /const href=paperScanHref\(choice\.kind,files\.length\);/);
  /* The photos are frozen while the look runs and once the page is being left. */
  assert.match(body, /const addPhotos=\(files:FileList\|null\)=>\{\s*if\(!files\|\|busy\|\|leaving\)return;/);
  assert.match(body, /const removePhoto=\(key:string\)=>busy\|\|leaving\?undefined:/);
  assert.match(body, /const look=async\(\)=>\{\s*if\(!photos\.length\|\|busy\|\|leaving\)return;/);
  assert.equal(count(body, /disabled=\{busy\}/g), 3, "TAKE PHOTO, UPLOAD FILE and REMOVE");
  /* It holds the page still. */
  assert.match(body, /useEffect\(\(\)=>lockPageScroll\("scan-paper-open"\),\[\]\)/);
  /* The first look SENDS the photos, and the screen says when, in the words
     every scanner uses. */
  assert.match(body, /Photos are sent for processing only after you press Read Sheet/);
  /* A choice shows the pages it takes whenever there is more than one page,
     including when it takes all of them: an unplaced page goes along, and the
     person should see that it does. */
  assert.match(body, /const pagesNote=\(choice:PaperChoice\)=>total>1\?paperPagesWords\(choice\.send\)\+" · ":"";/);

  /* IT STYLES NO BARE ELEMENT, inside a media block or out of one:
     globals.css gives a bare <header> a fixed height and a bare <footer>
     position:fixed. Every selector in the sheet is read, the first one after
     each `@media(…){` included — an earlier version of this loop skipped it. */
  assert.doesNotMatch(body, /<header|<footer|<nav/);
  const selectors = code(css).replace(/@media[^{]*\{/g, "").split("}").map(part => part.split("{")[0].trim()).filter(Boolean).flatMap(rule => rule.split(",")).map(item => item.trim());
  assert.ok(selectors.length > 40, "the sheet was actually read: " + selectors.length + " selectors");
  for (const selector of selectors) assert.match(selector, /^\.paper-[a-z-]+/, "'" + selector + "' is scoped to SCAN PAPER");

  /* BOTH PAGES DRAW THE SAME BUTTON AND THE SAME DOOR. */
  for (const [name, source, here] of [["Defect Log", logPage, "/defect-log"], ["Down Sheet", downPage, "/down-sheet"]]) {
    assert.match(source, new RegExp('const PAPER_HERE="' + here + '";'), name);
    assert.match(source, /<button className="paper-scan-button" type="button" onClick=\{\(\)=>setPaperOpen\(true\)\}[^>]*>📷 SCAN PAPER<\/button>/, name);
    assert.match(source, /\{paperOpen&&<ScanPaper here=\{PAPER_HERE\} onClose=\{\(\)=>setPaperOpen\(false\)\} onHere=\{openPaperHere\}\/>\}/, name);
    assert.equal(count(source, /className="paper-scan-button"/g), 1, name + " draws SCAN PAPER once");
  }
  /* THE THREE OLD BUTTONS ARE WHERE THEY WERE. The new one is after the last
     of them on the Defect Log, and after SCAN SHEET on the Down Sheet. */
  assert.match(logPage, /<div className="feed-actions"><button className="cleanup-log" onClick=\{cleanUpLog\}>CLEAN UP<\/button><button className="sweep-scan-button"/, "the row still starts where it did");
  assert.match(logPage, /className="sweep-scan-button"[\s\S]{0,400}className="scan-batches-button"[\s\S]{0,1500}className="heat-scan-button"[\s\S]{0,300}>📷 SCAN HEAT SHEET<\/button><button className="paper-scan-button"/);
  assert.match(logPage, /📷 SCAN PAPER<\/button><\/div>/, "and SCAN PAPER closes it");
  assert.match(downPage, /className="scan-sheet-button" type="button" onClick=\{\(\)=>setScannerOpen\(true\)\}>▣ SCAN SHEET<\/button>\s*<button className="paper-scan-button"/);

  /* THE BUTTON'S LOOK IS SCOPED TO ITS OWN PAGE'S ROW ON BOTH PAGES. SCAN PAPER
     changes page without reloading, which leaves both pages' stylesheets
     loaded; a bare `.paper-scan-button` in each would have the Down Sheet's
     height and font landing on the Defect Log's button after a hop. */
  for (const [name, sheet] of [["defect-log.css", logCss], ["down-sheet.css", downCss]]) {
    const rules = code(sheet).replace(/@media[^{]*\{/g, "").split("}").map(part => part.split("{")[0]).flatMap(rule => rule.split(",")).map(item => item.trim()).filter(item => item.includes("paper-scan-button"));
    assert.ok(rules.length >= 2, name + " styles the button");
    for (const selector of rules) assert.match(selector, /^\.(feed-actions|down-advanced-group)>\.paper-scan-button/, name + ": '" + selector + "' would also apply on the other page");
  }
  assert.match(logCss, /\.feed-actions>\.paper-scan-button\{[^}]*background:#3d1c6e/);
  assert.match(downCss, /\.down-advanced-group>\.paper-scan-button\{[^}]*background:#3d1c6e/, "the same colour on both pages");

  /* A HAND-OFF IS FOR ONE OPENING. Both pages drop it when the scanner shuts —
     ON THE CHANGE FROM OPEN TO SHUT, not "whenever shut": that is also true as
     the page opens, in the same pass as the effect that takes a hand-off off
     the address, and the two would then race on source order. */
  assert.match(logPage, /const scannerWasOpen=useRef\(false\);\s*useEffect\(\(\)=>\{const open=sweepOpen\|\|heatOpen;if\(scannerWasOpen\.current&&!open\)setHanded\(null\);scannerWasOpen\.current=open\},\[sweepOpen,heatOpen\]\);/);
  assert.match(downPage, /const scannerWasOpen=useRef\(false\);\s*useEffect\(\(\)=>\{if\(scannerWasOpen\.current&&!scannerOpen\)setHanded\(null\);scannerWasOpen\.current=scannerOpen\},\[scannerOpen\]\);/);
  for (const [name, source] of [["Defect Log", logPage], ["Down Sheet", downPage]]) assert.equal(count(code(source), /setHanded\(null\)/g), 1, name + " drops a hand-off in exactly one place");
  /* EACH OF THE DEFECT LOG'S SHEETS IS NAMED. An `else` would open the sweep
     scanner, empty, for a sheet added to the table later. */
  assert.match(logPage, /const openScanner=\(kind:HandedPhotos\["kind"\]\)=>\{if\(kind==="heat"\)setHeatOpen\(true\);else if\(kind==="sweep"\)setSweepOpen\(true\)\};/);
  assert.match(logPage, /const openPaperHere=\(next:HandedPhotos\)=>\{setPaperOpen\(false\);setHanded\(next\);openScanner\(next\.kind\)\};/);
  assert.match(downPage, /const openPaperHere=\(next:HandedPhotos\)=>\{setPaperOpen\(false\);setHanded\(next\);setScannerOpen\(true\)\};/);
  /* Both pages read their address through the same function and clean it the
     same way, keeping the history state the router left. */
  assert.match(logPage, /arrived=paperHandIn\(url\.search,PAPER_HERE\);\s*if\(!arrived\)return;\s*setHanded\(arrived\);openScanner\(arrived\.kind\);\s*url\.searchParams\.delete\(PAPER_SCAN_PARAM\);url\.searchParams\.delete\(PAPER_PHOTOS_PARAM\);\s*window\.history\.replaceState\(window\.history\.state,/);
  assert.match(downPage, /arrived=paperHandIn\(url\.search,PAPER_HERE\);\s*if\(!arrived\)return;\s*setHanded\(arrived\);setScannerOpen\(true\);\s*url\.searchParams\.delete\(PAPER_SCAN_PARAM\);url\.searchParams\.delete\(PAPER_PHOTOS_PARAM\);\s*window\.history\.replaceState\(window\.history\.state,/);
});

test("each scanner takes a hand-off for its own sheet, and reads it once", async () => {
  for (const [kind, file, reader, keepsNotes, noteClass] of SCANNERS) {
    const body = code(await read(file));
    assert.match(body, new RegExp('const \\[start\\]=useState\\(\\(\\)=>handedStart\\(handed,"' + kind + '"\\)\\);'), kind + " asks once, for its own sheet");
    assert.match(body, /const \[photos,setPhotos\]=useState<SelectedPhoto\[\]>\(\(\)=>start\.files\.slice\(0,MAX_FILES\)\.map\(/, kind + " starts with the photos it was handed");
    assert.match(body, /const \[error,setError\]=useState\(start\.lost\);/, kind + " says so when they did not arrive");
    assert.match(body, /const wantsRead=useRef\(start\.read\);/, kind + " reads by itself only when the hand-off says to");
    /* ONCE. The flag is put down before the read starts — and the read is
       started from exactly two places: that effect and the READ button. A
       second effect calling it would read again on every change of photos. */
    assert.match(body, new RegExp("wantsRead\\.current\\)return;wantsRead\\.current=false;void " + reader + "\\(\\)\\}"), kind);
    assert.equal(count(body, new RegExp("\\b" + reader + "\\b", "g")), 3, kind + ": defined, pressed, and started once by itself");
    assert.equal(count(body, new RegExp("void " + reader + "\\(\\)", "g")), 1, kind);
    assert.equal(count(body, new RegExp("onClick=\\{" + reader + "\\}", "g")), 1, kind);
    /* It says SCAN PAPER opened it, and warns when pages were held back —
       for as long as the photos are still the ones that were handed over. */
    assert.match(body, new RegExp('\\{fromPaper&&start\\.note&&<p className="' + noteClass + '" role="status">\\{start\\.note\\}</p>\\}'), kind);
    assert.match(body, new RegExp('\\{fromPaper&&start\\.warning&&<p className="' + noteClass + ' held-back" role="alert">\\{start\\.warning\\}</p>\\}'), kind);
    assert.equal(count(body, /setFromPaper\(false\)/g), 2, kind + ": adding a photo and removing one both retire the lines");
    assert.match(body, /return \[\.\.\.current,\.\.\.next\];\s*\}\);\s*setFromPaper\(false\);/, kind);
    assert.match(body, /const removePhoto=\(key:string\)=>\{(if\(busy\)return;)?setFromPaper\(false\);setPhotos\(/, kind);
    if (keepsNotes) {
      /* THE KEPT NOTES ARE IN THE BOX BEFORE THE READ STARTS. A read started a
         render earlier sends none — and then writes "none kept" over them. */
      assert.match(body, /setKeepNotes\(true\)\}setNotesLoaded\(true\)\},\[\]\);/, kind);
      assert.match(body, new RegExp("useEffect\\(\\(\\)=>\\{if\\(!notesLoaded\\|\\|!wantsRead\\.current\\)return;wantsRead\\.current=false;void " + reader + "\\(\\)\\},\\[notesLoaded\\]\\);"), kind);
    }
  }
  /* The rule the notes gate exists for, run rather than read: a read with an
     empty box and nothing ticked DOES blank what the device was keeping. */
  const { rememberScanNotes, readScanNotes } = await import("../src/lib/defects/scan-notes.ts");
  const kept = JSON.stringify({ version: 1, "down-sheet": "Line 23 is 17565.", sweep: "Cw is Carlos W." });
  assert.equal(readScanNotes(rememberScanNotes(kept, "sweep", "", false), "sweep"), "", "which is what a read started before the notes loaded would have done");
  assert.equal(readScanNotes(rememberScanNotes(kept, "sweep", "Cw is Carlos W.", true), "sweep"), "Cw is Carlos W.");

  const [logPage, downPage, logCss, downCss] = await Promise.all([read("../app/defect-log/page.tsx"), read("../app/down-sheet/page.tsx"), read("../app/defect-log/defect-log.css"), read("../app/down-sheet/down-sheet.css")]);
  assert.match(logPage, /<SweepScanner fleet=\{fleet\} handed=\{handed\} /);
  assert.match(logPage, /<HeatScanner fleet=\{fleet\} handed=\{handed\} /);
  assert.match(downPage, /<DownSheetScanner fleet=\{fleet\} currentEntries=\{active\} defaultShift=\{defaultShift\} handed=\{handed\} /);
  assert.match(logCss, /\.sweep-handed\.held-back\{/);
  assert.match(downCss, /\.scan-handed\.held-back\{/);
});

test("the small copy for the first look is the same shrink at a smaller size", async () => {
  const source = code(await read("../src/lib/defects/scan-photo.ts"));
  const { MAX_SCAN_BYTES, MAX_GLANCE_BYTES } = await import("../src/lib/defects/scan-photo.ts");
  assert.equal(MAX_SCAN_BYTES, 700 * 1024, "the size a READ gets has not moved");
  assert.ok(MAX_GLANCE_BYTES * 3 < MAX_SCAN_BYTES, "a glance is a fraction of a read");
  assert.match(source, /export function scanReadyPhoto\(file:File,page:number,namePrefix="sheet-page"\)\{return shrunkPhoto\(file,page,namePrefix,MAX_SCAN_BYTES,2400\)\}/, "a read is still 2400 on the long side under the same limit");
  assert.match(source, /export function scanGlancePhoto\(file:File,page:number\)\{return shrunkPhoto\(file,page,"paper-glance",MAX_GLANCE_BYTES,GLANCE_LONGEST\)\}/);
  assert.equal(count(source, /toBlob\(/g), 3, "one loop, not two copies of it");
  /* THE LOOP USES THE LIMIT IT WAS GIVEN. Each constant is named exactly
     twice — where it is declared and where its wrapper passes it — so the
     shrink itself cannot be comparing a glance against the size of a read. */
  const shrink = source.slice(source.indexOf("async function shrunkPhoto"));
  assert.doesNotMatch(shrink, /MAX_SCAN_BYTES|MAX_GLANCE_BYTES|2400|GLANCE_LONGEST/);
  assert.equal(count(shrink, /maxBytes/g), 5, "the limit is an argument everywhere it is used: declared once, compared or divided four times");
  assert.equal(count(source, /MAX_SCAN_BYTES/g), 2);
  assert.equal(count(source, /MAX_GLANCE_BYTES/g), 2);
});
