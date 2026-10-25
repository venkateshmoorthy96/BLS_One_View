import { createElement } from "react";
import {
  Activity, Award, CalendarCheck, CircleDollarSign, Hourglass, Percent, PhoneCall, Repeat, Sparkles, Users, type LucideIcon,
} from "lucide-react";
import { delta, fmt, type Fmt } from "@/lib/format";
import type { Currency } from "@/lib/filters";
import InfoTip from "@/components/InfoTip";
import ExpandAnalysis from "@/components/ExpandAnalysis";
import { withComparison, type InfoContent } from "@/lib/info/types";

// Small decorative icon chosen from the label, so every page gets consistent icons without per-page wiring.
const ICON_RULES: [RegExp, LucideIcon][] = [
  [/speed to answer|answer|call|opi|vri/i, PhoneCall],
  [/retention|nrr|churn|renewal/i, Repeat],
  [/margin|ebitda|%|\brate\b|share of/i, Percent],
  [/revenue|cost|cash|profit|saving|\bar\b|invoice|pipeline|bookings|price|\$/i, CircleDollarSign],
  [/client|customer|account|linguist|interpreter|headcount|staff|vendor/i, Users],
  [/on-time|delivery|deadline|sla/i, CalendarCheck],
  [/\bai\b|automation|mt\b|machine/i, Sparkles],
  [/quality|lqa|score|compliance/i, Award],
  [/dso|days|time|hours|age/i, Hourglass],
];
const pickIcon = (label: string) => ICON_RULES.find(([re]) => re.test(label))?.[1] ?? Activity;

export default function KpiCard({ label, value, prior, f, cur = "USD", kind = "rel", good = "up", hint, info, expand }: {
  label: string; value: number | null; prior?: number | null; f: Fmt; cur?: Currency; kind?: "rel" | "pp"; good?: "up" | "down"; hint?: string; info?: InfoContent;
  /** Analysis key for the Expand analysis view (lib/analysis/engine.ts). */ expand?: string;
}) {
  const tip = info && prior !== undefined ? withComparison(info, kind, good) : info;
  const d = prior !== undefined ? delta(value, prior, kind) : null;
  const tone = !d || d.sign === 0 ? "mute" : (d.sign > 0) === (good === "up") ? "good" : "bad";
  const color = { mute: "var(--ink-3)", good: "var(--good)", bad: "var(--bad)" }[tone];
  const bg = { mute: "transparent", good: "var(--good-bg)", bad: "var(--bad-bg)" }[tone];
  return (
    <div className="card flex flex-col p-4" title={info ? undefined : hint}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium leading-snug text-[var(--ink-2)]">{label}{tip && <InfoTip info={tip} className="-my-1 ml-0.5" />}</div>
        <div className="flex shrink-0 items-center gap-0.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--tint)] text-[var(--ink)]" aria-hidden>{createElement(pickIcon(label), { size: 15, strokeWidth: 1.75 })}</span>
          {expand && <ExpandAnalysis title={label} analysisKey={expand} info={tip} />}
        </div>
      </div>
      <div className="num mt-1.5 text-[1.6rem] font-semibold leading-tight text-[var(--ink)]">{fmt(value, f, cur)}</div>
      <div className="num mt-2 min-h-5 text-xs">
        {d ? (
          <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium" style={{ color, background: bg }}>
            {d.sign > 0 ? "▲" : d.sign < 0 ? "▼" : "•"} {d.text}<span className="font-normal text-[var(--ink-2)]">vs prior</span>
          </span>
        ) : prior === undefined ? "" : <span className="text-[var(--ink-3)]">no prior period</span>}
      </div>
    </div>
  );
}
