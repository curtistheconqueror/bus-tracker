/* THE SITE, AS DATA. One description of this building, in one file.

   Issue #21, Phase 1. Phase 0 gave the garage's grid a single set of numbers;
   this does the same for the building around it.

   WHY THIS EXISTS. The yard was five independent descriptions that all had to
   agree: `SECTION_SLOTS` (what exists), the capacities, the label table (what a
   person calls it), `SECTION_THEME_KEYS` (what can be re-coloured), and the
   spoken aliases the operator parses. Nothing made them agree. `CLAUDE.md`
   already records what that costs — five copies of the location table had all
   drifted, and every one of them named a trouble bay "Main Garage".

   WHAT IT IS NOT, YET. This file is the single source; the five tables are not
   yet derived from it. That swap is the next step, done one consumer at a time
   with the rendered map diffed each time. Until then a test asserts this
   reproduces every existing table EXACTLY — which is what makes the swap a
   refactor rather than a rewrite.

   THE ASYMMETRIES ARE REAL AND ARE PRESERVED DELIBERATELY. It would be tidier
   if every section had a theme key, if the theme key were the slot prefix, and
   if a section were the same thing as a move destination. None of those is
   true here, and Phase 1's job is to describe the building as it IS, not as it
   would be if it had been designed all at once. Every departure is commented
   where it appears. Tidying them is a behaviour change and belongs to whoever
   decides to make it, on purpose. */

import {GARAGE_CAPACITY,GARAGE_ROWS,GARAGE_TROUBLE_BAY_FIRST_COLUMN,ROAD_CAPACITY,WEST_CAPACITY} from "./facility-layout.ts";

/* How a section's slot ids are generated. Two shapes, because the building has
   two: a straight run of spaces, and a grid that is numbered wider than it is
   drawn. */
export type SlotPlan=
 /* prefix-0 … prefix-(count-1), or from `start` where a section counts from 1. */
 {kind:"range";prefix:string;count:number;start?:number}
 /* THE CNG EAST LOT, and the one place a plain count would be wrong. It is two
    columns wide but numbered on a stride of four, so its ids run 1,2,5,6,9,10…
    with gaps. Eighteen spaces spread across a numbering that reaches 34. The
    gaps are not a bug to be normalised away: they are how the lot is painted,
    and a bus record already stored under `east-34` has to keep resolving. */
 |{kind:"grid";prefix:string;rows:number;stride:number;columns:number[]};

export function planSlots(plan:SlotPlan):string[]{
 if(plan.kind==="range")
  return Array.from({length:plan.count},(unused,index)=>plan.prefix+"-"+(index+(plan.start??0)));
 return Array.from({length:plan.rows},(unused,row)=>
  plan.columns.map(column=>plan.prefix+"-"+(row*plan.stride+column))).flat();
}

/* A MOVE DESTINATION: the thing a person names out loud and the move editor
   offers. Usually one per section — but the Main Garage is one section drawn as
   one grid and THREE destinations, because Trouble Bay 11 and 12 are separate
   places to the shop even though they are columns of the same grid. */
export type SiteArea={
 /* The key every existing table already uses. Changing one of these strings
    orphans records on every device, so they are copied exactly. */
 name:string;
 /* What a person is told a bus at this location is. */
 label:string;
 /* What the AI operator will accept for it. OFF PROPERTY has none today. */
 aliases:string[];
 /* WHERE THIS AREA SITS IN THE ALIAS LIST, and it is behaviour rather than
    presentation. `findOperatorArea` walks the list in order and returns the
    FIRST area one of whose aliases appears in what was typed, so two areas
    whose aliases overlap are decided by which comes first.

    A concrete one: "service bay 11". TROUBLE BAY 11 owns "bay 11" and SHOP
    BAYS owns "service bay", and both are substrings of it. The app lists the
    trouble bays second and third, ahead of the shop bays, so it resolves to
    TROUBLE BAY 11 — which is what somebody standing in the shop means. Sorted
    any other way it silently starts answering SHOP BAYS.

    So the order is copied from the app rather than inherited from section
    order, the same way the theme swatches are. */
 aliasOrder:number;
 /* Which of the section's slots belong to this destination. Omitted means all
    of them, which is every section except the garage. */
 slots?:(sectionSlots:string[])=>string[];
};

export type SiteSection={
 /* The `SECTION_SLOTS` key — what the map draws and what the title bar reads. */
 name:string;
 plan:SlotPlan;
 /* The re-colour key, the words Settings shows beside the swatch, and WHERE IN
    THE SWATCH LIST it appears.

    `order` exists because the theme list and the section list are in different
    orders in the app today — FOREMAN OFFICE is sixth among the swatches and
    ninth among the sections — and that order is what a person sees in Settings.
    Recording it is how this file describes the building as it is rather than
    quietly reordering somebody's colour picker.

    `null` for OFF PROPERTY, which has no theme entry at all: it was added after
    the theme list and nobody put it in. An absence, not an oversight here —
    giving it one is a visible change to Settings. */
 theme:{key:string;label:string;order:number}|null;
 areas:SiteArea[];
};

