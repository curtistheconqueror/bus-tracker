import {
  normalizeRepairTimeEstimate,
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
  legacy: {category?: string; repair?: string; details?: string; timeEstimate?: unknown},
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
  }];
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
