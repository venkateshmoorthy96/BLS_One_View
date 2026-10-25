/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { getStore } from "@/lib/data/store";

export function revBy<K extends string>(months: string[], bu: string, key: (r: any) => K, val: (r: any) => number = (r) => r.revenue_usd) {
  const S = getStore();
  const ms = new Set(months);
  const m = new Map<K, number>();
  for (const r of S.revenue) {
    if (!ms.has(r.month_id) || (bu !== "ALL" && r.bu !== bu)) continue;
    const k = key(r);
    m.set(k, (m.get(k) ?? 0) + val(r));
  }
  return m;
}
export const entries = <K,>(m: Map<K, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]);
export const SL_LABEL: Record<string, string> = { TRANSLATION: "Translation", LOCALIZATION: "Localization", ALT_FORMAT: "Alternative formats", OPI: "Phone interpreting (OPI)", VRI: "Video interpreting (VRI)", ONSITE: "On-site interpreting" };
export function groupBy<T, K>(rows: T[], key: (r: T) => K) {
  const m = new Map<K, T[]>();
  for (const r of rows) { const k = key(r); const a = m.get(k); if (a) a.push(r); else m.set(k, [r]); }
  return m;
}