/* The garage's three destinations, expressed as column arithmetic over the
   grid Phase 0 named rather than as three literal slot lists. */
const garageColumn=(slots:string[],keep:(column:number)=>boolean)=>
 slots.filter(slot=>keep(Number(slot.slice("garage-".length))%(GARAGE_CAPACITY/GARAGE_ROWS)));

export const SITE_SECTIONS:SiteSection[]=[
 {name:"SERVICE DETAIL AREA (SINGLE FILE)",plan:{kind:"range",prefix:"service",count:8},
  theme:{key:"service",label:"Service Detail",order:0},
  areas:[{name:"SERVICE DETAIL AREA (SINGLE FILE)",label:"Service Detail",aliases:["service detail area","service detail"],aliasOrder:4}]},
 {name:"PAINT BOOTH",plan:{kind:"range",prefix:"paint",count:1},
  theme:{key:"paint",label:"Paint Booth",order:1},
  areas:[{name:"PAINT BOOTH",label:"Paint Booth",aliases:["paint booth"],aliasOrder:10}]},
 {name:"WASH RACK",plan:{kind:"range",prefix:"wash",count:1},
  theme:{key:"wash",label:"Wash Rack",order:2},
  areas:[{name:"WASH RACK",label:"Wash Rack",aliases:["wash rack"],aliasOrder:11}]},
 {name:"BODY SHOP",plan:{kind:"range",prefix:"body",count:1},
  theme:{key:"body",label:"Body Shop",order:3},
  areas:[{name:"BODY SHOP",label:"Body Shop",aliases:["body shop"],aliasOrder:12}]},
 /* THE SHOP BAYS, and the two mismatches worth seeing rather than smoothing.
    The theme key is "bays" while the slot prefix is "bay", and the theme reads
    "Shop Bays" while a bus there reads "Shop Bay" — plural for the section,
    singular for the one space. Both are correct English and neither can be
    derived from the other, which is exactly why they are separate fields. */
 {name:"SHOP BAYS (DIAGONAL)",plan:{kind:"range",prefix:"bay",count:9,start:1},
  theme:{key:"bays",label:"Shop Bays",order:4},
  areas:[{name:"SHOP BAYS (DIAGONAL)",label:"Shop Bay",aliases:["shop bays","service bays","service bay"],aliasOrder:5}]},
 {name:"PIT",plan:{kind:"range",prefix:"pit",count:2},
  theme:{key:"pit",label:"Pit",order:6},
  areas:[{name:"PIT",label:"Pit",aliases:["the pit","pit"],aliasOrder:16}]},
 {name:"BRAKE TEST",plan:{kind:"range",prefix:"brake",count:3},
  theme:{key:"brake",label:"Brake Test",order:7},
  areas:[{name:"BRAKE TEST",label:"Brake Test",aliases:["brake test"],aliasOrder:13}]},
 {name:"TOW / STAGING",plan:{kind:"range",prefix:"tow",count:4},
  theme:{key:"tow",label:"Tow / Staging",order:8},
  areas:[{name:"TOW / STAGING",label:"Tow / Staging",aliases:["tow staging","tow area","tow / staging"],aliasOrder:14}]},
 {name:"FOREMAN OFFICE",plan:{kind:"range",prefix:"office",count:3},
  theme:{key:"office",label:"Foreman Office",order:5},
  areas:[{name:"FOREMAN OFFICE",label:"Foreman Office",aliases:["foreman office","office"],aliasOrder:15}]},
 {name:"CNG EAST LOT",plan:{kind:"grid",prefix:"east",rows:9,stride:4,columns:[1,2]},
  theme:{key:"east",label:"CNG East",order:9},
  areas:[{name:"CNG EAST LOT",label:"CNG East",aliases:["cng east lot","cng east","east lot"],aliasOrder:7}]},
 {name:"IN SERVICE / ON ROAD",plan:{kind:"range",prefix:"road",count:ROAD_CAPACITY},
  theme:{key:"road",label:"In Service / On Road",order:10},
  areas:[{name:"IN SERVICE / ON ROAD",label:"On Road",aliases:["in service on road","on the road","on road","road section","road area"],aliasOrder:3}]},
 {name:"SHOP WALL (SINGLE FILE)",plan:{kind:"range",prefix:"wall",count:8},
  theme:{key:"wall",label:"Shop Wall",order:11},
  areas:[{name:"SHOP WALL (SINGLE FILE)",label:"Shop Wall",aliases:["shop wall"],aliasOrder:9}]},
 /* ONE SECTION, THREE DESTINATIONS. The section is named 1-12 because that is
    the grid the map draws; the destination is named 1-10 because that is what
    a foreman means by "the main garage". Both strings are load-bearing and
    neither can be dropped. */
 {name:"MAIN GARAGE (BAYS 1-12)",plan:{kind:"range",prefix:"garage",count:GARAGE_CAPACITY},
  theme:{key:"garage",label:"Main Garage",order:12},
  areas:[
   {name:"MAIN GARAGE (BAYS 1-10)",label:"Main Garage",aliases:["main garage","garage"],aliasOrder:6,
    slots:slots=>garageColumn(slots,column=>column<GARAGE_TROUBLE_BAY_FIRST_COLUMN)},
   {name:"TROUBLE BAY 11",label:"Trouble Bay 11",aliases:["trouble bay 11","bay 11"],aliasOrder:1,
    slots:slots=>garageColumn(slots,column=>column===GARAGE_TROUBLE_BAY_FIRST_COLUMN)},
   {name:"TROUBLE BAY 12",label:"Trouble Bay 12",aliases:["trouble bay 12","bay 12"],aliasOrder:2,
    slots:slots=>garageColumn(slots,column=>column===GARAGE_TROUBLE_BAY_FIRST_COLUMN+1)},
  ]},
 {name:"CNG WEST LOT",plan:{kind:"range",prefix:"west",count:WEST_CAPACITY},
  theme:{key:"west",label:"CNG West",order:13},
  areas:[{name:"CNG WEST LOT",label:"CNG West",aliases:["cng west lot","cng west","west lot"],aliasOrder:8}]},
 /* OFF PROPERTY: two rows of the waiting area, given over to buses that are
    away at a vendor — Bus & Truck and the like. They are not on this property
    at all, so they are not "waiting" for anything here, and counting them in
    the holding area made the yard look fuller than it was.

    Twenty-eight because that is two full rows on the shop computer. A fixed
    count rather than "two rows" on purpose: the waiting grid is 14 across on a
    computer, 10 on an iPad and 3 on a phone, so "two rows" would have meant 28,
    20 or 6 spaces depending on what somebody happened to be holding.

    It also has no theme key and no spoken alias. Both are absences in the app
    as it stands, not oversights in this file. */
 {name:"OFF PROPERTY",plan:{kind:"range",prefix:"offsite",count:28},theme:null,
  areas:[{name:"OFF PROPERTY",label:"Off Property",aliases:[],aliasOrder:99}]},
 {name:"WAITING AREA",plan:{kind:"range",prefix:"waiting",count:70},
  theme:{key:"waiting",label:"Waiting Area",order:14},
  areas:[{name:"WAITING AREA",label:"Waiting Area",aliases:["waiting area","waiting","unsorted","holding area","hold area","void zone"],aliasOrder:0}]},
];

