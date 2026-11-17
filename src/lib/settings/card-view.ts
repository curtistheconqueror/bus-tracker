/* Presentation only. Never included in operational records or cloud sync. */
export const CARD_VIEW_KEY="pace-defect-log-card-view-v1";
export type CardView="compact"|"detailed";
export function readCardView(raw:string|null):CardView{return raw==="detailed"?"detailed":"compact"}
