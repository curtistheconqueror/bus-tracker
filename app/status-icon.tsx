/* The bus status glyph. It draws from the --status-* colour the board sets,
   or a colour handed in, so the map, its legend, and the settings page that
   lets somebody recolour a status all show the same mark. */
import type {CSSProperties} from "react";
import type {S} from "./map-settings";

export default function Icon({s,color}:{s:S;color?:string}){return <i className="bus" style={{"--c":color||"var(--status-"+s+")"} as CSSProperties}><b/><em/><small/></i>}