/* How many spaces a section has. The counts live here now, so the capacity
   constants elsewhere are derived from this rather than stated twice. */
export function siteSectionCount(name:string){
 const section=SITE_SECTIONS.find(item=>item.name===name);
 if(!section)throw new Error("site-config: no section named "+name);
 return planSlots(section.plan).length;
}

/* The derived views, in the shapes the existing tables already have. */
export function siteSectionSlots():Record<string,string[]>{
 return Object.fromEntries(SITE_SECTIONS.map(section=>[section.name,planSlots(section.plan)]));
}
export function siteRelocationAreas():Record<string,string[]>{
 const out:Record<string,string[]>={};
 for(const section of SITE_SECTIONS){
  const slots=planSlots(section.plan);
  for(const area of section.areas)out[area.name]=area.slots?area.slots(slots):slots;
 }
 return out;
}
export function siteAreaLabels():Record<string,string>{
 return Object.fromEntries(SITE_SECTIONS.flatMap(section=>section.areas.map(area=>[area.name,area.label])));
}
export function siteThemeKeys():[string,string][]{
 /* Sorted by the theme's own order, not by section order: the two differ, and
    this one is the swatch list a person scrolls. */
 return SITE_SECTIONS.filter(section=>section.theme)
  .sort((a,b)=>a.theme!.order-b.theme!.order)
  .map(section=>[section.theme!.key,section.theme!.label]);
}
export function siteAliases():[string,string[]][]{
 /* In ALIAS order, not section order: the list is walked first-match-wins, so
    the order decides what an overlapping phrase resolves to. */
 return SITE_SECTIONS.flatMap(section=>section.areas)
  .filter(area=>area.aliases.length)
  .sort((a,b)=>a.aliasOrder-b.aliasOrder)
  .map(area=>[area.name,area.aliases] as [string,string[]]);
}
/* Prefix to label, the fallback for a location no area lists — an overflow
   slot, or an east id outside the painted columns. */
export function sitePrefixLabels():[string,string][]{
 return SITE_SECTIONS.map(section=>[section.plan.prefix+"-",section.areas[0].label]);
}
