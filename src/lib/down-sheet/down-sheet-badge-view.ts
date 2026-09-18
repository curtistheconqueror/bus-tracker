export type DownSheetBadgeView="all"|"ready-road"|"off-road";

export type DownSheetBadgeBus={id:string;l:string};

export const DOWN_SHEET_BADGE_VIEWS:{key:DownSheetBadgeView;label:string;shortLabel:string}[]=[
 {key:"all",label:"All Down Sheet Buses",shortLabel:"All"},
 {key:"ready-road",label:"Road / Ready",shortLabel:"Road"},
 {key:"off-road",label:"Off Road",shortLabel:"Off Road"},
];

export function isReadyRoadLocation(location:string){return location.startsWith("road-")||location.startsWith("garage-")}

export function downSheetBadgeViewBusIds<T extends DownSheetBadgeBus>(fleet:T[],activeIds:Iterable<string>,view:DownSheetBadgeView){
 const active=new Set(activeIds);
 return fleet.filter(bus=>active.has(bus.id)&&(view==="all"||(view==="ready-road"?isReadyRoadLocation(bus.l):!isReadyRoadLocation(bus.l)))).map(bus=>bus.id);
}

export function downSheetBadgeViewCounts<T extends DownSheetBadgeBus>(fleet:T[],activeIds:Iterable<string>){
 return {
  all:downSheetBadgeViewBusIds(fleet,activeIds,"all").length,
  "ready-road":downSheetBadgeViewBusIds(fleet,activeIds,"ready-road").length,
  "off-road":downSheetBadgeViewBusIds(fleet,activeIds,"off-road").length,
 };
}
