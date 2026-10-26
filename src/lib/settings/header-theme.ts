/* THE APP'S HEADER COLOUR, IN ONE PLACE, WHICH IS WHERE IT HAS NEVER BEEN.

   Curtis: "B is fine all same color until I figure out a more solid color
   scheme because I do want to add some flare to it. Why is this not an option
   to color the headers differently in settings?"

   It partly was, and that is the whole problem. Three of the eight headers
   were already settable — the Facility Map through `--header-bg`, the Defect
   Log and Fixed Repairs through `--log-header` and `--fixed-header` — but
   through TWO separate theme systems, each belonging to a page, built when
   every page had its own settings gear. The other five had the colour typed
   into the stylesheet. Nothing anywhere said what the APP's colour was, so
   five places decided independently and three were never asked: measured, five
   different navies, two gradient angles, and flat against gradient.

   So this is the missing thing rather than a ninth special case. One colour,
   every header reads it, and a page can override it when it has a reason to.

   WHY NOT EXTEND ONE OF THE EXISTING THEMES. Because each of them is a PAGE's
   appearance — the Defect Log's theme also drives its cards, its text and its
   ADVANCED drawer — and a header colour that lived inside one page's settings
   would be the same mistake a fourth time. This sits above all of them.

   PER DEVICE, NEVER SYNCED, like every other appearance setting here. It
   describes what one person likes looking at, and a synced colour scheme would
   repaint somebody else's phone mid-shift. */

type StorageReader=Pick<Storage,"getItem">;
type StorageWriter=Pick<Storage,"getItem"|"setItem">;

export const HEADER_THEME_KEY="pace-header-theme-v1";

/* The eight surfaces, in nav order, which is the order Settings draws them. */
export const HEADER_SURFACES=[
 {key:"map",label:"Facility Map"},
 {key:"down",label:"Down Sheet"},
 {key:"log",label:"Defect Log"},
 {key:"fixed",label:"Fixed Repairs"},
 {key:"lists",label:"Fleet Campaigns"},
 {key:"incidents",label:"Incidents"},
 {key:"talk",label:"Shop Talk"},
 {key:"settings",label:"Settings"},
] as const;
export type HeaderSurface=(typeof HEADER_SURFACES)[number]["key"];

/* ALL EIGHT THE SAME, which is what was chosen. Incidents' red and Shop Talk's
   green are gone from the default and are one override away for whoever wants
   them back — which is the point of having overrides at all. */
export const DEFAULT_HEADER_COLOR="#041d47";

export type HeaderTheme={shared:string;overrides:Partial<Record<HeaderSurface,string>>};
export const DEFAULT_HEADER_THEME:HeaderTheme={shared:DEFAULT_HEADER_COLOR,overrides:{}};

/* Only `#rgb` and `#rrggbb`. A colour goes straight into a style attribute, so
   anything that is not plainly a hex colour is not taken — a stored value is
   not a place to accept `red; background:url(...)`. */
const HEX=/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
export function isHeaderColor(value:unknown):value is string{
 return typeof value==="string"&&HEX.test(value.trim());
}

/* STORED AS SIX DIGITS, LOWER CASE, because the control that edits this is
   `<input type="color">` and that element only speaks seven characters. Hand
   it `#abc` — which `isHeaderColor` accepts, and a hand-edited file or an
   older record can hold — and it does not shorten it, it shows BLACK, so the
   swatch in Settings would read black over a header drawing the right colour.
   Normalised once here, on the way in, rather than at each of the places that
   read it. */
export function normalizeHeaderColor(value:string){
 const trimmed=value.trim().toLowerCase(),body=trimmed.slice(1);
 return "#"+(body.length===3?body.split("").map(part=>part+part).join(""):body);
}

export function readHeaderTheme(raw:string|null):HeaderTheme{
 try{
  const saved=JSON.parse(raw||"null") as Partial<HeaderTheme>|null;
  if(!saved||typeof saved!=="object")return {...DEFAULT_HEADER_THEME,overrides:{}};
  const shared=isHeaderColor(saved.shared)?normalizeHeaderColor(saved.shared):DEFAULT_HEADER_COLOR;
  const overrides:Partial<Record<HeaderSurface,string>>={};
  const stored=saved.overrides&&typeof saved.overrides==="object"?saved.overrides as Record<string,unknown>:{};
  for(const surface of HEADER_SURFACES){
   const value=stored[surface.key];
   /* An override is only an override when it is a colour. An empty string, a
      missing key and a malformed value all mean the same thing: follow the
      shared colour. Stored as an absence rather than as "", the spelling
      `setBusHold` and the ledger's `gap` already use. */
   if(isHeaderColor(value))overrides[surface.key]=normalizeHeaderColor(value);
  }
  return {shared,overrides};
 }catch{return {...DEFAULT_HEADER_THEME,overrides:{}}}
}

export function serializeHeaderTheme(theme:HeaderTheme){
 const overrides:Record<string,string>={};
 for(const surface of HEADER_SURFACES){
  const value=theme.overrides[surface.key];
  if(isHeaderColor(value))overrides[surface.key]=normalizeHeaderColor(value);
 }
 return JSON.stringify({version:1,shared:isHeaderColor(theme.shared)?normalizeHeaderColor(theme.shared):DEFAULT_HEADER_COLOR,overrides});
}

export function loadHeaderTheme(storage:StorageReader):HeaderTheme{
 try{return readHeaderTheme(storage.getItem(HEADER_THEME_KEY))}
 catch{return {...DEFAULT_HEADER_THEME,overrides:{}}}
}
export function saveHeaderTheme(storage:StorageWriter,theme:HeaderTheme){
 try{storage.setItem(HEADER_THEME_KEY,serializeHeaderTheme(theme));return true}
 catch{return false}
}

