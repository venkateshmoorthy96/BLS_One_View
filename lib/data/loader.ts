/* eslint-disable @typescript-eslint/no-explicit-any */
// Loads and validates the CSV dataset. The data dictionary (meta_tables.csv, meta_fields.csv) defines every table's columns,
// types, nullability, allowed values, primary key and foreign keys; each data file is checked against it before use.
import crypto from "node:crypto";
import { parseCsv } from "./csv";
import type { DataSource } from "./source";

export type Row = Record<string, any>;
export type IssueKind = "missing_file" | "parse_error" | "schema_mismatch" | "invalid_row" | "duplicate_id" | "orphan_reference" | "empty_table" | "consistency";
export type DataIssue = { table: string; kind: IssueKind; message: string; count?: number; examples?: string[] };
export type FileReport = { table: string; file: string; kind: string; rows: number; invalidRows: number; bytes: number; sha256: string; modified: string; status: "ok" | "error" | "missing" };
export type DataReport = { ok: boolean; location: string; loadedAt: string; files: FileReport[]; issues: DataIssue[]; totals: { tables: number; rows: number; bytes: number } };
export type FieldDef = { field: string; type: string; nullable: boolean; enum: string[] | null };
export type TableDef = { table: string; kind: string; primaryKey: string; foreignKeys: Record<string, string>; fields: FieldDef[] };
export type Dataset = { tables: Map<string, Row[]>; defs: Map<string, TableDef>; meta: Record<string, string | number | boolean | null>; config: any; report: DataReport };

/** Tables that may legitimately be empty (concept pages only). Every other table must have rows. */
export const OPTIONAL_EMPTY = new Set(["fact_feedback_sample", "dim_roadmap_feature"]);

// Bootstrap schema for the metadata files themselves
const META: Record<string, FieldDef[]> = {
  meta_tables: ["table", "kind", "domain", "grain", "primary_key", "foreign_keys", "notes"].map((f) => ({ field: f, type: "string", nullable: ["foreign_keys", "notes"].includes(f), enum: null })),
  meta_fields: [["table", "string", false], ["position", "int", false], ["field", "string", false], ["type", "string", false], ["nullable", "bool", false], ["enum", "string", true], ["formula", "string", true], ["classification", "string", true], ["description", "string", false], ["example", "string", true]].map(([f, t, n]) => ({ field: f as string, type: t as string, nullable: n as boolean, enum: null })),
  meta_dataset: [{ field: "key", type: "string", nullable: false, enum: null }, { field: "value", type: "string", nullable: true, enum: null }],
  meta_config: [{ field: "section", type: "string", nullable: true, enum: null }, { field: "key", type: "string", nullable: false, enum: null }, { field: "value", type: "string", nullable: true, enum: null }, { field: "type", type: "string", nullable: false, enum: ["number", "string", "list_number", "list_string"] }],
};

const NUM = /^-?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;
/** Convert one cell to its declared type. Returns [value] or an error message. Empty cells are null. */
export function convert(raw: string, f: FieldDef): { v: unknown } | { err: string } {
  if (raw === "") return f.nullable ? { v: null } : { err: "required value is empty" };
  switch (f.type) {
    case "int": return /^-?\d+$/.test(raw) ? { v: Number(raw) } : { err: `"${raw}" is not a whole number` };
    case "float": case "money": case "fraction": case "sfraction": {
      if (!NUM.test(raw)) return { err: `"${raw}" is not a number` };
      const n = Number(raw);
      if (f.type === "fraction" && (n < 0 || n > 1)) return { err: `${raw} is outside 0..1` };
      if (f.type === "sfraction" && (n < -1 || n > 1)) return { err: `${raw} is outside -1..1` };
      return { v: n };
    }
    case "bool": return raw === "true" ? { v: true } : raw === "false" ? { v: false } : { err: `"${raw}" is not true/false` };
    case "date": {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { err: `"${raw}" is not a YYYY-MM-DD date` };
      const d = new Date(`${raw}T00:00:00Z`);
      return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === raw ? { v: raw } : { err: `"${raw}" is not a real calendar date` };
    }
    case "enum": return f.enum && !f.enum.includes(raw) ? { err: `"${raw}" is not one of ${f.enum.join("|")}` } : { v: raw };
    default: return { v: raw };
  }
}

