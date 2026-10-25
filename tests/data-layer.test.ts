/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { csvCell, parseCsv } from "@/lib/data/csv";
import { CsvDirectorySource } from "@/lib/data/source";
import { loadDataset } from "@/lib/data/loader";
import { DataUnavailableError, dataStatus, getStore, useDataSource } from "@/lib/data/store";

const DATA = path.join(process.cwd(), "public", "data");
const temps: string[] = [];
/** Copy the real dataset to a temp dir, apply a change, and load it. */
function variant(change: (dir: string) => void) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bls-csv-"));
  temps.push(dir);
  for (const f of fs.readdirSync(DATA)) fs.copyFileSync(path.join(DATA, f), path.join(dir, f));
  change(dir);
  return loadDataset(new CsvDirectorySource(dir));
}
const edit = (dir: string, file: string, fn: (lines: string[]) => string[]) => {
  const p = path.join(dir, file);
  fs.writeFileSync(p, fn(fs.readFileSync(p, "utf8").split("\n")).join("\n"));
};
afterAll(() => { for (const d of temps) fs.rmSync(d, { recursive: true, force: true }); useDataSource(new CsvDirectorySource()); });

describe("CSV parser", () => {
  it("handles quotes, commas, escaped quotes, empty values and line breaks", () => {
    const r = parseCsv('a,b,c\r\n1,"x, y",\n2,"say ""hi""","line1\nline2"\n\n3,,z\n');
    expect(r.errors).toEqual([]);
    expect(r.header).toEqual(["a", "b", "c"]);
    expect(r.rows).toEqual([["1", "x, y", ""], ["2", 'say "hi"', "line1\nline2"], ["3", "", "z"]]);
    expect(r.rowLines).toEqual([2, 3, 6]);
  });
  it("strips a byte-order mark and accepts a missing final newline", () => {
    expect(parseCsv("﻿a,b\n1,2").rows).toEqual([["1", "2"]]);
  });
  it("reports malformed quoting instead of guessing", () => {
    expect(parseCsv('a\n"unterminated').errors[0].message).toMatch(/Unterminated/);
    expect(parseCsv('a,b\nx"y,1').errors[0].message).toMatch(/Quote inside/);
  });
  it("round-trips values through csvCell", () => {
    const vals = ["plain", "with, comma", 'with "quote"', "multi\nline", ""];
    expect(parseCsv(`h1,h2,h3,h4,h5\n${vals.map(csvCell).join(",")}\n`).rows[0]).toEqual(vals);
  });
});

describe("Dataset loader", () => {
  it("loads the generated dataset with no problems and keeps quoted text intact", () => {
    const ds = loadDataset(new CsvDirectorySource(DATA));
    expect(ds.report.issues).toEqual([]);
    expect(ds.report.files.length).toBe(40);
    const alert = ds.tables.get("fact_risk_alert")!.find((a) => String(a.trigger_text).includes(","));
    expect(alert).toBeTruthy();
    expect(typeof ds.tables.get("fact_revenue_line")![0].revenue_usd).toBe("number");
    expect(ds.config.thresholds.uptime_warning).toBe(0.995);
    expect(ds.config.seeded_surge.language_codes).toEqual(["AM", "SO", "HT", "VI", "ZH"]);
  });
  it("reports a missing file", () => {
    const ds = variant((d) => fs.rmSync(path.join(d, "fact_okr.csv")));
    expect(ds.report.issues.map((i) => [i.table, i.kind])).toContainEqual(["fact_okr", "missing_file"]);
  });
  it("reports a header that does not match the data dictionary", () => {
    const ds = variant((d) => edit(d, "dim_client.csv", (l) => [l[0].replace("client_name", "name"), ...l.slice(1)]));
    const i = ds.report.issues.find((x) => x.kind === "schema_mismatch")!;
    expect(i.table).toBe("dim_client");
    expect(i.message).toMatch(/Missing: client_name.*Unexpected: name/);
  });
  it("rejects invalid values instead of treating them as zero", () => {
    const ds = variant((d) => edit(d, "fact_revenue_line.csv", (l) => [l[0], l[1].replace(/,[^,]*$/, ",abc"), l[2].replace(/^REV-\d+,[^,]*/, (m) => m.replace(/,.*/, ",")), ...l.slice(3)]));
    const msgs = ds.report.issues.filter((x) => x.kind === "invalid_row").map((x) => `${x.message} ${x.examples?.join(" ")}`).join(" | ");
    expect(msgs).toMatch(/revenue_usd.*"abc" is not a number/);
    expect(msgs).toMatch(/client_id.*required value is empty/);
    expect(ds.report.files.find((f) => f.table === "fact_revenue_line")!.invalidRows).toBe(2);
    expect(ds.report.ok).toBe(false);
  });
  it("reports duplicate IDs", () => {
    const ds = variant((d) => edit(d, "dim_client.csv", (l) => [...l.slice(0, -1), l[1], l[l.length - 1]]));
    expect(ds.report.issues.find((x) => x.kind === "duplicate_id")?.examples).toEqual(["CL-0001"]);
  });
  it("reports references to records that do not exist", () => {
    const ds = variant((d) => edit(d, "fact_revenue_line.csv", (l) => [l[0], l[1].replace("CL-0001", "CL-9999"), ...l.slice(2)]));
    const i = ds.report.issues.find((x) => x.kind === "orphan_reference")!;
    expect(i.table).toBe("fact_revenue_line");
    expect(i.examples).toContain("CL-9999");
  });
  it("reports an empty required table", () => {
    const ds = variant((d) => edit(d, "fact_payment.csv", (l) => [l[0]]));
    expect(ds.report.issues.map((i) => [i.table, i.kind])).toContainEqual(["fact_payment", "empty_table"]);
  });
});

describe("Store", () => {
  it("refuses to calculate from an invalid dataset and recovers when the source is fixed", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bls-csv-"));
    temps.push(dir);
    for (const f of fs.readdirSync(DATA)) fs.copyFileSync(path.join(DATA, f), path.join(dir, f));
    edit(dir, "dim_fx_rate.csv", (l) => l.filter((x) => !x.startsWith("EUR")));
    useDataSource(new CsvDirectorySource(dir));
    expect(dataStatus().ok).toBe(false);
    expect(dataStatus().issues.some((i) => /No valid conversion rate for EUR/.test(i.message))).toBe(true);
    expect(() => getStore()).toThrow(DataUnavailableError);
    useDataSource(new CsvDirectorySource(DATA));
    expect(dataStatus().ok).toBe(true);
    expect((getStore() as any).fx.get("EUR")).toBe(1.08);
  });
});
