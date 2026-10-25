import type { Currency } from "@/lib/filters";
export const SYM: Record<Currency, string> = { USD: "$", EUR: "€", GBP: "£" };
export function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(0);
}
export type Fmt = "money" | "money_full" | "pct" | "pct1" | "num" | "dec1" | "dec2" | "sec" | "days" | "words" | "text";
export function fmt(v: number | null | undefined, f: Fmt, cur: Currency = "USD"): string {
  if (v == null || Number.isNaN(v)) return "n/a";
  switch (f) {
    case "money": return (v < 0 ? "-" : "") + SYM[cur] + compact(Math.abs(v));
    case "money_full": return (v < 0 ? "-" : "") + SYM[cur] + Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
    case "pct": return (v * 100).toFixed(0) + "%";
    case "pct1": return (v * 100).toFixed(1) + "%";
    case "num": return Math.round(v).toLocaleString("en-US");
    case "dec1": return v.toFixed(1);
    case "dec2": return v.toFixed(2);
    case "sec": return v.toFixed(0) + " s";
    case "days": return v.toFixed(1) + " d";
    case "words": return compact(v);
    default: return String(v);
  }
}
// change vs prior: ratios in percentage points, others relative
export function delta(cur: number | null, prev: number | null | undefined, kind: "rel" | "pp"): { text: string; sign: number } | null {
  if (cur == null || prev == null || prev === 0 && kind === "rel") return null;
  if (kind === "pp") { const d = (cur - prev) * 100; return { text: `${d >= 0 ? "+" : ""}${d.toFixed(1)} pp`, sign: Math.sign(d) }; }
  const d = (cur / prev - 1) * 100;
  return { text: `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`, sign: Math.sign(d) };
}
