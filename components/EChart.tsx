"use client";
import { useContext, useEffect, useRef, useState } from "react";
import { ExpandedCtx } from "@/components/expand-context";
import type { EChartsOption } from "echarts";
import type { Currency } from "@/lib/filters";
import { fmt, type Fmt } from "@/lib/format";

type Props = { option: EChartsOption; height?: number; format?: Fmt; xFormat?: Fmt; cur?: Currency; label: string };

function css(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

// ECharts draws on a canvas, which cannot read CSS variables. Swap any "var(--token)" string in an option for its value.
function resolveVars<T>(v: T): T {
  if (typeof v === "string") { const m = /^var\((--[\w-]+)\)$/.exec(v); return (m ? css(m[1], v) : v) as T; }
  if (Array.isArray(v)) return v.map(resolveVars) as T;
  if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolveVars(x)])) as T;
  }
  return v;
}

export default function EChart({ option, height: baseHeight = 280, format = "num", cur = "USD", label }: Props) {
  const expanded = useContext(ExpandedCtx);
  const height = expanded ? Math.max(440, Math.round(baseHeight * 1.6)) : baseHeight;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let chart: import("echarts/core").ECharts | undefined;
    let ro: ResizeObserver | undefined;
    let dead = false;
    (async () => {
      const [core, charts, comps, renderers] = await Promise.all([import("echarts/core"), import("echarts/charts"), import("echarts/components"), import("echarts/renderers")]);
      if (dead || !ref.current) return;
      core.use([charts.BarChart, charts.LineChart, charts.PieChart, charts.ScatterChart, charts.HeatmapChart, charts.FunnelChart,
        comps.GridComponent, comps.TooltipComponent, comps.LegendComponent, comps.VisualMapComponent, comps.MarkLineComponent, comps.MarkAreaComponent, comps.DatasetComponent, renderers.CanvasRenderer]);
      chart = core.init(ref.current);
      const ink = css("--ink", "#20384A"), ink2 = css("--ink-2", "#617184"), line = css("--line", "#E3E7EB"), grid = css("--chart-grid", "#E5EAEE");
      const palette = [1, 2, 3, 4, 5, 6, 7].map((i) => css(`--s${i}`, "#29AFC7"));
      const font = css("--font-sans", "Arial, sans-serif");
      const o = resolveVars(option) as Record<string, unknown>;
      const fix = (ax: unknown, isY: boolean) => {
        const list = Array.isArray(ax) ? ax : ax ? [ax] : [];
        return list.map((a: Record<string, unknown>) => ({
          ...a,
          nameTextStyle: { color: ink2, fontSize: 11, ...(a.nameTextStyle as object) },
          axisLabel: { color: ink2, fontSize: 11, ...(isY && a.type !== "category" ? { formatter: (v: number) => fmt(v, format, cur) } : {}), ...(a.axisLabel as object) },
          axisLine: { lineStyle: { color: line } }, splitLine: { show: isY, lineStyle: { color: grid } }, axisTick: { show: false },
        }));
      };
      // A page's own tooltip replaces the default behaviour (as before); only the visual styling is shared.
      const userTooltip = (o.tooltip as Record<string, unknown> | undefined) ?? { trigger: "axis", valueFormatter: (v: unknown) => (typeof v === "number" ? fmt(v, format, cur) : String(v)) };
      chart.setOption({
        color: palette, textStyle: { color: ink2, fontFamily: font }, animation: false,
        grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
        legend: { top: 0, icon: "roundRect", textStyle: { color: ink2, fontSize: 11 }, itemWidth: 12, itemHeight: 8 },
        ...o,
        tooltip: {
          backgroundColor: "#FFFFFF", borderColor: line, borderWidth: 1, padding: [8, 10],
          textStyle: { color: ink, fontSize: 12, fontFamily: font },
          extraCssText: "border-radius:8px;box-shadow:0 4px 14px rgba(32,56,74,.12);",
          ...userTooltip,
        },
        xAxis: o.xAxis ? fix(o.xAxis, false) : undefined, yAxis: o.yAxis ? fix(o.yAxis, true) : undefined,
      } as EChartsOption);
      ro = new ResizeObserver(() => chart?.resize());
      ro.observe(ref.current);
    })();
    return () => { dead = true; ro?.disconnect(); chart?.dispose(); };
  }, [option, format, cur]);
  return (
    <>
      <div ref={ref} role="img" aria-label={label} style={{ height, width: "100%" }} />
      {expanded && <ChartTable option={option} format={format} cur={cur} label={label} />}
    </>
  );
}

type Cell = string | number | null;
/** Rows behind a category chart (bar/line) or pie, read from the same option the chart draws. */
function tableFromOption(option: EChartsOption): { head: string[]; rows: Cell[][]; axis2: boolean[] } | null {
  const o = option as Record<string, unknown>;
  const list = (x: unknown) => (Array.isArray(x) ? x : x ? [x] : []) as Record<string, unknown>[];
  const series = list(o.series);
  const val = (d: unknown): number | null => (d == null ? null : typeof d === "object" ? ((d as { value?: number }).value ?? null) : (d as number));
  if (series.some((s) => s.type === "heatmap" || s.type === "scatter")) return null;
  if (series[0]?.type === "pie") {
    const data = (series[0].data ?? []) as { name: string; value: number }[];
    const total = data.reduce((a, d) => a + d.value, 0);
    return { head: ["Category", "Value", "Share"], rows: data.map((d) => [d.name, d.value, total ? `${((d.value / total) * 100).toFixed(1)}%` : null]), axis2: [false, false] };
  }
  const cat = [...list(o.xAxis), ...list(o.yAxis)].find((a) => a.type === "category" && Array.isArray(a.data));
  if (!cat) return null;
  const cats = cat.data as string[];
  return {
    head: ["Category", ...series.map((s, i) => String(s.name ?? (series.length === 1 ? "Value" : `Series ${i + 1}`)))],
    rows: cats.map((c, i) => [c, ...series.map((s) => val((s.data as unknown[] | undefined)?.[i]))]),
    axis2: series.map((s) => s.yAxisIndex === 1),
  };
}

function ChartTable({ option, format, cur, label }: { option: EChartsOption; format: Fmt; cur: Currency; label: string }) {
  const [show, setShow] = useState(false);
  const t = tableFromOption(option);
  return (
    <div className="mt-2">
      <button type="button" className="btn" aria-expanded={show} onClick={() => setShow(!show)}>{show ? "Hide data table" : "Show data table"}</button>
      {show && (t ? (
        <div className="mt-2 max-h-80 overflow-auto rounded-lg border border-[var(--line)]">
          <table className="w-full text-sm">
            <caption className="sr-only">Data behind: {label}</caption>
            <thead className="sticky top-0 bg-[var(--surface-2)] text-left text-xs text-[var(--ink-2)]"><tr>{t.head.map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
            <tbody>{t.rows.map((r, i) => (
              <tr key={i} className="border-t border-[var(--line)]">{r.map((c, j) => (
                <td key={j} className={`num px-3 py-1.5 ${j ? "text-right" : ""}`}>{typeof c === "number" ? (j && t.axis2[j - 1] ? c.toLocaleString("en-US", { maximumFractionDigits: 2 }) : fmt(c, format, cur)) : c ?? "–"}</td>
              ))}</tr>))}</tbody>
          </table>
        </div>
      ) : <p className="mt-2 text-xs text-[var(--ink-2)]">A table view is not available for this chart type (heatmap or scatter); hover the chart for values.</p>)}
    </div>
  );
}
