"use client";

/* THE PARTS A REPAIR USED, as a list rather than one pair of boxes.

   Curtis, from the floor: *"we made a blooper, we assumed that each repair only
   takes one part. I just saved a fix like a bus and I was trying to find a way
   to add a second part."*

   TWO ROUTES DRAW THIS - the Defect Log's LOG DEFECT form and Fixed Repairs'
   completion editor - so it lives in `src/components/`, which is the rule for a
   component more than one page draws. It was the same block of JSX copied into
   both files already; a list is more to get wrong than a pair of inputs, and
   two copies of it would drift the first time one was changed.

   IT HOLDS NO RULES. Every decision about what a part is, what an empty row
   means and what gets stored is in `src/lib/defects/defect-parts.ts`, so the
   MCP route can answer "what parts went into this repair" by calling the same
   functions rather than reimplementing them. This file draws rows and reports
   changes.

   THE REMEMBERED SUGGESTION IS NOT DRAWN HERE. It belongs to the FIRST part and
   to the form's own parts memory, which each page already wires up its own way
   - the Defect Log seeds it when PARTS USED is ticked, Fixed Repairs the same -
   so the suggestion row stays where it was and this component sits above it. */

import { addDefectPart, blankDefectPart, removeDefectPart, updateDefectPart, type DefectPart } from "@/src/lib/defects/defect-parts";

export const ADD_PART_LABEL = "ADD ANOTHER PART";

export default function PartsUsedList({ parts, onChange }: { parts: DefectPart[]; onChange: (next: DefectPart[]) => void }) {
  /* ALWAYS AT LEAST ONE ROW. This list is only on screen because PARTS USED is
     ticked, and a ticked box over an empty list would be a section with nothing
     to type in. `removeDefectPart` keeps the same floor. */
  const rows = parts.length ? parts : [blankDefectPart()];
  const many = rows.length > 1;
  return (
    <div className="parts-list">
      {rows.map((part, index) => (
        <div className="parts-row" key={part.id}>
          {/* NUMBERED ONLY WHEN THERE IS MORE THAN ONE. "PART NUMBER 1" above a
              single box reads as though a second is required. */}
          <label>
            PART NUMBER{many ? " " + (index + 1) : ""}
            <input
              value={part.partNumber}
              onChange={event => onChange(updateDefectPart(rows, part.id, { partNumber: event.target.value }))}
              placeholder="Leave blank if the number is unknown"
            />
          </label>
          <label>
            PART NAME (OPTIONAL)
            <input
              value={part.partName || ""}
              onChange={event => onChange(updateDefectPart(rows, part.id, { partName: event.target.value }))}
              placeholder="Exact catalog name"
            />
          </label>
          {/* NO REMOVE ON A LONE ROW, because removing it cannot empty the list
              - untick PARTS USED to say no parts were used, which is the one
              gesture that means that. The accessible name carries the part's
              number so a screen reader does not read four identical buttons. */}
          {many && (
            <button
              type="button"
              className="remove-part"
              onClick={() => onChange(removeDefectPart(rows, part.id))}
              aria-label={"Remove part " + (index + 1) + (part.partNumber ? ", " + part.partNumber : "")}
            >
              <span aria-hidden="true">&times;</span>
              <b>REMOVE</b>
            </button>
          )}
        </div>
      ))}
      <button type="button" className="add-part" onClick={() => onChange(addDefectPart(rows))}>
        <span aria-hidden="true">+</span>
        <b>{ADD_PART_LABEL}</b>
      </button>
    </div>
  );
}
