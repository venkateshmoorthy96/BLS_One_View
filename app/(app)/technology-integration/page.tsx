import { PageHeader, Grid, ChartCard, Note, Badge } from "@/components/ui";
import KpiCard from "@/components/KpiCard";
import EChart from "@/components/EChart";
import DataTable from "@/components/DataTable";
import { type SP } from "@/lib/filters";
import { sum, mean } from "@/lib/kpi/core";
import { isDegraded } from "@/lib/kpi/rules";
import { groupBy } from "@/lib/kpi/agg";
import { getStore } from "@/lib/data/store";
import { X } from "@/lib/info/registry";

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  await searchParams;
  const S = getStore();
  const byC = groupBy(S.telemetry, (t) => t.connector_id as string);
  const rows = S.connectors.map((c) => {
    const t = byC.get(c.connector_id) ?? [];
    const req = sum(t.map((x) => x.requests));
    const err = sum(t.map((x) => x.errors_4xx + x.errors_5xx + x.errors_timeout));
    return { name: c.connector_name, category: c.category, protocol: c.protocol, env: c.sim_environment, uptime: sum(t.map((x) => x.up_minutes)) / sum(t.map((x) => x.monitored_minutes)), requests: req, errRate: err / req, records: sum(t.map((x) => x.records_ingested)), p95: mean(t.map((x) => x.p95_ms)), p99: mean(t.map((x) => x.p99_ms)), status: isDegraded(sum(t.map((x) => x.up_minutes)) / sum(t.map((x) => x.monitored_minutes))) ? "Degraded (simulated)" : "Healthy (simulated)" };
  });
  const days = [...new Set(S.telemetry.map((t) => t.date as string))].sort();
  const daily = days.map((d) => { const x = S.telemetry.filter((t) => t.date === d); return { d, up: sum(x.map((t) => t.up_minutes)) / sum(x.map((t) => t.monitored_minutes)), p95: mean(x.map((t) => t.p95_ms)) }; });
  const e4 = sum(S.telemetry.map((t) => t.errors_4xx)), e5 = sum(S.telemetry.map((t) => t.errors_5xx)), et = sum(S.telemetry.map((t) => t.errors_timeout));
  const req = sum(S.telemetry.map((t) => t.requests));
  return (
    <>
      <PageHeader title="Technology & Integration" sub="Health of 14 simulated connectors over 90 days: uptime, errors and latency." />
      <p className="mb-4 rounded-md border border-[var(--warn)] px-3 py-2 text-sm text-[var(--warn)]"><b>SIMULATED.</b> No real systems are connected. Telemetry is generated to show what an integration monitoring view would look like.</p>
      <Grid cols={4}>
        <KpiCard info={X("te.uptime")} expand="te:uptime" label="Overall uptime (90 d)" value={sum(S.telemetry.map((t) => t.up_minutes)) / sum(S.telemetry.map((t) => t.monitored_minutes))} f="pct1" />
        <KpiCard info={X("te.err")} expand="te:err" label="Error rate" value={(e4 + e5 + et) / req} f="pct1" good="down" />
        <KpiCard info={X("te.latency")} expand="te:latency" label="Avg p95 latency (ms)" value={mean(S.telemetry.map((t) => t.p95_ms))} f="num" good="down" />
        <KpiCard info={X("te.degraded")} expand="te:degraded" label="Degraded connectors" value={rows.filter((r) => isDegraded(r.uptime)).length} f="num" good="down" />
      </Grid>
      <Grid cols={2}>
        <ChartCard info={X("te.daily")} expand="te:uptime" title="Daily uptime (all connectors)"><EChart label="Daily uptime" format="pct1" option={{ legend: { show: false }, xAxis: { type: "category", data: daily.map((x) => x.d.slice(5)), axisLabel: { interval: 9 } }, yAxis: { type: "value", min: 0.99, max: 1 }, series: [{ type: "line", data: daily.map((x) => +x.up.toFixed(5)), symbolSize: 3 }] }} /></ChartCard>
        <ChartCard info={X("te.mix")} expand="te:err" title="Error mix"><EChart label="Error mix" format="num" option={{ legend: { show: false }, xAxis: { type: "category", data: ["4xx client", "5xx server", "Timeout"] }, yAxis: { type: "value" }, series: [{ type: "bar", data: [e4, e5, et], barMaxWidth: 40 }] }} /></ChartCard>
      </Grid>
      <ChartCard info={X("te.table")} expand="te:degraded" title="Connector health (simulated)"><DataTable name="connectors" pageSize={25} cols={[{ key: "name", label: "Connector" }, { key: "category", label: "Category" }, { key: "protocol", label: "Protocol" }, { key: "env", label: "Env" }, { key: "uptime", label: "Uptime", fmt: "pct1" }, { key: "requests", label: "Requests", fmt: "num" }, { key: "errRate", label: "Error rate", fmt: "pct1" }, { key: "records", label: "Records", fmt: "num" }, { key: "p95", label: "p95 ms", fmt: "num" }, { key: "p99", label: "p99 ms", fmt: "num" }, { key: "status", label: "Status" }]} rows={rows} /></ChartCard>
      <div className="mt-4 flex gap-2"><Badge tone="warn">Simulated</Badge><Note>Endpoints use the reserved .invalid domain and are never contacted.</Note></div>
    </>
  );
}