type Parsed = { rows: Row[]; report: FileReport };
function readTable(src: DataSource, name: string, kind: string, fields: FieldDef[] | undefined, issues: DataIssue[]): Parsed {
  const f = src.read(name);
  const base: FileReport = { table: name, file: `${name}.csv`, kind, rows: 0, invalidRows: 0, bytes: f?.bytes ?? 0, sha256: "", modified: f?.modified ?? "", status: "ok" };
  if (!f) { issues.push({ table: name, kind: "missing_file", message: `${name}.csv was not found in ${src.location}.` }); return { rows: [], report: { ...base, status: "missing" } }; }
  base.sha256 = crypto.createHash("sha256").update(f.text).digest("hex");
  const p = parseCsv(f.text);
  if (p.errors.length) issues.push({ table: name, kind: "parse_error", message: `${p.errors.length} CSV syntax error(s).`, count: p.errors.length, examples: p.errors.slice(0, 3).map((e) => `line ${e.line}: ${e.message}`) });
  if (!fields) return { rows: [], report: { ...base, status: "error" } };
  const expected = fields.map((x) => x.field);
  if (p.header.join(",") !== expected.join(",")) {
    const missing = expected.filter((c) => !p.header.includes(c)), extra = p.header.filter((c) => !expected.includes(c));
    issues.push({ table: name, kind: "schema_mismatch", message: `Header does not match the data dictionary.${missing.length ? ` Missing: ${missing.join(", ")}.` : ""}${extra.length ? ` Unexpected: ${extra.join(", ")}.` : ""}${!missing.length && !extra.length ? " Column order differs." : ""}` });
    return { rows: [], report: { ...base, status: "error" } };
  }
  const rows: Row[] = [];
  const bad = new Map<string, { n: number; ex: string[] }>();
  let invalid = 0;
  const note = (key: string, ex: string) => { const b = bad.get(key) ?? { n: 0, ex: [] }; b.n++; if (b.ex.length < 3) b.ex.push(ex); bad.set(key, b); };
  p.rows.forEach((cells, i) => {
    const line = p.rowLines[i];
    if (cells.length !== fields.length) { invalid++; note(`expected ${fields.length} values per row`, `line ${line}: found ${cells.length}`); return; }
    const o: Row = {};
    let ok = true;
    for (let c = 0; c < fields.length; c++) {
      const r = convert(cells[c], fields[c]);
      if ("err" in r) { ok = false; note(`column ${fields[c].field}`, `line ${line}: ${r.err}`); } else o[fields[c].field] = r.v;
    }
    if (ok) rows.push(o); else invalid++;
  });
  for (const [k, b] of bad) issues.push({ table: name, kind: "invalid_row", message: `${b.n} invalid value(s) in ${k}; affected rows are excluded.`, count: b.n, examples: b.ex });
  return { rows, report: { ...base, rows: rows.length, invalidRows: invalid, status: invalid || p.errors.length ? "error" : "ok" } };
}

