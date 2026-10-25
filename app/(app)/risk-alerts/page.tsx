import { PageHeader, Grid, ChartCard, Note } from "@/components/ui";
import KpiCard from "@/components/KpiCard";
import EChart from "@/components/EChart";
import AlertsClient from "./AlertsClient";
import { pick, type SP } from "@/lib/filters";
import { sum } from "@/lib/kpi/core";
import { getStore } from "@/lib/data/store";
import { X } from "@/lib/info/registry";

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const S = getStore();
  const open = S.alerts.filter((a) => a.status !== "RESOLVED");
  const rows = S.alerts.map((a) => ({ id: a.alert_id, severity: a.severity, domain: a.domain, rule: a.rule_id, description: a.description, trigger: a.trigger_text, likelihood: a.likelihood, impact: a.impact, exposure: a.exposure_usd, action: a.recommended_action, owner: S.ownerById.get(a.owner_id)!.owner_code, status: a.status, raised: a.raised_date, link: a.link_path }));
  const doms = [...new Set(S.alerts.map((a) => a.domain as string))];
  const matrix: [number, number, number][] = [];
  for (let l = 1; l <= 5; l++) for (let i = 1; i <= 5; i++) matrix.push([i - 1, l - 1, open.filter((a) => a.likelihood === l && a.impact === i).length]);
  return (
    <>
      <PageHeader title="Risk & Alerts" sub="Rule-derived alerts with severity, exposure and recommended action. Every alert states the rule that raised it." />
      <Grid cols={4}>
        <KpiCard info={X("ra.open")} expand="ra:open" label="Open alerts" value={open.length} f="num" good="down" />
        <KpiCard info={X("ra.crit")} expand="ra:crit" label="Critical + high" value={open.filter((a) => a.severity === "CRITICAL" || a.severity === "HIGH").length} f="num" good="down" />
        <KpiCard info={X("ra.exposure")} expand="ra:exposure" label="Exposure (USD, indicative)" value={sum(open.map((a) => a.exposure_usd))} f="money" good="down" hint="Exposures are not additive across rules; indicative only" />
        <KpiCard info={X("ra.resolved")} expand="ra:resolved" label="Resolved" value={S.alerts.length - open.length} f="num" />
      </Grid>
      <Grid cols={2}>
        <ChartCard info={X("ra.domain")} expand="ra:crit" title="Open alerts by domain and severity"><EChart label="Alerts by domain" format="num" option={{ xAxis: { type: "value" }, yAxis: { type: "category", data: doms.slice().reverse() }, series: ["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => ({ name: s, type: "bar", stack: "s", itemStyle: { color: ({ CRITICAL: "var(--color-danger)", HIGH: "var(--heat-3)", MEDIUM: "var(--s5)", LOW: "var(--s7)" } as Record<string, string>)[s] }, data: doms.slice().reverse().map((d) => open.filter((a) => a.domain === d && a.severity === s).length), barMaxWidth: 18 })) }} /></ChartCard>
        <ChartCard info={X("ra.matrix")} expand="ra:open" title="Risk matrix (open alerts)" note="Likelihood (rows) × impact (columns), 1–5 illustrative scale"><EChart label="Risk matrix" format="num" option={{ legend: { show: false }, tooltip: { trigger: "item" }, xAxis: { type: "category", data: ["1", "2", "3", "4", "5"], name: "Impact" }, yAxis: { type: "category", data: ["1", "2", "3", "4", "5"], name: "Likelihood" }, visualMap: { min: 0, max: 6, show: false, inRange: { color: ["var(--heat-1)", "var(--heat-2)", "var(--heat-3)", "var(--heat-4)"] } }, series: [{ type: "heatmap", data: matrix, label: { show: true } }] }} /></ChartCard>
      </Grid>
      <AlertsClient rows={rows} initialSev={pick(sp, "sev")} info={X("ra.table")} />
      <div className="mt-4"><Note>Alerts are computed by the data generator from documented rules (SLA, client health, capacity, disputes, FX and AR, connectors, corrective actions) and are not ML predictions.</Note></div>
    </>
  );
}
