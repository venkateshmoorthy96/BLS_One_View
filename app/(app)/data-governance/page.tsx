import { PageHeader, Grid, ChartCard, Note } from "@/components/ui";
import KpiCard from "@/components/KpiCard";
import EChart from "@/components/EChart";
import DataTable from "@/components/DataTable";
import { type SP, pick } from "@/lib/filters";
import { groupBy } from "@/lib/kpi/agg";
import { getStore, manifest, dataStatus } from "@/lib/data/store";
import ReloadDataButton from "@/components/ReloadDataButton";
import { X } from "@/lib/info/registry";

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const dom = pick(sp, "dom");
  const S = getStore();
  const m = manifest();
  const dq = S.dq;
  const dims = [...groupBy(dq, (c) => c.dimension as string).entries()].map(([d, cs]) => ({ d, pass: cs.filter((c) => c.passed).length / cs.length, n: cs.length }));
  // Live inventory of the CSV files actually loaded (sizes, hashes and row counts come from the loader, not a stored manifest)
  const report = dataStatus();
  const files = report.files.map((x) => ({ file: x.file, kind: x.kind, rows: x.rows, invalid: x.invalidRows, kb: x.bytes / 1024, hash: x.sha256.slice(0, 12), modified: x.modified.slice(0, 19).replace("T", " "), status: x.status === "ok" ? "Valid" : x.status }));
  const tables = files.filter((x) => x.kind !== "Metadata");
  let kpis = S.kpiDefs.map((k) => ({ id: k.kpi_id, name: k.kpi_name, domain: k.domain, tab: k.tab, unit: k.unit, definition: k.definition, formula: k.formula, source: k.source_fact, direction: k.target_direction }));
  if (dom) kpis = kpis.filter((k) => k.domain === dom);
  return (
    <>
      <PageHeader title="Data Governance" sub="Where every number comes from: dataset version, validation results, tables and the KPI dictionary." />
      <Grid cols={5}>
        <KpiCard info={X("dg.checks")} expand="dg:checks" label="Validation checks passed" value={dq.filter((c) => c.passed).length / dq.length} f="pct1" hint={`${dq.filter((c) => c.passed).length} of ${dq.length}`} />
        <KpiCard info={X("dg.tables")} expand="dg:checks" label="Tables" value={tables.length} f="num" />
        <KpiCard info={X("dg.rows")} expand="dg:checks" label="Rows (all tables)" value={tables.reduce((a, t) => a + t.rows, 0)} f="num" />
        <KpiCard info={X("dg.kpis")} expand="dg:checks" label="KPI definitions" value={S.kpiDefs.length} f="num" />
        <KpiCard info={X("dg.size")} expand="dg:checks" label="Dataset size (MB)" value={m.total_bytes / 1048576} f="dec1" />
      </Grid>
      <Grid cols={2}>
        <ChartCard info={X("dg.dims")} expand="dg:checks" title="Validation pass rate by dimension"><EChart label="Validation pass rate" format="pct" option={{ legend: { show: false }, xAxis: { type: "value", max: 1 }, yAxis: { type: "category", data: dims.map((x) => x.d).reverse() }, series: [{ type: "bar", data: dims.map((x) => x.pass).reverse(), barMaxWidth: 16 }] }} /></ChartCard>
        <ChartCard info={X("dg.prov")} expand="dg:checks" title="Dataset provenance">
          <ul className="space-y-1 p-1 text-sm">
            <li>Source: <b>{report.files.length} CSV files</b> in <code>{report.location}</code>, validated against the data dictionary at {report.loadedAt.slice(0, 19).replace("T", " ")} UTC: <b>{report.issues.length ? `${report.issues.length} problem(s)` : "no problems"}</b></li>
            <li>Dataset version <b>{m.dataset_version}</b> · generator <b>{m.generator_version}</b> · schema <b>{m.schema_version}</b></li>
            <li>Fixed seed <b>{m.seed}</b>; regenerating reproduces identical files (verified by test)</li>
            <li>Data window <b>{m.first_month}</b> to <b>{m.last_month}</b>; cut-off <b>{m.as_of}</b></li>
            <li>FX: <b>{m.fx_rate_type}</b> ({m.fx_rate_version}); base currency {m.base_currency}</li>
            <li className="text-[var(--warn)]">{m.disclaimer}</li>
          </ul>
        </ChartCard>
      </Grid>
      <div className="mb-4"><ChartCard info={X("dg.inventory")} expand="dg:checks" title="CSV file inventory" note="Every file the app loaded, including the metadata files that define the schema and configuration.">
        <div className="mb-3"><ReloadDataButton /></div>
        <DataTable name="csv-files" pageSize={50} cols={[{ key: "file", label: "File" }, { key: "kind", label: "Kind" }, { key: "rows", label: "Valid rows", fmt: "num" }, { key: "invalid", label: "Invalid rows", fmt: "num" }, { key: "kb", label: "Size (KB)", fmt: "num" }, { key: "hash", label: "SHA-256 (prefix)" }, { key: "modified", label: "Modified (UTC)" }, { key: "status", label: "Status" }]} rows={files} />
        <details className="mt-3 text-sm"><summary className="cursor-pointer text-[var(--ink-2)]">Download the CSV files</summary><ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">{files.map((x) => <li key={x.file}><a className="underline decoration-[var(--line-strong)] underline-offset-2 hover:decoration-[var(--ink)]" href={`/data/${x.file}`} download>{x.file}</a></li>)}</ul><p className="mt-2 text-xs text-[var(--ink-3)]">Downloads require a signed-in session.</p></details>
      </ChartCard></div>
      <ChartCard info={X("dg.dict")} expand="dg:checks" title="KPI dictionary" note="Same definitions used by the app and the independent test reference. Filter by domain with ?dom=…"><DataTable name="kpi-dictionary" cols={[{ key: "id", label: "ID" }, { key: "name", label: "KPI" }, { key: "domain", label: "Domain" }, { key: "tab", label: "Tab" }, { key: "unit", label: "Unit" }, { key: "formula", label: "Formula" }, { key: "source", label: "Source" }, { key: "direction", label: "Better when" }]} rows={kpis} /></ChartCard>
      <div className="mt-4"><Note>Column types, nullability, allowed values and keys are defined in public/data/meta_fields.csv and meta_tables.csv; every CSV is checked against them on load. Full lineage per KPI is in docs/kpi-definitions.md.</Note></div>
    </>
  );
}
