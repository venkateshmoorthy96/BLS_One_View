import { PageHeader, Grid, ChartCard, Note } from "@/components/ui";
import KpiCard from "@/components/KpiCard";
import EChart from "@/components/EChart";
import DataTable from "@/components/DataTable";
import { parseFilters, LATEST_MONTH, pick, type SP } from "@/lib/filters";
import { core, nrr } from "@/lib/kpi/core";
import { revBy, entries, groupBy } from "@/lib/kpi/agg";
import { getStore, fxRate } from "@/lib/data/store";
import { K, X } from "@/lib/info/registry";

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const NRR_INFO = K("NRR", { caveats: ["Measured at the data cut-off: the latest 12 months (2025-10 to 2026-09) against the cohort's opening 12 months (2024-10 to 2025-09). The reporting period does not change it.", "The business-unit filter narrows the cohort."], basis: { kind: "mismatch", text: "KPI dictionary NRR · app fixes the window at the cut-off, not the range end" } });
  const sp = await searchParams;
  const f = parseFilters(sp);
  const tierF = pick(sp, "tier"), healthF = pick(sp, "health");
  const S = getStore();
  const k = core(f.months, f.bu), p = f.prior ? core(f.prior, f.bu) : null;
  const n = nrr(undefined, f.bu);
  const fx = fxRate(f.cur);
  const byClient = revBy(f.months, f.bu, (r) => r.client_id);
  const tier = entries(revBy(f.months, f.bu, (r) => S.clientById.get(r.client_id)!.tier));
  const vert = entries(revBy(f.months, f.bu, (r) => S.clientById.get(r.client_id)!.vertical));
  const top = entries(byClient).slice(0, 10);
  const snap = new Map(S.snapshots.filter((s) => s.snapshot_month_id === LATEST_MONTH).map((s) => [s.client_id, s]));
  const bands = groupBy([...snap.values()], (s) => s.health_band as string);
  const ttm = revBy(f.months, f.bu, (r) => r.client_id);
  let roster = S.clients.filter((c) => f.bu === "ALL" || c.business_unit === f.bu).map((c) => {
    const s = snap.get(c.client_id);
    return { client: c.client_name, tier: c.tier, vertical: c.vertical, region: c.region, am: S.ownerById.get(c.account_manager_id)!.owner_code, revenue: (ttm.get(c.client_id) ?? 0) / fx, health: s?.health_score ?? null, band: s?.health_band ?? "n/a", status: c.churn_date ? "Churned" : "Active" };
  });
  if (tierF) roster = roster.filter((r) => r.tier === tierF);
  if (healthF) roster = roster.filter((r) => r.band === healthF);
  return (
    <>
      <PageHeader title="Client & Revenue" sub="Who pays us, how concentrated revenue is, and which relationships need attention." period={f.label} />
      <Grid cols={5}>
        <KpiCard info={K("REV")} expand="REV" label="Revenue" value={k.REV! / fx} prior={p ? p.REV! / fx : undefined} f="money" cur={f.cur} />
        <KpiCard info={K("ACTIVE_CLIENTS")} expand="ACTIVE_CLIENTS" label="Active clients" value={k.ACTIVE_CLIENTS} prior={p?.ACTIVE_CLIENTS} f="num" />
        <KpiCard info={K("ARPA")} expand="ARPA" label="Revenue per active client" value={k.ARPA! / fx} prior={p ? p.ARPA! / fx : undefined} f="money" cur={f.cur} />
        <KpiCard info={K("TOP10_CONC")} expand="TOP10_CONC" label="Top-10 concentration" value={k.TOP10_CONC} prior={p?.TOP10_CONC} f="pct1" kind="pp" good="down" />
        <KpiCard info={NRR_INFO} expand="NRR" label="Net revenue retention" value={n.NRR} f="pct1" hint="Trailing 12 months vs prior 12 months, fixed cohort" />
      </Grid>
      <Grid cols={3}>
        <ChartCard info={X("cr.top10")} expand="TOP10_CONC" title="Top 10 clients by revenue"><EChart label="Top 10 clients" format="money" cur={f.cur} option={{ legend: { show: false }, xAxis: { type: "value" }, yAxis: { type: "category", data: top.map(([c]) => S.clientById.get(c)!.client_name as string).reverse(), axisLabel: { width: 110, overflow: "truncate" } }, series: [{ type: "bar", data: top.map(([, v]) => +(v / fx).toFixed(0)).reverse(), barMaxWidth: 16 }] }} /></ChartCard>
        <ChartCard info={X("cr.tier")} expand="REV" title="Revenue by tier"><EChart label="Revenue by tier" format="money" cur={f.cur} option={{ legend: { show: false }, xAxis: { type: "category", data: tier.map(([t]) => t) }, yAxis: { type: "value" }, series: [{ type: "bar", data: tier.map(([, v]) => +(v / fx).toFixed(0)), barMaxWidth: 36 }] }} /></ChartCard>
        <ChartCard info={X("cr.vertical")} expand="REV" title="Revenue by vertical"><EChart label="Revenue by vertical" format="money" cur={f.cur} option={{ legend: { show: false }, xAxis: { type: "value" }, yAxis: { type: "category", data: vert.map(([t]) => t).reverse() }, series: [{ type: "bar", data: vert.map(([, v]) => +(v / fx).toFixed(0)).reverse(), barMaxWidth: 16 }] }} /></ChartCard>
      </Grid>
      <Grid cols={2}>
        <ChartCard info={X("cr.health")} expand="cr.health" title="Client health bands (latest quarter-end)" note="Score = 0.30 on-time + 0.25 quality + 0.20 payment timeliness + 0.25 revenue trend; ≥0.70 healthy, ≥0.50 watch">
          <EChart label="Client health bands" format="num" option={{ legend: { show: false }, xAxis: { type: "category", data: ["HEALTHY", "WATCH", "AT_RISK"] }, yAxis: { type: "value" }, series: [{ type: "bar", data: ["HEALTHY", "WATCH", "AT_RISK"].map((b) => ({ value: bands.get(b)?.length ?? 0, itemStyle: { color: b === "HEALTHY" ? "var(--color-success)" : b === "WATCH" ? "var(--s5)" : "var(--color-danger)" } })), barMaxWidth: 48, label: { show: true, position: "top" } }] }} />
        </ChartCard>
        <ChartCard info={X("cr.retention")} expand="NRR" title="Retention detail"><div className="num grid grid-cols-2 gap-3 p-2 text-sm">
          <div>Gross revenue churn<div className="text-xl font-semibold">{((n.GROSS_REV_CHURN ?? 0) * 100).toFixed(1)}%</div></div>
          <div>Logo retention<div className="text-xl font-semibold">{((n.LOGO_RETENTION ?? 0) * 100).toFixed(1)}%</div></div>
          <div>Cohort size<div className="text-xl font-semibold">{n.cohort} clients</div></div>
          <div>Filters<div className="text-sm text-[var(--ink-2)]">Add <code>?tier=STRATEGIC</code> or <code>?health=AT_RISK</code> to filter the roster</div></div>
        </div></ChartCard>
      </Grid>
      <ChartCard info={X("cr.roster")} title="Client roster" note={`Revenue in ${f.cur} for the selected period; health from the latest quarter-end snapshot`}>
        <DataTable name="client-roster" cols={[{ key: "client", label: "Client" }, { key: "tier", label: "Tier" }, { key: "vertical", label: "Vertical" }, { key: "region", label: "Region" }, { key: "am", label: "Account manager" }, { key: "revenue", label: `Revenue (${f.cur})`, fmt: "num" }, { key: "health", label: "Health", fmt: "dec2" }, { key: "band", label: "Band" }, { key: "status", label: "Status" }]} rows={roster} />
      </ChartCard>
      <div className="mt-4"><Note>Client names are fictional. Health scores use only components with data in the window and re-weight the rest.</Note></div>
    </>
  );
}
