// Global filter contract (URL search params). Pure module: usable on server and client.
export const MONTHS: string[] = (() => {
  const out: string[] = [];
  for (let i = 0; i < 33; i++) {
    const k = i; // 2024-01 + i
    out.push(`${2024 + Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, "0")}`);
  }
  return out;
})();
export const AS_OF = "2026-09-30";
export const LATEST_MONTH = MONTHS[MONTHS.length - 1];

export type Range = "ytd" | "qtd" | "ttm" | "l6m" | "l3m" | "latest" | "all" | "custom";
export type Currency = "USD" | "EUR" | "GBP";
export const RANGES: { value: Range; label: string }[] = [
  { value: "ytd", label: "Year to date" },
  { value: "qtd", label: "Quarter to date" },
  { value: "ttm", label: "Trailing 12 months" },
  { value: "l6m", label: "Last 6 months" },
  { value: "l3m", label: "Last 3 months" },
  { value: "latest", label: "Latest month" },
  { value: "all", label: "All data" },
  { value: "custom", label: "Custom" },
];
// Conversion rates come from dim_fx_rate.csv (fxRate() in lib/data/store.ts); none are hardcoded here.
export const BUS = [
  { value: "ALL", label: "All business units" },
  { value: "UNIT_ALPHA", label: "Unit Alpha" },
  { value: "UNIT_BETA", label: "Unit Beta" },
  { value: "UNIT_GAMMA", label: "Unit Gamma" },
];

export type SP = Record<string, string | string[] | undefined>;
export type Filters = { range: Range; from: string; to: string; cur: Currency; bu: string; months: string[]; prior: string[] | null; label: string };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function windowMonths(range: Range, from?: string, to?: string): string[] {
  const m = MONTHS;
  switch (range) {
    case "ytd": return m.filter((x) => x.startsWith("2026-"));
    case "qtd": return m.slice(-3);
    case "ttm": return m.slice(-12);
    case "l6m": return m.slice(-6);
    case "l3m": return m.slice(-3);
    case "latest": return m.slice(-1);
    case "all": return m.slice();
    case "custom": {
      const f = from && m.includes(from) ? from : m[0];
      const t = to && m.includes(to) ? to : LATEST_MONTH;
      return m.filter((x) => x >= (f <= t ? f : t) && x <= (f <= t ? t : f));
    }
  }
}

export function priorMonths(range: Range, months: string[]): string[] | null {
  if (range === "all" || !months.length) return null;
  const i0 = MONTHS.indexOf(months[0]);
  if (range === "ytd") return MONTHS.filter((x) => x.startsWith("2025-") && Number(x.slice(5)) <= Number(LATEST_MONTH.slice(5)));
  const n = months.length;
  if (i0 - n < 0) return null;
  return MONTHS.slice(i0 - n, i0);
}

export function parseFilters(sp: SP): Filters {
  const r = one(sp.range) as Range | undefined;
  const range: Range = RANGES.some((x) => x.value === r) ? (r as Range) : "ytd";
  const cur = (["USD", "EUR", "GBP"].includes(one(sp.cur) ?? "") ? one(sp.cur) : "USD") as Currency;
  const bu = BUS.some((b) => b.value === one(sp.bu)) ? (one(sp.bu) as string) : "ALL";
  const months = windowMonths(range, one(sp.from), one(sp.to));
  return {
    range, from: months[0], to: months[months.length - 1], cur, bu, months,
    prior: priorMonths(range, months),
    label: `${months[0]} to ${months[months.length - 1]}`,
  };
}

export function pick(sp: SP, key: string): string {
  return one(sp[key]) ?? "";
}
