/* eslint-disable @typescript-eslint/no-explicit-any */
// Shared in-memory store built from the validated CSV dataset (see lib/data/loader.ts).
// Pages and the KPI layer call getStore(); it never calculates from a dataset that failed validation.
import "server-only";
import { AS_OF, MONTHS, type Currency } from "@/lib/filters";
import { CsvDirectorySource, type DataSource } from "./source";
import { loadDataset, type DataReport, type Dataset, type Row } from "./loader";

export type { Row, DataReport };
export const CURRENCIES: Currency[] = ["USD", "EUR", "GBP"];

/** Thrown by getStore() when the dataset is missing, malformed or inconsistent. */
export class DataUnavailableError extends Error {
  constructor(public report: DataReport) {
    super(`Dataset unavailable: ${report.issues.length} problem(s) found in ${report.location}`);
    this.name = "DataUnavailableError";
  }
}

// One dataset per server process: Next.js may load pages and API routes as separate module instances, so the state lives on
// globalThis. That way "Reload data" (an API route) and the pages share the same data and the same cache listeners.
type Shared = { source: DataSource; state: { ds: Dataset; store: Store | null; sig: string; checkedAt: number } | null; listeners: Set<() => void> };
const G = globalThis as unknown as { __blsOneViewData?: Shared };
const shared: Shared = (G.__blsOneViewData ??= { source: new CsvDirectorySource(), state: null, listeners: new Set() });
const listeners = shared.listeners;
const RECHECK_MS = 1000;

/** Register a callback that clears derived caches whenever the dataset is reloaded. */
export function onDataChange(fn: () => void) { listeners.add(fn); }

/** App-level consistency checks that need the app's own constants (calendar, cut-off, currencies, required settings). */
function appChecks(ds: Dataset) {
  const add = (table: string, message: string) => ds.report.issues.push({ table, kind: "consistency", message });
  const months = (ds.tables.get("dim_date") ?? []).map((d) => d.month_id as string);
  if (months.length && months.join() !== MONTHS.join()) add("dim_date", `Months in dim_date (${months[0]} to ${months[months.length - 1]}, ${months.length}) do not match the app calendar (${MONTHS[0]} to ${MONTHS[MONTHS.length - 1]}).`);
  if (ds.meta.as_of && ds.meta.as_of !== AS_OF) add("meta_dataset", `Dataset cut-off ${ds.meta.as_of} does not match the app cut-off ${AS_OF}.`);
  const fx = new Map((ds.tables.get("dim_fx_rate") ?? []).map((r) => [r.currency_code as string, r.usd_per_unit as number]));
  for (const c of CURRENCIES) if (!(fx.get(c)! > 0)) add("dim_fx_rate", `No valid conversion rate for ${c}; amounts cannot be shown in ${c} without one.`);
  for (const s of ["thresholds", "assumptions", "scenario", "seeded_surge"]) if (!ds.config?.[s]) add("meta_config", `Configuration section "${s}" is missing.`);
  ds.report.ok = ds.report.issues.length === 0;
}

function current(): Dataset {
  const now = Date.now();
  const st = shared.state;
  if (st && now - st.checkedAt < RECHECK_MS) return st.ds;
  const sig = shared.source.signature();
  if (st && sig === st.sig) { st.checkedAt = now; return st.ds; }
  const ds = loadDataset(shared.source);
  appChecks(ds);
  shared.state = { ds, store: null, sig, checkedAt: now };
  if (st) listeners.forEach((f) => f());
  return ds;
}

/** Validation report for the current dataset (never throws). */
export function dataStatus(): DataReport { return current().report; }

/** Force a fresh read of every file, e.g. after the CSVs were replaced. */
export function reloadData(): DataReport {
  shared.state = null;
  const r = current().report;
  listeners.forEach((f) => f());
  return r;
}

/** For tests: read from another source (e.g. a temporary directory). */
export function useDataSource(s: DataSource) { shared.source = s; shared.state = null; listeners.forEach((f) => f()); }

export function table(name: string): Row[] {
  const ds = current();
  if (!ds.report.ok) throw new DataUnavailableError(ds.report);
  return ds.tables.get(name) ?? [];
}

/** Dataset facts, generator configuration and a live file inventory (same shape the app used before). */
export function manifest(): any {
  const ds = current();
  const files = Object.fromEntries(ds.report.files.filter((f) => !f.table.startsWith("meta_")).map((f) => [f.table, { rows: f.rows, bytes: f.bytes, sha256: f.sha256 }]));
  return { ...ds.meta, config: ds.config, files, total_bytes: ds.report.totals.bytes, location: ds.report.location };
}

export type Store = ReturnType<typeof build>;
export function getStore(): Store {
  const ds = current();
  if (!ds.report.ok) throw new DataUnavailableError(ds.report);
  return (shared.state!.store ??= build(ds));
}

