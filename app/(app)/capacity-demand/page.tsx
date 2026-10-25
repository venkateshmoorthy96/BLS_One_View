import { PageHeader, Grid, ChartCard, Note } from "@/components/ui";
import KpiCard from "@/components/KpiCard";
import EChart from "@/components/EChart";
import DataTable from "@/components/DataTable";
import { parseFilters, pick, type SP } from "@/lib/filters";
import { sum } from "@/lib/kpi/core";
import { capacityStatus } from "@/lib/kpi/rules";
import { getStore, manifest } from "@/lib/data/store";
import { X } from "@/lib/info/registry";

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  parseFilters(sp);
  const lpF = pick(sp, "lp");
  const S = getStore();
  const cap = S.capacity.filter((c) => !lpF || S.lpById.get(c.lp_id)!.pair_label === lpF);
  const weeks = [...new Set(S.capacity.map((c) => c.week_start as string))].sort();
  const tot = weeks.map((w) => { const x = cap.filter((c) => c.week_start === w); return { w, d: sum(x.map((c) => c.demand_words)), s: sum(x.map((c) => c.supply_words)), fc: x[0]?.is_forecast }; });
  const fcW = weeks.filter((w) => S.capacity.find((c) => c.week_start === w)!.is_forecast);
  const lps = S.lps.map((l) => l.lp_id as string);
  const next8 = fcW.slice(0, 8);
  const pairRows = lps.map((lp) => {
    const x = S.capacity.filter((c) => c.lp_id === lp && next8.includes(c.week_start));
    const d = sum(x.map((c) => c.demand_words)), s = sum(x.map((c) => c.supply_words));
    return { pair: S.lpById.get(lp)!.pair_label, tier: S.lpById.get(lp)!.resource_tier, demand: d, supply: s, load: d / s, gap: Math.max(0, d - s), status: capacityStatus(d / s) };
  }).sort((a, b) => b.load - a.load);
  const heat: [number, number, number][] = [];
  lps.forEach((lp, yi) => weeks.forEach((w, xi) => { const c = S.capacity.find((z) => z.lp_id === lp && z.week_start === w); if (c) heat.push([xi, yi, +(c.demand_words / c.supply_words).toFixed(2)]); }));
  const surge = manifest().config.seeded_surge;
  const hot = pairRows.filter((r) => r.status === "Shortfall");
  return (
    <>
      <PageHeader title="Capacity & Demand" sub="Weekly demand versus linguist supply for 13 actual and 13 forecast weeks, by language pair." />
      <Grid cols={4}>
        <KpiCard info={X("cd.load")} expand="cd:load" label="Forecast load, next 8 weeks" value={sum(next8.map((w) => tot.find((t) => t.w === w)!.d)) / sum(next8.map((w) => tot.find((t) => t.w === w)!.s))} f="pct" good="down" />
        <KpiCard info={X("cd.short")} expand="cd:short" label="Pairs with a shortfall" value={hot.length} f="num" good="down" />
        <KpiCard info={X("cd.gap")} expand="cd:gap" label="Largest gap (words, 8 wks)" value={hot[0]?.gap ?? 0} f="words" good="down" />
        <KpiCard info={X("cd.weeks")} expand="cd:weeks" label="Forecast weeks" value={fcW.length} f="num" />
      </Grid>
      <Grid cols={2}>
        <ChartCard info={X("cd.weekly")} expand="cd:load" title="Weekly demand vs supply (words)" note="Weeks after 28 Sep 2026 are forecasts"><EChart label="Weekly demand versus supply" format="words" option={{ xAxis: { type: "category", data: tot.map((t) => t.w.slice(5)) }, yAxis: { type: "value" }, series: [{ name: "Demand", type: "bar", data: tot.map((t) => ({ value: t.d, itemStyle: { opacity: t.fc ? 0.55 : 1 } })), barMaxWidth: 14 }, { name: "Supply", type: "line", data: tot.map((t) => t.s), symbolSize: 4 }] }} /></ChartCard>
        <ChartCard info={X("cd.heat")} expand="cd:short" title="Load heatmap (demand ÷ supply)" note="Rows: language pairs. Above 1.0 = demand exceeds supply."><EChart label="Load heatmap" height={340} format="num" option={{ legend: { show: false }, grid: { left: 8, right: 16, top: 8, bottom: 56, containLabel: true }, tooltip: { trigger: "item" }, xAxis: { type: "category", data: weeks.map((w) => w.slice(5)), axisLabel: { fontSize: 9, interval: 1 } }, yAxis: { type: "category", data: S.lps.map((l) => l.pair_label as string), axisLabel: { fontSize: 9 } }, visualMap: { min: 0.4, max: 1.6, orient: "horizontal", left: "center", bottom: 0, calculable: false, inRange: { color: ["var(--heat-1)", "var(--heat-2)", "var(--heat-3)", "var(--heat-4)"] }, text: ["Over", "Under"] }, series: [{ type: "heatmap", data: heat }] }} /></ChartCard>
      </Grid>
      <ChartCard info={X("cd.table")} expand="cd:gap" title="Next 8 weeks by language pair" note="Filter the weekly chart with ?lp=EN>ES style pair label"><DataTable name="capacity-by-pair" cols={[{ key: "pair", label: "Pair" }, { key: "tier", label: "Tier" }, { key: "demand", label: "Demand (words)", fmt: "num" }, { key: "supply", label: "Supply (words)", fmt: "num" }, { key: "load", label: "Load", fmt: "pct" }, { key: "gap", label: "Gap (words)", fmt: "num" }, { key: "status", label: "Status" }]} rows={pairRows} /></ChartCard>
      <div className="mt-4"><Note>{surge.note}: languages {surge.language_codes.join(", ")} carry a seeded +{Math.round(surge.uplift * 100)}% uplift in forecast weeks. Actual-week demand equals the words in batches that started that week, so it is lumpy; forecast weeks are smoothed. Demand and supply are synthetic; the forecast is an illustrative scenario, not a statistical prediction. This tab ignores the global date range (fixed 26-week window).</Note></div>
    </>
  );
}
