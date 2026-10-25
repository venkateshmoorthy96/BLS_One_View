import { PageHeader, Grid, ChartCard, Note } from "@/components/ui";
import KpiCard from "@/components/KpiCard";
import EChart from "@/components/EChart";
import DataTable from "@/components/DataTable";
import { parseFilters, MONTHS, pick, type SP } from "@/lib/filters";
import { core, sum, mean } from "@/lib/kpi/core";
import { getStore } from "@/lib/data/store";
import { K, X } from "@/lib/info/registry";

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const f = parseFilters(sp);
  const dispF = pick(sp, "dsev");
  const S = getStore();
  const k = core(f.months, f.bu), p = f.prior ? core(f.prior, f.bu) : null;
  const ok = (c: string) => f.bu === "ALL" || S.clientById.get(c)!.business_unit === f.bu;
  const ms = new Set(f.months);
  const ev = S.evals.filter((e) => ms.has(e.month) && ok(e.client_id));
  const evIds = new Set(ev.map((e) => e.evaluation_id));
  const errs = S.errors.filter((e) => evIds.has(e.evaluation_id));
  const cats = [...new Set(errs.map((e) => e.category as string))];
  const sevs = ["MINOR", "MAJOR", "CRITICAL"];
  const monthly = MONTHS.map((m) => mean(S.evals.filter((e) => e.month === m && ok(e.client_id)).map((e) => e.score)));
  const open = ev.filter((e) => e.corrective_status === "OPEN" && e.corrective_action !== "NONE_REQUIRED");
  const perK = sum(ev.map((e) => e.critical_count + e.major_count + e.minor_count)) / Math.max(1, sum(ev.map((e) => e.sample_words))) * 1000;
  let rows = ev.slice().sort((a, b) => (a.eval_date < b.eval_date ? 1 : -1)).slice(0, 500).map((e) => ({ id: e.evaluation_id, batch: e.batch_id, date: e.eval_date, resource: S.resById.get(e.resource_id)!.anon_code, sample: e.sample_words, crit: e.critical_count, major: e.major_count, minor: e.minor_count, score: e.score, outcome: e.outcome, dispute: e.dispute_status, action: e.corrective_action, status: e.corrective_status }));
  if (dispF) rows = rows.filter((r) => r.dispute === dispF);
  return (
    <>
      <PageHeader title="Quality & Compliance" sub="Linguistic quality scores, error profile, disputes and corrective actions (illustrative MQM-style framework)." period={f.label} />
      <Grid cols={5}>
        <KpiCard info={K("QUALITY_SCORE")} expand="QUALITY_SCORE" label="Quality score" value={k.QUALITY_SCORE} prior={p?.QUALITY_SCORE} f="dec1" hint="100 − weighted penalties per 1,000 words" />
        <KpiCard info={K("REVIEW_PASS")} expand="REVIEW_PASS" label="Review pass rate" value={k.REVIEW_PASS} prior={p?.REVIEW_PASS} f="pct1" kind="pp" />
        <KpiCard info={X("qc.perK")} expand="qc:perK" label="Errors per 1,000 words" value={perK} f="dec1" good="down" />
        <KpiCard info={K("OPEN_DISPUTES")} expand="OPEN_DISPUTES" label="Open disputes" value={k.OPEN_DISPUTES} f="num" good="down" />
        <KpiCard info={X("qc.ca")} expand="qc:ca" label="Open corrective actions" value={open.length} f="num" good="down" />
      </Grid>
      <Grid cols={2}>
        <ChartCard info={X("qc.monthly")} expand="QUALITY_SCORE" title="Average quality score by month"><EChart label="Quality score trend" format="dec1" option={{ legend: { show: false }, xAxis: { type: "category", data: MONTHS }, yAxis: { type: "value", min: 85, max: 100 }, series: [{ type: "line", data: mean(monthly.filter((x): x is number => x != null)) == null ? [] : monthly.map((v) => (v == null ? null : +v.toFixed(2))), symbolSize: 5 }] }} /></ChartCard>
        <ChartCard info={X("qc.errors")} expand="qc:perK" title="Errors by category and severity" note="Scoring weights: minor 1, major 5, critical 25 points per 1,000 sampled words; pass = score ≥ 90 and no critical"><EChart label="Errors by category" format="num" option={{ xAxis: { type: "value" }, yAxis: { type: "category", data: cats.slice().reverse() }, series: sevs.map((s) => ({ name: s, type: "bar", stack: "e", data: cats.slice().reverse().map((c) => errs.filter((e) => e.category === c && e.severity === s).length), barMaxWidth: 16 })) }} /></ChartCard>
      </Grid>
      <ChartCard info={X("qc.table")} expand="REVIEW_PASS" title="Evaluations (latest 500 in period)" note="Filter disputes with ?dsev=OPEN"><DataTable name="evaluations" cols={[{ key: "id", label: "Evaluation" }, { key: "batch", label: "Batch" }, { key: "date", label: "Date" }, { key: "resource", label: "Linguist" }, { key: "sample", label: "Sample words", fmt: "num" }, { key: "crit", label: "Crit", fmt: "num" }, { key: "major", label: "Major", fmt: "num" }, { key: "minor", label: "Minor", fmt: "num" }, { key: "score", label: "Score", fmt: "dec1" }, { key: "outcome", label: "Outcome" }, { key: "dispute", label: "Dispute" }, { key: "action", label: "Corrective action" }, { key: "status", label: "Action status" }]} rows={rows} /></ChartCard>
      <div className="mt-4"><Note>The framework is an illustrative MQM-style scheme, not an official standard certification. Linguists appear only as anonymised codes.</Note></div>
    </>
  );
}
