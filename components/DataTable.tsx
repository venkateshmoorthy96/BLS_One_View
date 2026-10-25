"use client";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";

export type Col = { key: string; label: string; align?: "left" | "right"; fmt?: "num" | "money" | "pct" | "pct1" | "dec1" | "dec2" | "text" };
const f = (v: unknown, k?: Col["fmt"]) => {
  if (v == null || v === "") return "–";
  if (typeof v !== "number") return String(v);
  switch (k) {
    case "money": return "$" + Math.round(v).toLocaleString("en-US");
    case "pct": return (v * 100).toFixed(0) + "%";
    case "pct1": return (v * 100).toFixed(1) + "%";
    case "dec1": return v.toFixed(1);
    case "dec2": return v.toFixed(2);
    default: return Math.round(v).toLocaleString("en-US");
  }
};

export default function DataTable({ cols, rows, name, note, pageSize = 10 }: { cols: Col[]; rows: Record<string, unknown>[]; name: string; note?: string; pageSize?: number }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 } | null>(null);
  const [size, setSize] = useState(pageSize);
  const [page, setPage] = useState(0);
  const data = useMemo(() => {
    let r = rows;
    if (q) { const s = q.toLowerCase(); r = r.filter((x) => cols.some((c) => String(x[c.key] ?? "").toLowerCase().includes(s))); }
    if (sort) r = [...r].sort((a, b) => { const x = a[sort.k], y = b[sort.k]; return (x == null ? 1 : y == null ? -1 : x < y ? -1 : x > y ? 1 : 0) * sort.dir; });
    return r;
  }, [rows, q, sort, cols]);
  const pages = Math.max(1, Math.ceil(data.length / size));
  const p = Math.min(page, pages - 1);
  const view = data.slice(p * size, p * size + size);
  const exportCsv = () => {
    const esc = (v: unknown) => { let s = v == null ? "" : String(v); if (/^[=+\-@]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = [cols.map((c) => esc(c.label)).join(","), ...data.map((r) => cols.map((c) => esc(r[c.key])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${name}-synthetic-demo.csv`; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <div className="card min-w-0 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className="input" placeholder="Search…" aria-label="Search table" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        <select className="input" aria-label="Rows per page" value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}>
          {[10, 25, 50].map((n) => <option key={n} value={n}>{n} rows</option>)}
        </select>
        <button className="btn" onClick={exportCsv}><Download size={14} aria-hidden />Export CSV</button>
        <span className="num ml-auto text-xs text-[var(--ink-2)]">{data.length.toLocaleString("en-US")} rows{note ? ` · ${note}` : ""}</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--line)]">
        <table className="w-full text-sm text-[var(--ink)]">
          <thead><tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-left text-xs text-[var(--ink-2)]">
            {cols.map((c) => (
              <th key={c.key} className={`cursor-pointer select-none whitespace-nowrap px-3 py-2 font-semibold hover:text-[var(--ink)] ${c.align === "right" ? "text-right" : ""}`} aria-sort={sort?.k === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
                onClick={() => setSort(sort?.k === c.key ? { k: c.key, dir: (sort.dir * -1) as 1 | -1 } : { k: c.key, dir: 1 })}>
                {c.label}{sort?.k === c.key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
              </th>))}
          </tr></thead>
          <tbody>
            {view.map((r, i) => (
              <tr key={i} className="border-b border-[var(--line)] transition-colors last:border-0 hover:bg-[var(--hover)]">
                {cols.map((c) => <td key={c.key} className={`num whitespace-nowrap px-3 py-2 ${c.align === "right" || (typeof r[c.key] === "number") ? "text-right" : ""}`}>{f(r[c.key], c.fmt)}</td>)}
              </tr>))}
            {!view.length && <tr><td colSpan={cols.length} className="px-2 py-6 text-center text-[var(--ink-2)]">No rows match the current filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-xs text-[var(--ink-2)]">
        <button className="btn" disabled={p === 0} onClick={() => setPage(p - 1)}>Prev</button>
        <span className="num">Page {p + 1} / {pages}</span>
        <button className="btn" disabled={p >= pages - 1} onClick={() => setPage(p + 1)}>Next</button>
      </div>
    </div>
  );
}
