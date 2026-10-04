/* WHICH TECH SERVICES DEVICE A REPAIR IS ABOUT — in one place, once.

   Curtis: "now the Ventura and the fare boxes have been moved up to critical
   levels, period. So they need a count of that as well... Fairbox and Venture
   separate. and cubic screen EV or... I'm sorry. MV, bus MV or MREV error."

   Three counts, separately, is the ask. The catalog already draws the lines —
   `REPAIR_OPTIONS["Tech Services"]` is prefixed "Farebox - ", "Ventra - ",
   "CUBIC Screen - " and "IBS Screen - " — so this module is the reading of
   those prefixes and the free-text fallback for records typed before them,
   and it lives on its own because the LOCATION-LABEL rule applies here too: a
   second copy of this table would drift, and the one in `quick-filters.ts`
   already delegates to it rather than keeping its own.

   The CUBIC screens ARE Ventra hardware. Counting them together is what the
   app did and what the quick filter still offers; counting them apart is what
   a superintendent's list needs, because "six Ventra" and "six CUBIC screens
   showing BUS ER" are two different conversations with two different vendors.
   Both readings come off the same table, which is the point of having one. */

export type TechServicesGroup="farebox"|"ventra"|"cubic"|"ibs"|null;

export const TECH_SERVICES_CATEGORY="Tech Services";

/* Order matters and it is most-specific-first.

   "CUBIC Screen - BUS ER" carries no "Ventra" of its own, but a free-text
   record often carries both words, and the reading that serves the count is
   the specific device rather than the family it belongs to. BUS ER and MV ER
   are matched by name as well: those are the words on the screen, they are
   what a mechanic writes down, and Curtis could not remember which way round
   they went — which is the clearest possible sign that the app should not be
   relying on somebody typing "CUBIC" to find them. */
const GROUPS:{group:Exclude<TechServicesGroup,null>;test:RegExp}[]=[
 {group:"farebox",test:/\bfare\s*box\b|\bfarebox\b/i},
 {group:"cubic",test:/\bcubic\b|\b(?:bus|mv)\s*[-_]?\s*er\b/i},
 {group:"ventra",test:/\bventra\b/i},
 {group:"ibs",test:/\bibs\b/i},
];

export function techServicesGroup(text:unknown):TechServicesGroup{
 const value=String(text??"");
 if(!value)return null;
 for(const row of GROUPS)if(row.test.test(value))return row.group;
 return null;
}

/* The two readings the app needs, both derived rather than written twice. */
export function isFarebox(text:unknown){return techServicesGroup(text)==="farebox"}
export function isIbsVentra(text:unknown){
 const group=techServicesGroup(text);
 return group==="ventra"||group==="cubic"||group==="ibs";
}

export const TECH_SERVICES_LABELS:Record<Exclude<TechServicesGroup,null>,string>={
 farebox:"FAREBOX",
 ventra:"VENTRA",
 cubic:"CUBIC SCREENS",
 ibs:"IBS SCREENS",
};
