import { PageHeader, Grid, ChartCard, Note } from "@/components/ui";
import KpiCard from "@/components/KpiCard";
import EChart from "@/components/EChart";
import DataTable from "@/components/DataTable";
import { parseFilters, pick, type SP } from "@/lib/filters";
import { sum, mean } from "@/lib/kpi/core";
import { groupBy } from "@/lib/kpi/agg";
import { getStore, fxRate } from "@/lib/data/store";
import { X } from "@/lib/info/registry";

const STAGES = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "CLOSED_WON"];
export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const f = parseFilters(sp);
  const stageF = pick(sp, "stage");
  const S = getStore();
  const fx = fxRate(f.cur);
  const lo = f.months[0] + "-01", hi = f.months[f.months.length - 1] + "-31";
  const all = S.opportunities;
  const open = all.filter((o) => !o.closed_date);
  const closed = all.filter((o) => o.closed_date && o.closed_date >= lo && o.closed_date <= hi);
  const won = closed.filter((o) => o.stage_current === "CLOSED_WON"), lost = closed.filter((o) => o.stage_current === "CLOSED_LOST");
  const created = all.filter((o) => o.created_date >= lo && o.created_date <= hi);
  const funnel = STAGES.map((s) => ({ name: s.replace("_", " "), value: new Set(S.oppEvents.filter((e) => e.stage === s && created.some((o) => o.opportunity_id === e.opportunity_id)).map((e) => e.opportunity_id)).size }));
  const src = [...groupBy(closed, (o) => o.lead_source as string).entries()].map(([s, os]) => ({ s, rate: os.filter((o) => o.stage_current === "CLOSED_WON").length / os.length, n: os.length }));
  const reasons = [...groupBy(lost, (o) => (o.loss_reason as string) ?? "UNSPECIFIED").entries()].map(([r, os]) => [r, os.length] as const).sort((a, b) => b[1] - a[1]);
  let rows = all.map((o) => ({ id: o.opportunity_id, prospect: o.prospect_name, type: o.opportunity_type, vertical: o.vertical, source: o.lead_source, stage: o.stage_current, value: o.value_usd / fx, prob: o.probability, created: o.created_date, close: o.closed_date ?? o.expected_close_date, owner: S.ownerById.get(o.owner_id)!.owner_code, quote: o.quote_turnaround_hours }));
  if (stageF) rows = rows.filter((r) => r.stage === stageF);
  return (
    <>
      <PageHeader title="Sales & Marketing" sub="Pipeline, conversion, lead sources and why deals are lost." period={f.label} />
      <Grid cols={5}>
        <KpiCard info={X("sm.open")} expand="sm:open" label="Open pipeline" value={sum(open.map((o) => o.value_usd)) / fx} f="money" cur={f.cur} hint="All open opportunities at the cut-off" />
        <KpiCard info={X("sm.weighted")} expand="sm:weighted" label="Weighted pipeline" value={sum(open.map((o) => o.value_usd * o.probability)) / fx} f="money" cur={f.cur} />
        <KpiCard info={X("sm.win")} expand="sm:win" label="Win rate (closed in period)" value={closed.length ? won.length / closed.length : null} f="pct1" />
        <KpiCard info={X("sm.won")} expand="sm:won" label="Won value" value={sum(won.map((o) => o.value_usd)) / fx} f="money" cur={f.cur} />
        <KpiCard info={X("sm.quote")} expand="sm:quote" label="Avg quote turnaround (h)" value={mean(created.map((o) => o.quote_turnaround_hours))} f="dec1" good="down" />
      </Grid>
      <Grid cols={3}>
        <ChartCard info={X("sm.funnel")} expand="sm:win" title="Conversion funnel" note="Opportunities created in period that reached each stage"><EChart label="Conversion funnel" format="num" option={{ legend: { show: false }, xAxis: { type: "value" }, yAxis: { type: "category", data: funnel.map((x) => x.name).reverse() }, series: [{ type: "bar", data: funnel.map((x) => x.value).reverse(), barMaxWidth: 20, label: { show: true, position: "right" } }] }} /></ChartCard>
        <ChartCard info={X("sm.source")} expand="sm:win" title="Win rate by lead source" note="Closed opportunities in period"><EChart label="Win rate by lead source" format="pct" option={{ legend: { show: false }, xAxis: { type: "category", data: src.map((x) => x.s) }, yAxis: { type: "value" }, series: [{ type: "bar", data: src.map((x) => +x.rate.toFixed(3)), barMaxWidth: 30 }] }} /></ChartCard>
        <ChartCard info={X("sm.loss")} expand="sm:loss" title="Loss reasons"><EChart label="Loss reasons" format="num" option={{ legend: { show: false }, xAxis: { type: "value" }, yAxis: { type: "category", data: reasons.map((r) => r[0]).reverse() }, series: [{ type: "bar", data: reasons.map((r) => r[1]).reverse(), barMaxWidth: 16 }] }} /></ChartCard>
      </Grid>
      <ChartCard info={X("sm.table")} expand="sm:open" title="Opportunities" note="Filter by stage with ?stage=PROPOSAL (LEAD, QUALIFIED, PROPOSAL, NEGOTIATION, CLOSED_WON, CLOSED_LOST)"><DataTable name="opportunities" cols={[{ key: "id", label: "ID" }, { key: "prospect", label: "Prospect (fictional)" }, { key: "type", label: "Type" }, { key: "vertical", label: "Vertical" }, { key: "source", label: "Source" }, { key: "stage", label: "Stage" }, { key: "value", label: `Value (${f.cur})`, fmt: "num" }, { key: "prob", label: "Prob.", fmt: "pct" }, { key: "created", label: "Created" }, { key: "close", label: "Close" }, { key: "owner", label: "Owner" }]} rows={rows} /></ChartCard>
      <div className="mt-4"><Note>Deal sizes and prospects are synthetic. Open pipeline is a snapshot at the data cut-off, independent of the date range.</Note></div>
    </>
  );
}
