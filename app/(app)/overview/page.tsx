import { PageHeader, Grid, ChartCard, Note } from "@/components/ui";
import KpiCard from "@/components/KpiCard";
import EChart from "@/components/EChart";
import DataTable from "@/components/DataTable";
import { parseFilters, type SP } from "@/lib/filters";
import { core, nrr, dso, monthlySeries } from "@/lib/kpi/core";
import { revBy, entries, SL_LABEL } from "@/lib/kpi/agg";
import { getStore, fxRate } from "@/lib/data/store";
import { K, X } from "@/lib/info/registry";

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const OPEX_NOTE = "With a business unit selected, company operating expenses are allocated to it in proportion to its share of revenue.";
  const NRR_INFO = K("NRR", { caveats: ["Measured at the data cut-off: the latest 12 months (2025-10 to 2026-09) against the cohort's opening 12 months (2024-10 to 2025-09). The reporting period does not change it.", "The business-unit filter narrows the cohort."], basis: { kind: "mismatch", text: "KPI dictionary NRR · app fixes the window at the cut-off, not the range end" } });
  const DSO_INFO = K("DSO", { caveats: ["Always measured at the 30 Sep 2026 cut-off; the dictionary describes the range end, but the app ignores the selected range for DSO.", "Simplified demo formula, not a statutory DSO."], basis: { kind: "mismatch", text: "KPI dictionary DSO · app measures at the cut-off, not the range end" } });
  const f = parseFilters(await searchParams);
  const S = getStore();
  const k = core(f.months, f.bu);
  const p = f.prior ? core(f.prior, f.bu) : null;
  const n = nrr(undefined, f.bu);
  const d = dso(undefined, f.bu);
  const fx = fxRate(f.cur);
  const series = monthlySeries(f.bu);
  const sl = entries(revBy(f.months, f.bu, (r) => r.service_line_id));
  const alerts = S.alerts.filter((a) => a.status !== "RESOLVED").slice(0, 8);
  const P = (key: string) => (p ? (p[key] as number | null) : undefined);
  return (
    <>
      <PageHeader title="Overview" sub="One-screen executive health check across revenue, profit, delivery, AI and risk." period={f.label} />
      <Grid cols={5}>
        <KpiCard info={K("REV")} expand="REV" label="Revenue" value={k.REV! / fx} prior={p ? P("REV")! / fx : undefined} f="money" cur={f.cur} />
        <KpiCard info={K("GM")} expand="GM" label="Gross margin" value={k.GM} prior={P("GM")} f="pct1" kind="pp" />
        <KpiCard info={K("EBITDA_M", { caveats: [OPEX_NOTE] })} expand="EBITDA_M" label="EBITDA margin" value={k.EBITDA_M} prior={P("EBITDA_M")} f="pct1" kind="pp" />
        <KpiCard info={K("ACTIVE_CLIENTS")} expand="ACTIVE_CLIENTS" label="Active clients" value={k.ACTIVE_CLIENTS} prior={P("ACTIVE_CLIENTS")} f="num" />
        <KpiCard info={NRR_INFO} expand="NRR" label="Net revenue retention (TTM)" value={n.NRR} f="pct1" hint="Fixed opening cohort, trailing 12 months vs prior 12 months" />
        <KpiCard info={K("TR_OTD")} expand="TR_OTD" label="Translation on-time delivery" value={k.TR_OTD} prior={P("TR_OTD")} f="pct1" kind="pp" />
        <KpiCard info={K("OPI_ASA")} expand="OPI_ASA" label="OPI speed to answer" value={k.OPI_ASA} prior={P("OPI_ASA")} f="sec" good="down" />
        <KpiCard info={K("AI_SHARE")} expand="AI_SHARE" label="AI-touched word share" value={k.AI_SHARE} prior={P("AI_SHARE")} f="pct1" kind="pp" />
        <KpiCard info={K("QUALITY_SCORE")} expand="QUALITY_SCORE" label="Quality score" value={k.QUALITY_SCORE} prior={P("QUALITY_SCORE")} f="dec1" />
        <KpiCard info={DSO_INFO} expand="DSO" label="DSO (days)" value={d.DSO} f="dec1" good="down" hint="Open AR ÷ invoiced last 90 days × 90" />
      </Grid>
      <Grid cols={2}>
        <ChartCard info={X("ov.revEbitda")} expand="EBITDA" title="Revenue and EBITDA by month" note="Monthly, all 33 months of synthetic history">
          <EChart label="Monthly revenue and EBITDA" format="money" cur={f.cur} option={{
            xAxis: { type: "category", data: series.map((s) => s.month) }, yAxis: { type: "value" },
            series: [{ name: "Revenue", type: "bar", data: series.map((s) => +(s.rev / fx).toFixed(0)), barMaxWidth: 14 }, { name: "EBITDA", type: "line", data: series.map((s) => +(s.ebitda / fx).toFixed(0)), symbolSize: 6 }],
          }} />
        </ChartCard>
        <ChartCard info={X("ov.bySl")} expand="REV" title="Revenue by service line" note={`Selected period, ${f.cur}`}>
          <EChart label="Revenue by service line" format="money" cur={f.cur} option={{
            legend: { show: false }, xAxis: { type: "value" }, yAxis: { type: "category", data: sl.map(([a]) => SL_LABEL[a]).reverse() },
            series: [{ type: "bar", data: sl.map(([, v]) => +(v / fx).toFixed(0)).reverse(), barMaxWidth: 18 }],
          }} />
        </ChartCard>
      </Grid>
      <ChartCard info={X("ov.alerts")} expand="ra:open" title="Open alerts (rule-derived, top 8 by severity)" note="Full list with rules and exposure on the Risk & Alerts tab">
        <DataTable name="overview-alerts" cols={[{ key: "severity", label: "Severity" }, { key: "domain", label: "Domain" }, { key: "description", label: "Alert" }, { key: "exposure_usd", label: "Exposure (USD)", fmt: "money" }]} rows={alerts} />
      </ChartCard>
      <div className="mt-4"><Note>All figures are computed from synthetic records. Monetary values are shown in {f.cur} using fixed illustrative rates; no real client or company data is represented.</Note></div>
    </>
  );
}
