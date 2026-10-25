import { PageHeader, Grid, ChartCard, Note } from "@/components/ui";
import KpiCard from "@/components/KpiCard";
import EChart from "@/components/EChart";
import DataTable from "@/components/DataTable";
import { parseFilters, MONTHS, type SP } from "@/lib/filters";
import { core, sum } from "@/lib/kpi/core";
import { groupBy } from "@/lib/kpi/agg";
import { getStore, manifest, fxRate } from "@/lib/data/store";
import { K, X } from "@/lib/info/registry";

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const f = parseFilters(await searchParams);
  const S = getStore();
  const k = core(f.months, f.bu), p = f.prior ? core(f.prior, f.bu) : null;
  const fx = fxRate(f.cur);
  const ok = (c: string) => f.bu === "ALL" || S.clientById.get(c)!.business_unit === f.bu;
  const share = MONTHS.map((m) => { const b = S.batches.filter((x) => x.deliv_month === m && ok(x.client_id)); const w = sum(b.map((x) => x.words_total)); return w ? sum(b.filter((x) => x.workflow_id !== "HT").map((x) => x.words_total)) / w : null; });
  const saved = MONTHS.map((m) => sum(S.ai.filter((a) => a.deliv_month === m && ok(a.client_id)).map((a) => a.est_cost_saved_usd)) / fx);
  const ms = new Set(f.months);
  const sel = S.ai.filter((a) => a.deliv_month && ms.has(a.deliv_month) && ok(a.client_id));
  const eng = [...groupBy(sel, (a) => a.engine_category as string).entries()].map(([e, as]) => { const w = sum(as.map((a) => a.words_total)); return { engine: e, batches: as.length, words: w, mtqe: sum(as.map((a) => a.mtqe_score * a.words_total)) / w, accepted: sum(as.map((a) => a.mtqe_accepted_words)) / w, edit: sum(as.map((a) => a.edit_distance * a.words_total)) / w, saved: sum(as.map((a) => a.est_cost_saved_usd)) / fx }; }).sort((a, b) => b.saved - a.saved);
  const sens = [...groupBy(sel, (a) => a.content_sensitivity as string).entries()].map(([s, as]) => ({ s, w: sum(as.map((a) => a.words_total)) }));
  const A = manifest().config.assumptions;
  const rows = sel.slice().sort((a, b) => b.est_cost_saved_usd - a.est_cost_saved_usd).slice(0, 500).map((a) => ({ batch: a.batch_id, engine: a.engine_category, sensitivity: a.content_sensitivity, words: a.words_total, mtqe: a.mtqe_score, accepted: a.mtqe_accepted_words / a.words_total, edit: a.edit_distance, hours: a.est_hours_saved, saved: a.est_cost_saved_usd / fx }));
  return (
    <>
      <PageHeader title="AI & Automation" sub="How much work is AI-touched, how well quality estimation holds up, and what the estimated savings rest on." period={f.label} />
      <Grid cols={5}>
        <KpiCard info={K("AI_SHARE")} expand="AI_SHARE" label="AI-touched word share" value={k.AI_SHARE} prior={p?.AI_SHARE} f="pct1" kind="pp" />
        <KpiCard info={K("MTQE_ACCEPT")} expand="MTQE_ACCEPT" label="MTQE acceptance" value={k.MTQE_ACCEPT} prior={p?.MTQE_ACCEPT} f="pct1" kind="pp" hint="Share of AI words with QE score ≥ threshold" />
        <KpiCard info={K("AI_EDIT_DIST")} expand="AI_EDIT_DIST" label="Edit distance (words-weighted)" value={k.AI_EDIT_DIST} prior={p?.AI_EDIT_DIST} f="pct1" kind="pp" good="down" />
        <KpiCard info={K("AI_HOURS_SAVED", { caveats: ["An assumption-driven estimate, not a measured result. See the assumptions panel on this tab."] })} expand="AI_HOURS_SAVED" label="Estimated hours saved" value={k.AI_HOURS_SAVED} prior={p?.AI_HOURS_SAVED} f="num" />
        <KpiCard info={K("AI_COST_SAVED", { caveats: ["An assumption-driven estimate, not a measured saving. See the assumptions panel on this tab."] })} expand="AI_COST_SAVED" label="Estimated cost saved" value={k.AI_COST_SAVED! / fx} prior={p ? p.AI_COST_SAVED! / fx : undefined} f="money" cur={f.cur} hint="Assumption-driven estimate" />
      </Grid>
      <Grid cols={2}>
        <ChartCard info={X("ai.shareTrend")} expand="AI_SHARE" title="AI-touched share of delivered words" note="Share rises as MTPE and AI-assisted review replace human-only translation"><EChart label="AI share trend" format="pct1" option={{ legend: { show: false }, xAxis: { type: "category", data: MONTHS }, yAxis: { type: "value" }, series: [{ type: "line", data: share.map((v) => (v == null ? null : +v.toFixed(4))), symbolSize: 5 }] }} /></ChartCard>
        <ChartCard info={X("ai.savings")} expand="AI_COST_SAVED" title="Estimated savings by month" note={f.cur}><EChart label="Estimated savings by month" format="money" cur={f.cur} option={{ legend: { show: false }, xAxis: { type: "category", data: MONTHS }, yAxis: { type: "value" }, series: [{ type: "bar", data: saved.map((v) => +v.toFixed(0)), barMaxWidth: 14 }] }} /></ChartCard>
      </Grid>
      <Grid cols={2}>
        <ChartCard info={X("ai.engine")} expand="MTQE_ACCEPT" title="By engine category"><DataTable name="ai-by-engine" cols={[{ key: "engine", label: "Engine" }, { key: "batches", label: "Batches", fmt: "num" }, { key: "words", label: "Words", fmt: "num" }, { key: "mtqe", label: "Avg QE score", fmt: "dec2" }, { key: "accepted", label: "Accepted", fmt: "pct1" }, { key: "edit", label: "Edit distance", fmt: "pct1" }, { key: "saved", label: `Saved (${f.cur})`, fmt: "num" }]} rows={eng} /></ChartCard>
        <ChartCard info={X("ai.assumptions")} expand="AI_COST_SAVED" title="Assumptions behind the savings estimate" note="Editable assumptions, fixed in this demo">
          <ul className="space-y-1 p-1 text-sm">
            <li>Human translation throughput: <b>{A.baseline_words_per_hour}</b> words/hour</li>
            <li>Blended review labour cost: <b>${A.review_hourly_cost_usd}</b>/hour</li>
            <li>Full post-edit: <b>{A.full_postedit_words_per_hour}</b> w/h · light review: <b>{A.light_review_words_per_hour}</b> w/h</li>
            <li>QE acceptance threshold: <b>{manifest().config.thresholds.mtqe_accept_threshold}</b> · tooling: <b>${A.tooling_cost_per_ai_word_usd}</b>/AI word</li>
            <li>Content sensitivity mix: {sens.map((x) => `${x.s} ${((x.w / Math.max(1, sum(sens.map((y) => y.w)))) * 100).toFixed(0)}%`).join(" · ")}</li>
          </ul>
          <p className="mt-2 text-xs text-[var(--ink-2)]">Quality is tracked with QE score and edit distance only. BLEU and COMET are not used or mixed in.</p>
        </ChartCard>
      </Grid>
      <ChartCard info={X("ai.batches")} expand="AI_COST_SAVED" title="Largest estimated savings (top 500 batches)"><DataTable name="ai-batches" cols={[{ key: "batch", label: "Batch" }, { key: "engine", label: "Engine" }, { key: "sensitivity", label: "Sensitivity" }, { key: "words", label: "Words", fmt: "num" }, { key: "mtqe", label: "QE score", fmt: "dec2" }, { key: "accepted", label: "Accepted", fmt: "pct1" }, { key: "edit", label: "Edit dist.", fmt: "pct1" }, { key: "hours", label: "Hours saved", fmt: "dec1" }, { key: "saved", label: `Saved (${f.cur})`, fmt: "num" }]} rows={rows} /></ChartCard>
      <div className="mt-4"><Note>Savings are estimates computed from the documented assumptions above, not measured outcomes.</Note></div>
    </>
  );
}
