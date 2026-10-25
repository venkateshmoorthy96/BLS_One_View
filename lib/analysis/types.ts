// Payload of an expanded analysis, computed on the server (lib/analysis/engine.ts) and rendered by components/ExpandAnalysis.tsx.
import type { Fmt } from "@/lib/format";

export type Num = number | null;
export type Stat = { label: string; v: Num; fmt: Fmt | "pp"; tone?: "good" | "bad" | "mute"; note?: string };
export type Series = { name: string; data: Num[]; type?: "bar" | "line"; dashed?: boolean; axis?: 0 | 1 };
export type Trend = {
  title: string; note?: string; x: string[]; series: Series[]; fmt: Fmt; fmt2?: Fmt;
  /** Shaded category ranges, e.g. the selected period and its comparison period. */
  bands?: { from: string; to: string; label: string; tone: "current" | "prior" }[];
};
export type BreakdownRow = { name: string; value: Num; prior?: Num; change?: Num; share?: Num; weight?: Num; highlight?: boolean; /** "dim:id" for drill-down */ drill?: string };
export type Breakdown = {
  title: string; note?: string; fmt: Fmt; changeKind?: "rel" | "pp" | "abs";
  weightLabel?: string; weightFmt?: Fmt; rows: BreakdownRow[]; showShare?: boolean;
};
export type Mover = { name: string; delta: number };
export type AnalysisPayload = {
  key: string;
  title: string;
  subtitle?: string;
  headline?: { v: Num; fmt: Fmt | "pp"; label: string };
  stats?: Stat[];
  trends?: Trend[];
  breakdowns?: Breakdown[];
  movers?: { title: string; fmt: Fmt; up: Mover[]; down: Mover[] };
  insights?: string[];
  unavailable?: string[];
  /** Filters this analysis was computed with, shown as chips. */
  context: { label: string; value: string; applied: boolean }[];
};
