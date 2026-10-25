import { PageHeader, Grid, ChartCard, Note } from "@/components/ui";
import KpiCard from "@/components/KpiCard";
import EChart from "@/components/EChart";
import DataTable from "@/components/DataTable";
import { parseFilters, MONTHS, AS_OF, pick, type SP } from "@/lib/filters";
import { slaStatus, slaRuleText } from "@/lib/kpi/rules";
import { core } from "@/lib/kpi/core";
import { groupBy } from "@/lib/kpi/agg";
import { getStore } from "@/lib/data/store";
import { K, X } from "@/lib/info/registry";

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const f = parseFilters(sp);
  const lpF = pick(sp, "lp"), stageF = pick(sp, "stage");
  const S = getStore();
  const k = core(f.months, f.bu), p = f.prior ? core(f.prior, f.bu) : null;
  const ms = new Set(f.months);
  const okBu = (c: string) => f.bu === "ALL" || S.clientById.get(c)!.business_unit === f.bu;
  const dv = S.batches.filter((b) => b.status === "DELIVERED" && ms.has(b.deliv_month) && okBu(b.client_id));
  const monthly = MONTHS.map((m) => { const x = S.batches.filter((b) => b.deliv_month === m && okBu(b.client_id)); return { m, words: x.reduce((a, b) => a + b.words_total, 0), otd: x.length ? x.filter((b) => b.delivered_date <= b.due_date).length / x.length : null }; });
  const byLp = [...groupBy(dv, (b) => b.lp_id).entries()].map(([lp, bs]) => ({ pair: S.lpById.get(lp)!.pair_label as string, words: bs.reduce((a, b) => a + b.words_total, 0), batches: bs.length, otd: bs.filter((b) => b.delivered_date <= b.due_date).length / bs.length, tat: bs.reduce((a, b) => a + (Date.parse(b.delivered_date) - Date.parse(b.start_date)) / 864e5, 0) / bs.length, mtpe: bs.filter((b) => b.workflow_id !== "HT").reduce((a, b) => a + b.words_total, 0) / bs.reduce((a, b) => a + b.words_total, 0) })).sort((a, b) => b.words - a.words);
  const wf = ["HT", "MTPE", "AIR"].map((w) => ({ name: w, value: dv.filter((b) => b.workflow_id === w).reduce((a, b) => a + b.words_total, 0) }));
  const active = S.batches.filter((b) => b.status !== "DELIVERED" && okBu(b.client_id));
  const stages = [...groupBy(active, (b) => b.stage as string).entries()];
  let act = active.map((b) => ({ batch: b.batch_id, client: S.clientById.get(b.client_id)!.client_name, pair: S.lpById.get(b.lp_id)!.pair_label, workflow: b.workflow_id, words: b.words_total, stage: b.stage, due: b.due_date, progress: b.pct_complete, risk: slaStatus(b) }));
  if (lpF) act = act.filter((r) => r.pair === lpF);
  if (stageF) act = act.filter((r) => r.stage === stageF);
  return (
    <>
      <PageHeader title="Translation Ops" sub="Written-work throughput, delivery performance, workflow mix and the live pipeline." period={f.label} />
      <Grid cols={5}>
        <KpiCard info={K("TR_WORDS")} expand="TR_WORDS" label="Words delivered" value={k.TR_WORDS} prior={p?.TR_WORDS} f="words" />
        <KpiCard info={K("TR_OTD")} expand="TR_OTD" label="On-time delivery" value={k.TR_OTD} prior={p?.TR_OTD} f="pct1" kind="pp" />
        <KpiCard info={K("TR_TAT")} expand="TR_TAT" label="Turnaround (days)" value={k.TR_TAT} prior={p?.TR_TAT} f="dec1" good="down" />
        <KpiCard info={K("TM_REUSE")} expand="TM_REUSE" label="Translation-memory reuse" value={k.TM_REUSE} prior={p?.TM_REUSE} f="pct1" kind="pp" />
        <KpiCard info={K("REJECTION_RATE")} expand="REJECTION_RATE" label="Client rejection rate" value={k.REJECTION_RATE} prior={p?.REJECTION_RATE} f="pct1" kind="pp" good="down" />
      </Grid>
      <Grid cols={2}>
        <ChartCard info={X("tr.monthly")} expand="TR_WORDS" title="Words delivered and on-time rate by month"><EChart label="Words delivered and on-time rate" format="words" option={{ xAxis: { type: "category", data: MONTHS }, yAxis: [{ type: "value" }, { type: "value", min: 70, max: 100, axisLabel: { formatter: "{value}%" } }], series: [{ name: "Words", type: "bar", data: monthly.map((m) => m.words), barMaxWidth: 14 }, { name: "On-time rate", type: "line", yAxisIndex: 1, data: monthly.map((m) => (m.otd == null ? null : +(m.otd * 100).toFixed(2))), symbolSize: 5 }], }} /></ChartCard>
        <ChartCard info={X("tr.workflow")} expand="AI_SHARE" title="Workflow mix (words)" note="HT = human translation, MTPE = MT post-editing, AIR = AI-assisted review"><EChart label="Workflow mix" format="words" option={{ legend: { bottom: 0 }, tooltip: { trigger: "item" }, series: [{ type: "pie", radius: ["45%", "70%"], data: wf, label: { formatter: "{b}: {d}%" } }] }} /></ChartCard>
      </Grid>
      <div className="mb-4"><ChartCard info={X("tr.byPair")} expand="TR_OTD" title="Performance by language pair">
        <DataTable name="translation-by-pair" cols={[{ key: "pair", label: "Language pair" }, { key: "batches", label: "Batches", fmt: "num" }, { key: "words", label: "Words", fmt: "num" }, { key: "otd", label: "On-time", fmt: "pct1" }, { key: "tat", label: "Turnaround (d)", fmt: "dec1" }, { key: "mtpe", label: "AI-touched share", fmt: "pct1" }]} rows={byLp} />
      </ChartCard></div>
      <Grid cols={2}>
        <ChartCard info={X("tr.stage")} expand="tr.pipeline" title="Active pipeline by stage"><EChart label="Active batches by stage" format="num" option={{ legend: { show: false }, xAxis: { type: "category", data: stages.map(([s]) => s) }, yAxis: { type: "value" }, series: [{ type: "bar", data: stages.map(([, v]) => v.length), barMaxWidth: 36 }] }} /></ChartCard>
        <ChartCard info={X("tr.status")} expand="tr.pipeline" title="Pipeline status"><div className="num grid grid-cols-3 gap-3 p-2 text-sm">
          {["On track", "At risk", "Overdue"].map((s) => <div key={s}>{s}<div className="text-2xl font-semibold">{act.filter((r) => r.risk === s).length}</div></div>)}
          <div className="col-span-3 text-xs text-[var(--ink-2)]">{slaRuleText()} Filters: <code>?lp=EN&gt;ES</code> style pair label, <code>?stage=…</code>.</div>
        </div></ChartCard>
      </Grid>
      <ChartCard info={X("tr.active")} expand="tr.pipeline" title="Active batches" note={`Snapshot at ${AS_OF}`}><DataTable name="active-batches" cols={[{ key: "batch", label: "Batch" }, { key: "client", label: "Client" }, { key: "pair", label: "Pair" }, { key: "workflow", label: "Workflow" }, { key: "words", label: "Words", fmt: "num" }, { key: "stage", label: "Stage" }, { key: "due", label: "Due" }, { key: "progress", label: "Progress", fmt: "pct" }, { key: "risk", label: "Status" }]} rows={act} /></ChartCard>
      <div className="mt-4"><Note>Delivery rates use batches delivered inside the selected months. Service line and workflow are separate dimensions, so MTPE words are never double counted.</Note></div>
    </>
  );
}