/** USD per unit of the reporting currency, from dim_fx_rate.csv. */
export function fxRate(cur: Currency): number { return getStore().fx.get(cur)!; }

const ext = <T extends object>(r: Row, x: T): Row & T => Object.assign({}, r, x);
const idx = (rows: Row[], key: string) => new Map(rows.map((r) => [r[key], r] as const));

function build(ds: Dataset) {
  const table = (n: string) => ds.tables.get(n) ?? [];
  const clients = table("dim_client");
  const clientById = idx(clients, "client_id");
  const lps = table("dim_language_pair");
  const lpById = idx(lps, "lp_id");
  const owners = table("dim_owner");
  const ownerById = idx(owners, "owner_id");
  const resources = table("dim_resource");
  const resById = idx(resources, "resource_id");
  const projects = table("fact_project");
  const projById = idx(projects, "project_id");
  // revenue enriched with direct-cost split
  const revenue = table("fact_revenue_line").map((r) => ext(r, { bu: clientById.get(r.client_id)!.business_unit as string, cost: {} as Record<string, number>, direct: 0 }));
  const revById = new Map(revenue.map((r) => [r.revenue_id, r] as const));
  const costs = table("fact_cost_line");
  const opexByMonth = new Map<string, number>();
  const daByMonth = new Map<string, number>();
  const opexByMonthCat = new Map<string, Map<string, number>>();
  for (const c of costs) {
    if (c.cost_class === "DIRECT") {
      const r = revById.get(c.revenue_id);
      if (r) { r.cost[c.cost_category] = (r.cost[c.cost_category] ?? 0) + c.amount_usd; r.direct += c.amount_usd; }
    } else if (c.cost_class === "OPEX") {
      opexByMonth.set(c.month_id, (opexByMonth.get(c.month_id) ?? 0) + c.amount_usd);
      const m = opexByMonthCat.get(c.month_id) ?? new Map<string, number>();
      m.set(c.cost_category, (m.get(c.cost_category) ?? 0) + c.amount_usd);
      opexByMonthCat.set(c.month_id, m);
    } else daByMonth.set(c.month_id, (daByMonth.get(c.month_id) ?? 0) + c.amount_usd);
  }
  const batches = table("fact_translation_batch").map((b) => {
    const p = projById.get(b.project_id)!;
    return ext(b, { client_id: p.client_id as string, domain: p.domain as string, service_line_id: p.service_line_id as string, pm_owner_id: p.pm_owner_id as string, deliv_month: (b.delivered_date ? (b.delivered_date as string).slice(0, 7) : "") });
  });
  const batchById = idx(batches, "batch_id");
  const sessions = table("fact_interpretation_session").map((s) => ext(s, { month: (s.request_date as string).slice(0, 7) }));
  const evals = table("fact_quality_evaluation").map((e) => ext(e, { client_id: batchById.get(e.batch_id)!.client_id as string, month: (e.eval_date as string).slice(0, 7), lp_id: batchById.get(e.batch_id)!.lp_id as string }));
  const ai = table("fact_ai_workflow_batch").map((a) => {
    const b = batchById.get(a.batch_id)!;
    return ext(a, { client_id: b.client_id, words_total: b.words_total as number, deliv_month: b.deliv_month, lp_id: b.lp_id as string, workflow_id: b.workflow_id as string, domain: b.domain });
  });
  return {
    clients, clientById, lps, lpById, owners, ownerById, resources, resById, projects, projById, revenue, revById, batches, batchById, sessions, evals, ai,
    opexByMonth, daByMonth, opexByMonthCat,
    fx: new Map(table("dim_fx_rate").map((r) => [r.currency_code as Currency, r.usd_per_unit as number])),
    invoices: table("fact_invoice_line"), payments: table("fact_payment"), bridge: table("bridge_payment_invoice"),
    assignments: table("fact_resource_assignment"), errors: table("fact_quality_error"), capacity: table("fact_capacity_period"),
    telemetry: table("fact_integration_telemetry"), connectors: table("dim_connector"), opportunities: table("fact_opportunity"),
    oppEvents: table("fact_opportunity_stage_event"), snapshots: table("fact_client_period_snapshot"), alerts: table("fact_risk_alert"),
    okrs: table("fact_okr"), targets: table("fact_kpi_target_period"), scnSets: table("fact_scenario_assumption_set"),
    scnOut: table("fact_scenario_output"), roadmap: table("dim_roadmap_feature"), feedback: table("fact_feedback_sample"),
    kpiDefs: table("dim_kpi_definition"), dq: table("fact_data_quality_check"), bridgeRL: table("bridge_resource_language"),
    serviceLines: table("dim_service_line"),
  };
}
