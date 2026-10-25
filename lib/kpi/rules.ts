/* eslint-disable @typescript-eslint/no-explicit-any */
// Shared business rules. Every threshold comes from meta_config.csv (thresholds.*), so pages, the analysis engine
// and the info text all apply the same rule with the same numbers.
import "server-only";
import { manifest } from "@/lib/data/store";
import { AS_OF } from "@/lib/filters";

export type Thresholds = Record<string, number>;
export const thresholds = (): Thresholds => manifest().config.thresholds;

/** Translation SLA status of an undelivered batch at the cut-off. */
export function slaStatus(b: Record<string, any>, T: Thresholds = thresholds()): "Overdue" | "At risk" | "On track" {
  if (b.due_date < AS_OF) return "Overdue";
  return (Date.parse(b.due_date) - Date.parse(AS_OF)) / 864e5 <= T.sla_warning_days && b.pct_complete < T.sla_warning_progress ? "At risk" : "On track";
}
export const slaRuleText = (T: Thresholds = thresholds()) =>
  `Overdue: due before ${AS_OF}. At risk: due within ${T.sla_warning_days} days and under ${Math.round(T.sla_warning_progress * 100)}% complete.`;

/** Simulated connector health over a window. */
export const isDegraded = (uptime: number, T: Thresholds = thresholds()) => uptime < T.uptime_warning;

/** Capacity status of a language pair: above 100% demand exceeds supply by definition; above the warning threshold is tight. */
export const capacityStatus = (load: number, T: Thresholds = thresholds()) => (load > 1 ? "Shortfall" : load > T.capacity_load_warning ? "Tight" : "OK");