/* The colour a given surface actually paints with: its own override, or the
   one shared colour. */
export function headerColorFor(theme:HeaderTheme,surface:HeaderSurface){
 const own=theme.overrides[surface];
 return isHeaderColor(own)?own:(isHeaderColor(theme.shared)?theme.shared:DEFAULT_HEADER_COLOR);
}
export function hasHeaderOverride(theme:HeaderTheme,surface:HeaderSurface){
 return isHeaderColor(theme.overrides[surface]);
}

/* THREE OF THE EIGHT SURFACES ALREADY HAD A WHOLE-PAGE THEME, and this is
   where that is reconciled rather than ignored.

   The Facility Map, the Defect Log and Fixed Repairs each offer Terminal,
   Black/Dark, Midnight and Tactical — a page-wide palette in which the header
   colour is one member. Handing the shared colour to those three
   unconditionally was built first and MEASURED at 430 on Tactical: the header
   block went navy while the olive page began at its bottom edge, in a hard
   line across the screen, with the active nav tile still olive because it is
   keyed to the page's surface. Two apps stacked. Nobody asked for that; what
   was asked for was that the eight headers match.

   So a page theme is treated as what it plainly is — a colour decision
   already made for that page — and sits in the middle of a three-rung ladder:

     an override typed for this surface   (an explicit answer for this page)
     a non-default page theme             (an explicit answer for this page)
     the shared colour                    (the answer for everything else)

   On the default theme, which is what a device that has never opened these
   panels is on, nothing is between the shared colour and the header, so all
   eight match — the case Curtis actually asked about. On a theme, the page
   stays whole, exactly as it was before this release. And a per-surface
   override still wins over both, so Settings can always force the matter and
   is never describing something the page will not do. */
export function resolveHeaderColor(theme:HeaderTheme,surface:HeaderSurface,pageTheme?:string){
 if(hasHeaderOverride(theme,surface))return headerColorFor(theme,surface);
 if(isHeaderColor(pageTheme))return normalizeHeaderColor(pageTheme);
 return headerColorFor(theme,surface);
}

function channels(hex:string){
 const value=hex.trim().slice(1);
 const full=value.length===3?value.split("").map(part=>part+part).join(""):value;
 return [0,2,4].map(start=>parseInt(full.slice(start,start+2),16));
}
function relativeLuminance(hex:string){
 const [r,g,b]=channels(hex).map(channel=>{
  const ratio=channel/255;
  return ratio<=0.03928?ratio/12.92:Math.pow((ratio+0.055)/1.055,2.4);
 });
 return 0.2126*r+0.7152*g+0.0722*b;
}
export function contrastRatio(a:string,b:string){
 const first=relativeLuminance(a),second=relativeLuminance(b);
 return (Math.max(first,second)+0.05)/(Math.min(first,second)+0.05);
}

/* THE TEXT COLOUR IS COMPUTED, NOT CHOSEN, and that is deliberate.

   Every header in this app is white on a dark colour today, so white is simply
   what the markup assumes. The moment somebody can pick the background, that
   assumption is a trap: a light "flare" colour gives white on white and the
   page title disappears. Whichever of white or near-black reads better on the
   chosen colour wins, so there is no combination that can hide the words.

   PURE BLACK, AND THE FIRST VERSION WAS A SOFTER NEAR-BLACK. #0b1b33 was
   chosen on the reasoning that #000 on a mid tone is harsher than it needs to
   be — which is true, and which it turned out to be paying for in the one
   currency this function exists to protect. Swept over the whole colour cube
   at a 15-step, the best of white and #0b1b33 bottoms out at 4.15:1 on a
   magenta and sits at 4.36:1 on plain mid-grey: under AA, on backgrounds the
   picker will happily hand out. With #000 the floor across the same sweep is
   4.58:1, because the two options bracket every background between them and
   the worst case is where they are equal.

   A promise that the words cannot be hidden is worth a slightly harder black
   on a mid tone that nobody is likely to pick, so the measurement wins. */
export const HEADER_TEXT_LIGHT="#ffffff";
export const HEADER_TEXT_DARK="#000000";
export function headerTextFor(background:string){
 const base=isHeaderColor(background)?background:DEFAULT_HEADER_COLOR;
 return contrastRatio(base,HEADER_TEXT_LIGHT)>=contrastRatio(base,HEADER_TEXT_DARK)?HEADER_TEXT_LIGHT:HEADER_TEXT_DARK;
}

/* The second stop of the gradient every header already drew, derived rather
   than asked for: one picker per surface instead of two, and the look the app
   has today rather than a flat slab. Mixed toward white on a dark colour and
   toward black on a light one, so the lift is visible either way.

   90deg, AND THAT IS NOT THE ANGLE THE APP USED. The literals it replaces
   were 110deg on the Defect Log and Fixed Repairs and 120deg on the Down
   Sheet, so there was no single angle to preserve — and a tilted gradient is
   height-dependent, which the Facility Map cannot afford. Its header bar and
   its phone nav are two separate elements stacked flush with no gap, of the
   same width and different heights, and they have always read as one block.
   Measured at 390 with 110deg: the row above the boundary and the row below
   it differed by 4 to 6 per channel, a seam where the flat colour they shared
   before had none. At 90deg the gradient line is horizontal, so two boxes of
   the same width paint the same colour at the same x whatever their height,
   and the step is exactly zero. */
export function headerGradient(background:string){
 const base=isHeaderColor(background)?background.trim():DEFAULT_HEADER_COLOR;
 const toward=relativeLuminance(base)<0.3?"#ffffff":"#000000";
 return "linear-gradient(90deg,"+base+",color-mix(in srgb,"+toward+" 16%,"+base+"))";
}
