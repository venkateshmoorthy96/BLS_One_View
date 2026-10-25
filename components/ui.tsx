import type { ReactNode } from "react";
import ChartCardClient from "@/components/ChartCardClient";
import type { InfoContent } from "@/lib/info/types";
export function PageHeader({ title, sub, period }: { title: string; sub: string; period?: string }) {
  return (
    <div className="mb-5">
      <h1>{title}</h1>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--ink-2)]">
        <span>{sub}</span>
        {period ? <span className="num inline-block rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-xs font-medium text-[var(--ink)]">Period: {period}</span> : null}
      </p>
    </div>
  );
}
export function Grid({ cols = 4, children }: { cols?: 2 | 3 | 4 | 5; children: ReactNode }) {
  const c = { 2: "lg:grid-cols-2", 3: "md:grid-cols-2 xl:grid-cols-3", 4: "sm:grid-cols-2 xl:grid-cols-4", 5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" }[cols];
  return <div className={`mb-4 grid grid-cols-1 gap-4 ${c}`}>{children}</div>;
}
/** Card for a chart or table, with an info icon and an Expand analysis action (`expand` = analysis key for deeper detail). */
export function ChartCard({ title, note, info, expand, children }: { title: string; note?: string; info?: InfoContent; expand?: string; children: ReactNode }) {
  return <ChartCardClient title={title} note={note} info={info} analysisKey={expand}>{children}</ChartCardClient>;
}
export function Note({ children }: { children: ReactNode }) {
  return <p className="mb-4 rounded-lg border border-[var(--line)] border-l-4 border-l-[var(--yellow)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--ink-2)]">{children}</p>;
}
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return <div className="mb-4"><h2 className="mb-2 text-[15px] font-semibold text-[var(--ink)]">{title}</h2>{children}</div>;
}
export function Badge({ tone, children }: { tone: "good" | "warn" | "bad" | "mute"; children: ReactNode }) {
  const [col, bg] = { good: ["var(--good)", "var(--good-bg)"], warn: ["var(--warn)", "var(--warn-bg)"], bad: ["var(--bad)", "var(--bad-bg)"], mute: ["var(--ink-2)", "var(--surface-2)"] }[tone];
  return <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold" style={{ color: col, background: bg, border: `1px solid color-mix(in srgb, ${col} 30%, transparent)` }}>{children}</span>;
}
