import { PageHeader, Grid, ChartCard, Note } from "@/components/ui";
import KpiCard from "@/components/KpiCard";
import EChart from "@/components/EChart";
import DataTable from "@/components/DataTable";
import { parseFilters, pick, AS_OF, type SP } from "@/lib/filters";
import { pmUtil, mean } from "@/lib/kpi/core";
import { thresholds } from "@/lib/kpi/rules";
import { groupBy } from "@/lib/kpi/agg";
import { getStore } from "@/lib/data/store";
import { X } from "@/lib/info/registry";

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const f = parseFilters(sp);
  const typeF = pick(sp, "rt");
  const S = getStore();
  const act = S.resources.filter((r) => r.is_active);
  const types = [...groupBy(act, (r) => r.resource_type as string).entries()];
  const util = pmUtil(f.months);
  const w0 = Date.parse(f.months[0] + "-01"), w1 = Date.parse(f.to + "-28");
  const pms = S.owners.filter((o) => o.role === "PROJECT_MANAGER").map((o) => {
    const mine = S.projects.filter((p) => p.pm_owner_id === o.owner_id);
    let alloc = 0;
    for (const p of mine) { const st = Date.parse(p.start_date), du = Date.parse(p.due_date); const ov = Math.max(0, (Math.min(du, w1) - Math.max(st, w0)) / 864e5 + 1); alloc += (p.est_pm_hours * ov) / ((du - st) / 864e5 + 1); }
    const days = Math.max(0, (Math.min(o.termination_date ? Date.parse(o.termination_date) : w1, w1) - Math.max(Date.parse(o.hire_date), w0)) / 864e5 + 1);
    const cap = (o.weekly_capacity_hours * days) / 7;
    return { pm: o.owner_code, projects: mine.length, alloc, cap, util: cap ? alloc / cap : null, active: o.is_active ? "Active" : "Left" };
  });
  const onboard = S.resources.filter((r) => r.onboarded_date).map((r) => (Date.parse(r.onboarded_date) - Date.parse(r.application_date)) / 864e5);
  let roster = S.resources.map((r) => ({ code: r.anon_code, type: r.resource_type, region: r.region, domain: r.primary_domain, cert: r.certification_label, quality: r.quality_score, availability: r.availability, rate: r.rate_per_word_usd ?? r.rate_per_minute_usd, status: r.is_active ? "Active" : "Inactive", onboarded: r.onboarded_date }));
  if (typeF) roster = roster.filter((r) => r.type === typeF);
  return (
    <>
      <PageHeader title="HR & Workforce" sub="Who delivers the work: linguist and interpreter supply, onboarding speed and PM workload." period={f.label} />
      <Grid cols={4}>
        <KpiCard info={X("hr.active")} expand="hr:active" label="Active resources" value={act.length} f="num" hint={`As at ${AS_OF}`} />
        <KpiCard info={X("hr.quality")} expand="hr:quality" label="Avg quality score (active)" value={mean(act.map((r) => r.quality_score))} f="dec1" />
        <KpiCard info={X("hr.onboard")} expand="hr:onboard" label="Avg onboarding time (days)" value={mean(onboard)} f="dec1" good="down" />
        <KpiCard info={X("hr.pmUtil")} expand="PM_UTIL" label="PM utilisation" value={util} f="pct1" good="down" hint="Allocated PM hours ÷ available PM hours" />
      </Grid>
      <Grid cols={2}>
        <ChartCard info={X("hr.types")} expand="hr:active" title="Active resources by type"><EChart label="Resources by type" format="num" option={{ legend: { show: false }, xAxis: { type: "category", data: types.map(([t]) => t.replace("_", " ")) , axisLabel: { interval: 0, fontSize: 10 } }, yAxis: { type: "value" }, series: [{ type: "bar", data: types.map(([, v]) => v.length), barMaxWidth: 40 }] }} /></ChartCard>
        <ChartCard info={X("hr.scatter")} expand="hr:quality" title="Quality score vs availability (active)" note="Each dot is an anonymised resource; availability = share of weekly capacity free"><EChart label="Quality versus availability" format="dec1" option={{ legend: { show: false }, tooltip: { trigger: "item" }, xAxis: { type: "value", name: "Availability", min: 0, max: 1 }, yAxis: { type: "value", name: "Quality", min: 60, max: 100 }, series: [{ type: "scatter", symbolSize: 8, data: act.map((r) => [r.availability, r.quality_score]) }] }} /></ChartCard>
      </Grid>
      <div className="mb-4"><ChartCard info={X("hr.pm")} expand="PM_UTIL" title="Project manager workload" note={`Utilisation over the selected period; warn above ${Math.round(thresholds().pm_util_warning * 100)}%`}><DataTable name="pm-workload" cols={[{ key: "pm", label: "PM" }, { key: "projects", label: "Projects", fmt: "num" }, { key: "alloc", label: "Allocated hrs", fmt: "num" }, { key: "cap", label: "Capacity hrs", fmt: "num" }, { key: "util", label: "Utilisation", fmt: "pct" }, { key: "active", label: "Status" }]} rows={pms} /></ChartCard></div>
      <ChartCard info={X("hr.roster")} expand="hr:active" title="Resource roster (anonymised)" note="Filter with ?rt=FREELANCE_LINGUIST | INTERNAL_LINGUIST | FREELANCE_INTERPRETER | INTERNAL_INTERPRETER"><DataTable name="resources" cols={[{ key: "code", label: "Code" }, { key: "type", label: "Type" }, { key: "region", label: "Region" }, { key: "domain", label: "Domain" }, { key: "cert", label: "Certification (fictional)" }, { key: "quality", label: "Quality", fmt: "dec1" }, { key: "availability", label: "Availability", fmt: "pct" }, { key: "rate", label: "Rate (USD)", fmt: "dec2" }, { key: "status", label: "Status" }, { key: "onboarded", label: "Onboarded" }]} rows={roster} /></ChartCard>
      <div className="mt-4"><Note>No personal data: resources are coded identifiers with fictional attributes. Total assigned words are not shown per individual to avoid implying performance management.</Note></div>
    </>
  );
}
