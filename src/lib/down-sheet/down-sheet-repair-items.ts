import {normalizeFinding, normalizeRepairCount, normalizeRepairHours} from "../defects/repair-catalog.ts";
import {
  normalizeRepairTimeEstimate,
  repairTimeSum,
  repairTimeTotal,
  type RepairTimeEstimate,
} from "./repair-time-estimates.ts";

export type DownSheetRepairItem = {
  id: string;
  category: string;
  repair: string;
  details: string;
  estimateEnabled: boolean;
  timeEstimate: RepairTimeEstimate;
  /* Finished on its own. Repairs on one bus do not land together: brakes can be
     done on Monday and the A/C on Wednesday, and until a card could say so the
     whole entry had to stay open and none of the work could be written down. */
  done?: boolean;
  /* What was done, per repair rather than per entry. Hours especially: an entry
     with three repairs and two hours recorded once would bill those two hours
     three times over as each repair became its own record. */
  actionTaken?: string;
  finding?: string;
  /* How many, where the repair is counted rather than described: air bags
     replaced, radiator fans out. The catalog says which repairs carry one. */
  quantity?: number;
  repairHours?: number;
  diagnosticHours?: number;
};

export function isQuarantineEntry(entry: {
  category?: string;
  repair?: string;
  customReason?: string;
  repairItems?: Array<{category?: string; repair?: string; details?: string}>;
}) {
  const fields = [entry.category, entry.repair, entry.customReason];
  for (const item of entry.repairItems || []) fields.push(item.category, item.repair, item.details);
  return /\bquarantin(?:e|ed)\b/i.test(fields.filter(Boolean).join(" "));
}
function itemId(index: number) {
  return `repair-item-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`;
}

export function blankRepairItem(index = 0): DownSheetRepairItem {
  return {
    id: itemId(index),
    category: "",
    repair: "",
    details: "",
    estimateEnabled: false,
    timeEstimate: normalizeRepairTimeEstimate(undefined, "", ""),
  };
}

export function normalizeRepairItems(
  value: unknown,
  legacy: {category?: string; repair?: string; details?: string; timeEstimate?: unknown; entryCompleted?: boolean},
): DownSheetRepairItem[] {
  if (Array.isArray(value) && value.length) {
    return value.map((raw, index) => {
      const source = raw && typeof raw === "object" ? raw as Partial<DownSheetRepairItem> : {};
      const category = typeof source.category === "string" ? source.category : "";
      const repair = typeof source.repair === "string" ? source.repair : "";
      return {
        id: typeof source.id === "string" && source.id ? source.id : itemId(index),
        category,
        repair,
        details: typeof source.details === "string" ? source.details : "",
        estimateEnabled: source.estimateEnabled !== false,
        timeEstimate: normalizeRepairTimeEstimate(source.timeEstimate, category, repair),
        /* An entry saved before cards could be finished individually has no flag
           on any of them, so a completed entry reads as every repair done. */
        done: source.done === true || legacy.entryCompleted === true,
        actionTaken: typeof source.actionTaken === "string" ? source.actionTaken : "",
        finding: normalizeFinding(source.finding),
        quantity: normalizeRepairCount(source.quantity, category, repair),
        repairHours: normalizeRepairHours(source.repairHours),
        diagnosticHours: normalizeRepairHours(source.diagnosticHours),
      };
    });
  }

  const category = legacy.category || "";
  const repair = legacy.repair || "";
  const details = legacy.details || "";
  if (!category && !repair && !details) return [blankRepairItem()];
  return [{
    id: itemId(0),
    category,
    repair,
    details,
    estimateEnabled: true,
    timeEstimate: normalizeRepairTimeEstimate(legacy.timeEstimate, category, repair),
    done: legacy.entryCompleted === true,
  }];
}

/* WHAT SOMEBODY ON THE SHEET ACTUALLY CLAIMED about how long this repair runs.

   Every card carries a `timeEstimate`, because one is seeded from the catalog
   the moment a category is picked. So the presence of a number says nothing at
   all: the question is whether it still equals the catalog's own
   recommendation for that category and repair, and only a card that DIFFERS is
   somebody's claim. That is the test `pageThemeHeader` makes about a header
   colour, for the same reason — a stored copy of a default is not a decision,
   and reading it as one would freeze a guess onto the record as a figure a
   person stood behind.

   An estimate switched OFF is not a claim either. The sheet's own totals skip
   those cards and so does this.

   Compared and returned through the UNFLOORED sum, because the floor belongs to
   what the sheet prints rather than to what it was told. */
export function repairItemEstimateHours(item: {category?: string; repair?: string; estimateEnabled?: boolean; timeEstimate?: unknown}) {
  if (item.estimateEnabled === false) return undefined;
  const category = item.category || "", repair = item.repair || "";
  const minutes = repairTimeSum(normalizeRepairTimeEstimate(item.timeEstimate, category, repair));
  if (minutes === repairTimeSum(normalizeRepairTimeEstimate(undefined, category, repair))) return undefined;
  return normalizeRepairHours(minutes / 60);
}

export function repairItemsTotal(items: DownSheetRepairItem[]) {
  return items.reduce((total, item) => total + (item.estimateEnabled ? repairTimeTotal(item.timeEstimate) : 0), 0);
}

export function aggregateRepairItemEstimates(items: DownSheetRepairItem[]): RepairTimeEstimate {
  const enabled = items.filter(item => item.estimateEnabled);
  return enabled.reduce<RepairTimeEstimate>((total, item) => ({
    repairMinutes: total.repairMinutes + item.timeEstimate.repairMinutes,
    diagnosticMinutes: total.diagnosticMinutes + item.timeEstimate.diagnosticMinutes,
    accessMinutes: total.accessMinutes + item.timeEstimate.accessMinutes,
    complicationMinutes: total.complicationMinutes + item.timeEstimate.complicationMinutes,
    heatMinutes: total.heatMinutes + item.timeEstimate.heatMinutes,
    interruptionMinutes: total.interruptionMinutes + item.timeEstimate.interruptionMinutes,
    otherMinutes: total.otherMinutes + item.timeEstimate.otherMinutes,
    notes: [total.notes, item.timeEstimate.notes].filter(Boolean).join(" | "),
  }), {
    repairMinutes: 0,
    diagnosticMinutes: 0,
    accessMinutes: 0,
    complicationMinutes: 0,
    heatMinutes: 0,
    interruptionMinutes: 0,
    otherMinutes: 0,
    notes: "",
  });
}

export function repairItemsReason(items: DownSheetRepairItem[]) {
  return items
    .filter(item => item.category || item.repair || item.details)
    .map(item => [item.category, item.repair, item.details].filter(Boolean).join(" — "))
    .join(" | ");
}

/* How much of an entry is finished, for the row on the sheet. Without it a bus
   with two of three repairs done looks exactly like one that has not been
   touched. */
export function repairItemsProgress(items: DownSheetRepairItem[]) {
  const real = items.filter(item => item.category || item.repair || item.details);
  const done = real.filter(item => item.done).length;
  return {done, total: real.length, complete: real.length > 0 && done === real.length};
}