export function loadDataset(src: DataSource): Dataset {
  const issues: DataIssue[] = [];
  const files: FileReport[] = [];
  const meta = (n: string) => { const t = readTable(src, n, "Metadata", META[n], issues); files.push(t.report); return t.rows; };
  const mt = meta("meta_tables"), mf = meta("meta_fields"), md = meta("meta_dataset"), mc = meta("meta_config");

  // Data dictionary -> table definitions
  const defs = new Map<string, TableDef>();
  for (const t of mt) {
    const fks = Object.fromEntries(String(t.foreign_keys ?? "").split(";").map((x) => x.trim()).filter(Boolean).map((x) => x.split("->").map((y) => y.trim()) as [string, string]));
    defs.set(t.table, { table: t.table, kind: t.kind, primaryKey: t.primary_key, foreignKeys: fks, fields: [] });
  }
  for (const f of [...mf].sort((a, b) => a.position - b.position)) {
    const d = defs.get(f.table);
    if (!d) { issues.push({ table: "meta_fields", kind: "consistency", message: `Field ${f.field} refers to unknown table ${f.table}.` }); continue; }
    d.fields.push({ field: f.field, type: f.type, nullable: f.nullable, enum: f.enum ? String(f.enum).split("|") : null });
  }

  // Data tables
  const tables = new Map<string, Row[]>();
  for (const d of defs.values()) {
    const kind = d.kind === "dimension" ? "Dimension" : d.kind === "bridge" ? "Bridge" : "Fact";
    const t = readTable(src, d.table, kind, d.fields, issues);
    files.push(t.report);
    if (t.report.status !== "missing" && !t.rows.length && !t.report.invalidRows && !OPTIONAL_EMPTY.has(d.table)) {
      issues.push({ table: d.table, kind: "empty_table", message: `${d.table}.csv has no data rows; metrics that depend on it cannot be calculated.` });
      t.report.status = "error";
    }
    // primary key uniqueness: duplicates are excluded and reported
    if (d.primaryKey && t.rows.length) {
      // composite keys are written "col_a+col_b" in meta_tables.csv
      const cols = d.primaryKey.split("+").map((c) => c.trim());
      const keyOf = (r: Row) => cols.map((c) => String(r[c])).join(" + ");
      const seen = new Set<string>(), dups: string[] = [];
      const keep = t.rows.filter((r) => { const k = keyOf(r); if (seen.has(k)) { dups.push(k); return false; } seen.add(k); return true; });
      if (dups.length) { issues.push({ table: d.table, kind: "duplicate_id", message: `${dups.length} duplicate ${d.primaryKey} value(s); later duplicates are excluded.`, count: dups.length, examples: dups.slice(0, 3) }); t.report.status = "error"; t.report.rows = keep.length; }
      tables.set(d.table, keep);
    } else tables.set(d.table, t.rows);
  }

  // Referential integrity
  const keyCache = new Map<string, Set<unknown>>();
  const keys = (ref: string) => { let s = keyCache.get(ref); if (!s) { const [t, c] = ref.split("."); s = new Set((tables.get(t) ?? []).map((r) => r[c])); keyCache.set(ref, s); } return s; };
  for (const d of defs.values()) {
    for (const [col, ref] of Object.entries(d.foreignKeys)) {
      const set = keys(ref);
      const orphans = (tables.get(d.table) ?? []).filter((r) => r[col] != null && !set.has(r[col])).map((r) => String(r[col]));
      if (orphans.length) {
        issues.push({ table: d.table, kind: "orphan_reference", message: `${orphans.length} row(s) reference a ${ref} that does not exist.`, count: orphans.length, examples: [...new Set(orphans)].slice(0, 3) });
        const fr = files.find((x) => x.table === d.table); if (fr) fr.status = "error";
      }
    }
  }

  // Metadata: dataset facts and generator configuration
  const metaObj: Dataset["meta"] = {};
  for (const r of md) { const v = r.value; metaObj[r.key] = v === "true" ? true : v === "false" ? false : v != null && /^-?\d+$/.test(v) ? Number(v) : v; }
  const config: any = {};
  for (const r of mc) {
    const path = r.section ? String(r.section).split(".") : [];
    let o = config;
    for (const p of path) o = o[p] ??= {};
    const raw = r.value ?? "";
    o[r.key] = r.type === "number" ? Number(raw) : r.type === "list_number" ? (raw ? String(raw).split("|").map(Number) : []) : r.type === "list_string" ? (raw ? String(raw).split("|") : []) : raw;
  }

  const report: DataReport = {
    ok: issues.length === 0, location: src.location, loadedAt: new Date().toISOString(), files, issues,
    totals: { tables: defs.size, rows: [...tables.values()].reduce((a, t) => a + t.length, 0), bytes: files.filter((f) => !f.table.startsWith("meta_")).reduce((a, f) => a + f.bytes, 0) },
  };
  return { tables, defs, meta: metaObj, config, report };
}
