/* eslint-disable @typescript-eslint/no-explicit-any */
import { PageHeader, Grid, ChartCard, Note, Badge } from "@/components/ui";
import KpiCard from "@/components/KpiCard";
import EChart from "@/components/EChart";
import DataTable from "@/components/DataTable";
import { parseFilters, MONTHS, type SP } from "@/lib/filters";
import { core, monthlySeries, mean } from "@/lib/kpi/core";
import { getStore, fxRate } from "@/lib/data/store";
import { fmt, type Fmt } from "@/lib/format";
import { K, X } from "@/lib/info/registry";

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const OPEX_NOTE = "With a business unit selected, company operating expenses are allocated to it in proportion to its share of revenue.";
  const f = parseFilters(await searchParams);
  const S = getStore();
  const k = core(f.months, f.bu);
  const fx = fxRate(f.cur);
  const tgt = (id: string) => S.targets.filter((t) => t.kpi_id === id && f.months.includes(t.month_id)).map((t) => t.target_value as number);
  const revT = tgt("REV").reduce((a, b) => a + b, 0) * (f.bu === "ALL" ? 1 : (k.REV! / core(f.months).REV!));
  const rows: { id: string; label: string; actual: number | null; target: number | null; f: Fmt; down?: boolean }[] = [
    { id: "REV", label: "Revenue", actual: k.REV, target: revT, f: "money" },
    { id: "GM", label: "Gross margin", actual: k.GM, target: mean(tgt("GM")), f: "pct1" },
    { id: "EBITDA_M", label: "EBITDA margin", actual: k.EBITDA_M, target: mean(tgt("EBITDA_M")), f: "pct1" },
    { id: "TR_OTD", label: "Translation on-time delivery", actual: k.TR_OTD, target: mean(tgt("TR_OTD")), f: "pct1" },
    { id: "FILL_ON_DEMAND", label: "On-demand fill rate", actual: k.FILL_ON_DEMAND, target: mean(tgt("FILL_ON_DEMAND")), f: "pct1" },
    { id: "QUALITY_SCORE", label: "Quality score", actual: k.QUALITY_SCORE, target: mean(tgt("QUALITY_SCORE")), f: "dec1" },
  ];
  const table = rows.map((r) => {
    const att = r.actual != null && r.target ? r.actual / r.target : null;
    return { kpi: r.label, actual: r.id === "REV" ? fmt(r.actual! / fx, "money", f.cur) : fmt(r.actual, r.f), target: r.id === "REV" ? fmt(r.target! / fx, "money", f.cur) : fmt(r.target, r.f), attainment: att, status: att == null ? "n/a" : att >= 1 ? "On target" : att >= 0.97 ? "Near" : "Behind" };
  });
  const series = monthlySeries(f.bu);
  const revTarget = MONTHS.map((m) => (S.targets.find((t) => t.kpi_id === "REV" && t.month_id === m)?.target_value as number) ?? 0);
  const share = f.bu === "ALL" ? 1 : k.REV! / core(f.months).REV!;
  const okrs = S.okrs.map((o) => Object.assign({} as Record<string, any>, o, { owner: S.ownerById.get(o.owner_id)!.owner_code as string }));
  const pillars = [...new Set(okrs.map((o) => o.pillar as string))];
  const avg = (p: string) => mean(okrs.filter((o) => o.pillar === p).map((o) => o.progress as number)) ?? 0;
  return (
    <>
      <PageHeader title="Executive Strategy" sub="Plan versus actual, strategic pillars and OKR progress." period={f.label} />
      <Grid cols={4}>
        <KpiCard info={X("ex.revVsPlan")} expand="REV" label="Revenue vs plan" value={revT ? k.REV! / revT : null} f="pct1" hint="Actual ÷ synthetic plan target" />
        <KpiCard info={K("GM")} expand="GM" label="Gross margin" value={k.GM} f="pct1" />
        <KpiCard info={K("EBITDA", { caveats: [OPEX_NOTE] })} expand="EBITDA" label="EBITDA" value={k.EBITDA! / fx} f="money" cur={f.cur} />
        <KpiCard info={X("ex.okrOnTrack")} expand="ex.okr" label="OKRs on track or complete" value={okrs.filter((o) => o.status === "ON_TRACK" || o.status === "COMPLETE").length / okrs.length} f="pct" />
      </Grid>
      <Grid cols={2}>
        <ChartCard info={X("ex.actualPlan")} expand="REV" title="Monthly revenue: actual vs plan" note="Plan = smoothed history × 1.03 (synthetic, illustrative)">
          <EChart label="Revenue actual versus plan" format="money" cur={f.cur} option={{
            xAxis: { type: "category", data: MONTHS }, yAxis: { type: "value" },
            series: [{ name: "Actual", type: "bar", data: series.map((s) => +(s.rev / fx).toFixed(0)), barMaxWidth: 14 }, { name: "Plan", type: "line", data: revTarget.map((v) => +(v * share / fx).toFixed(0)), symbolSize: 5 }],
          }} />
        </ChartCard>
        <ChartCard info={X("ex.okrPillar")} expand="ex.okr" title="OKR progress by pillar" note="Average key-result progress (0–100%)">
          <EChart label="OKR progress by pillar" format="pct" option={{
            legend: { show: false }, xAxis: { type: "value", max: 1 }, yAxis: { type: "category", data: [...pillars].reverse() },
            series: [{ type: "bar", data: [...pillars].reverse().map(avg), barMaxWidth: 18 }],
          }} />
        </ChartCard>
      </Grid>
      <div className="mb-4"><ChartCard info={X("ex.scorecard")} title="KPI scorecard" note="Status: On target ≥ 100% of target; Near ≥ 97%; otherwise Behind">
        <DataTable name="exec-scorecard" cols={[{ key: "kpi", label: "KPI" }, { key: "actual", label: "Actual", align: "right" }, { key: "target", label: "Target", align: "right" }, { key: "attainment", label: "Attainment", fmt: "pct1" }, { key: "status", label: "Status" }]} rows={table} />
      </ChartCard></div>
      <ChartCard info={X("ex.okrTable")} expand="ex.okr" title="Objectives and key results (as of the data cut-off)" note="Baseline = prior-year same period or opening value; progress = (current − baseline) ÷ (target − baseline)">
        <DataTable name="okrs" cols={[{ key: "pillar", label: "Pillar" }, { key: "key_result", label: "Key result" }, { key: "owner", label: "Owner" }, { key: "baseline_value", label: "Baseline", fmt: "dec2" }, { key: "current_value", label: "Current", fmt: "dec2" }, { key: "target_value", label: "Target", fmt: "dec2" }, { key: "progress", label: "Progress", fmt: "pct" }, { key: "status", label: "Status" }]} rows={okrs} />
      </ChartCard>
      <div className="mt-4 flex gap-2 text-xs"><Badge tone="mute">Illustrative targets</Badge><Badge tone="mute">Synthetic data</Badge></div>
      <div className="mt-3"><Note>Values in the OKR table that are money are in USD; ratios are 0–1 fractions shown in decimal form for baselines and targets.</Note></div>
    </>
  );
}
