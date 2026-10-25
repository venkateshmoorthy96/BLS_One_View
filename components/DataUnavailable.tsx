import type { DataReport } from "@/lib/data/store";
import ReloadDataButton from "@/components/ReloadDataButton";

const KIND: Record<string, string> = {
  missing_file: "Missing file", parse_error: "CSV syntax", schema_mismatch: "Schema mismatch", invalid_row: "Invalid values",
  duplicate_id: "Duplicate IDs", orphan_reference: "Broken reference", empty_table: "Empty table", consistency: "Consistency",
};

/** Shown instead of the dashboards when the CSV dataset fails validation, so no KPI is calculated from bad or partial data. */
export default function DataUnavailable({ report }: { report: DataReport }) {
  return (
    <section role="alert" className="card mx-auto max-w-4xl border-l-4 border-l-[var(--bad)] p-6">
      <h1 className="text-2xl">Dataset unavailable</h1>
      <p className="mt-2 text-sm text-[var(--ink-2)]">
        The CSV files in <code>{report.location}</code> did not pass validation, so dashboards are not shown: calculating KPIs from missing or invalid
        records would give wrong numbers. Fix the files (or regenerate them with <code>python scripts/generate_synthetic_data.py</code>), then reload.
      </p>
      <div className="mt-3"><ReloadDataButton /></div>
      <h2 className="mt-5 text-[15px] font-semibold">{report.issues.length} problem{report.issues.length === 1 ? "" : "s"} found</h2>
      <ul className="mt-2 divide-y divide-[var(--line)] rounded-lg border border-[var(--line)] bg-[var(--surface)]">
        {report.issues.map((i, n) => (
          <li key={n} className="px-3 py-2 text-sm">
            <span className="mr-2 rounded bg-[var(--bad-bg)] px-1.5 py-0.5 text-xs font-semibold text-[var(--bad)]">{KIND[i.kind] ?? i.kind}</span>
            <b>{i.table}</b>: {i.message}
            {i.examples?.length ? <ul className="mt-1 list-disc pl-6 text-xs text-[var(--ink-2)]">{i.examples.map((e, k) => <li key={k}><code>{e}</code></li>)}</ul> : null}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-[var(--ink-3)]">Checked {report.files.length} files at {report.loadedAt}.</p>
    </section>
  );
}
