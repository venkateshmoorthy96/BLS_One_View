// Contextual-information content shared by server pages and client components. Pure module.

export type InfoBasis = {
  /** dictionary: matches the KPI dictionary and the app code; code: derived from page code (not in the dictionary);
   *  mismatch: dictionary and app code differ; unverified: methodology not established in the codebase. */
  kind: "dictionary" | "code" | "mismatch" | "unverified";
  text: string;
};

export type InfoContent = {
  title: string;
  /** One or two sentences: shown in the hover/focus tooltip and read by screen readers. */
  summary: string;
  meaning?: string;
  calculation?: string[];
  interpretation?: string;
  comparison?: string;
  source?: string;
  caveats?: string[];
  basis?: InfoBasis;
};

export const SECTION_LABELS: [keyof InfoContent, string][] = [
  ["meaning", "What it means"],
  ["calculation", "How it is calculated"],
  ["interpretation", "How to interpret it"],
  ["comparison", "Comparison basis"],
  ["source", "Data source"],
  ["caveats", "Important caveats"],
];

/** Comparison text for KPI cards that show a change vs the prior period (see priorMonths in lib/filters.ts). */
export function priorComparison(kind: "rel" | "pp", good: "up" | "down"): string {
  return (
    "Compared with the prior period: for Year to date, the same months of 2025; for other ranges, the window of equal length immediately before the selected one. " +
    "No comparison for All data, or when that window would start before 2024-01. " +
    (kind === "pp" ? "The change is shown in percentage points (pp). " : "The change is shown as a relative % change. ") +
    `Green marks a move in the favourable direction (${good === "up" ? "higher" : "lower"} is better), red the opposite.`
  );
}

export function withComparison(info: InfoContent, kind: "rel" | "pp", good: "up" | "down"): InfoContent {
  return info.comparison ? info : { ...info, comparison: priorComparison(kind, good) };
}
