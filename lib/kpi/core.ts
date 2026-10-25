/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { getStore, manifest } from "@/lib/data/store";
import { AS_OF, MONTHS } from "@/lib/filters";

const ratio = (a: number, b: number): number | null => (b === 0 || !isFinite(b) ? null : a / b);
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : null);
const inBu = (bu: string) => (c: string) => bu === "ALL" || getStore().clientById.get(c)!.business_unit === bu;

export type Core = Record<string, number | null>;

/** Optional segment filter for drill-down analysis. A row is kept when it matches every given key; rows that do not
 *  carry a field are not filtered by it (e.g. a language-pair scope does not drop evaluations without lp_id). */
export type Scope = Partial<Record<"sl" | "lp" | "wf" | "client" | "tier" | "vertical" | "engine", string>>;
const SCOPE_FIELD: Record<string, string> = { sl: "service_line_id", lp: "lp_id", wf: "workflow_id", client: "client_id", engine: "engine_category" };
function inScope(scope?: Scope): (r: any) => boolean {
  const entries = Object.entries(scope ?? {}).filter(([, v]) => v);
  if (!entries.length) return () => true;
  const S = getStore();
  return (r) => entries.every(([k, v]) => {
    if (k === "tier" || k === "vertical") return S.clientById.get(r.client_id)?.[k] === v;
    const f = SCOPE_FIELD[k];
    return !(f in r) || r[f] === v;
  });
}

export function core(months: string[], bu = "ALL", scope?: Scope): Core {
  const S = getStore();
  const ms = new Set(months);
  const ok = inBu(bu);
  const sc = inScope(scope);
  const out: Core = {};
  const revf = S.revenue.filter((r) => ms.has(r.month_id) && ok(r.client_id) && sc(r));
  const revenue = sum(revf.map((r) => r.revenue_usd));
  const direct = sum(revf.map((r) => r.direct));
  const gp = revenue - direct;
  const allrev = sum(S.revenue.filter((r) => ms.has(r.month_id)).map((r) => r.revenue_usd));
  const share = ratio(revenue, allrev) ?? 0;
  let opexAll = 0, daAll = 0;
  for (const m of months) { opexAll += S.opexByMonth.get(m) ?? 0; daAll += S.daByMonth.get(m) ?? 0; }
  const opex = opexAll * share;
  Object.assign(out, { REV: revenue, DIRECT_COST: direct, GP: gp, GM: ratio(gp, revenue), OPEX: opex, EBITDA: gp - opex, EBITDA_M: ratio(gp - opex, revenue), DA: daAll * share });
  const vendor = sum(revf.map((r) => r.cost.VENDOR_LINGUIST ?? 0));
  const ipay = sum(revf.map((r) => r.cost.INTERPRETER_PAY ?? 0));
  out.VENDOR_COGS_SHARE = ratio(vendor + ipay, revenue);
  const wr = revf.filter((r) => r.unit_type === "WORD");
  const wordsRev = sum(wr.map((r) => r.units));
  out.REV_PER_WORD = ratio(sum(wr.map((r) => r.revenue_usd)), wordsRev);
  out.COST_PER_WORD = ratio(sum(wr.map((r) => r.cost.VENDOR_LINGUIST ?? 0)), wordsRev);
  const byc = new Map<string, number>();
  for (const r of revf) byc.set(r.client_id, (byc.get(r.client_id) ?? 0) + r.revenue_usd);
  const pos = [...byc.values()].filter((v) => v > 0).sort((a, b) => b - a);
  out.ACTIVE_CLIENTS = pos.length;
  out.ARPA = ratio(revenue, pos.length);
  out.TOP10_CONC = ratio(sum(pos.slice(0, 10)), revenue);
  // translation
  const dv = S.batches.filter((b) => b.status === "DELIVERED" && ms.has(b.deliv_month) && ok(b.client_id) && sc(b));
  const words = sum(dv.map((b) => b.words_total));
  out.TR_WORDS = words;
  out.TR_OTD = ratio(dv.filter((b) => b.delivered_date <= b.due_date).length, dv.length);
  out.TR_TAT = mean(dv.map((b) => (Date.parse(b.delivered_date) - Date.parse(b.start_date)) / 86400000));
  out.MTPE_SHARE = ratio(sum(dv.filter((b) => b.workflow_id === "MTPE").map((b) => b.words_total)), words);
  out.AI_SHARE = ratio(sum(dv.filter((b) => b.workflow_id !== "HT").map((b) => b.words_total)), words);
  out.TM_REUSE = ratio(sum(dv.map((b) => b.tm_match_words)), words);
  out.REJECTION_RATE = ratio(dv.filter((b) => b.client_rejected).length, dv.length);
  // interpretation
  const s = S.sessions.filter((x) => ms.has(x.month) && ok(x.client_id) && sc(x));
  const ful = s.filter((x) => x.status === "FULFILLED");
  out.INT_MIN = sum(ful.map((x) => x.duration_min));
  out.INT_AVG_DUR = mean(ful.map((x) => x.duration_min));
  out.OPI_ASA = mean(ful.filter((x) => x.service_line_id === "OPI" && x.request_type === "ON_DEMAND").map((x) => x.connect_seconds));
  const vri = s.filter((x) => x.service_line_id === "VRI");
  const vf = vri.filter((x) => x.status === "FULFILLED").length, vt = vri.filter((x) => x.status === "TECH_FAILURE").length;
  out.VRI_CONN = ratio(vf, vf + vt);
  const fill = (f: (x: any) => boolean) => {
    const sub = s.filter(f);
    const a = sub.filter((x) => x.status === "FULFILLED").length, u = sub.filter((x) => x.status === "UNFULFILLED").length;
    return ratio(a, a + u);
  };
  out.FILL_ON_DEMAND = fill((x) => x.request_type === "ON_DEMAND");
  out.FILL_SCHEDULED = fill((x) => x.request_type === "SCHEDULED");
  out.ONSITE_FILL = fill((x) => x.service_line_id === "ONSITE");
  // quality
  const e = S.evals.filter((x) => ms.has(x.month) && ok(x.client_id) && sc(x));
  out.QUALITY_SCORE = mean(e.map((x) => x.score));
  out.REVIEW_PASS = ratio(e.filter((x) => x.outcome === "PASS").length, e.length);
  out.OPEN_DISPUTES = e.filter((x) => x.dispute_status === "OPEN").length;
  // AI
  const a = S.ai.filter((x) => x.deliv_month && ms.has(x.deliv_month) && ok(x.client_id) && sc(x));
  const aw = sum(a.map((x) => x.words_total));
  out.AI_HOURS_SAVED = sum(a.map((x) => x.est_hours_saved));
  out.AI_COST_SAVED = sum(a.map((x) => x.est_cost_saved_usd));
  out.AI_EDIT_DIST = ratio(sum(a.map((x) => x.edit_distance * x.words_total)), aw);
  out.MTQE_ACCEPT = ratio(sum(a.map((x) => x.mtqe_accepted_words)), aw);
  // population sizes, used only to weight drill-down segments
  Object.assign(out, { _N_BATCHES: dv.length, _N_SESSIONS: s.length, _N_EVALS: e.length, _AI_WORDS: aw });
  return out;
}

export function nrr(endId = MONTHS[MONTHS.length - 1], bu = "ALL") {
  const S = getStore();
  const e = MONTHS.indexOf(endId);
  const none = { NRR: null, GROSS_REV_CHURN: null, LOGO_CHURN: null, LOGO_RETENTION: null, cohort: 0 } as Record<string, number | null>;
  if (e < 23) return none;
  const latest = new Set(MONTHS.slice(e - 11, e + 1)), opening = new Set(MONTHS.slice(e - 23, e - 11));
  const ok = inBu(bu);
  const o = new Map<string, number>(), l = new Map<string, number>();
  for (const r of S.revenue) {
    if (!ok(r.client_id)) continue;
    if (opening.has(r.month_id)) o.set(r.client_id, (o.get(r.client_id) ?? 0) + r.revenue_usd);
    else if (latest.has(r.month_id)) l.set(r.client_id, (l.get(r.client_id) ?? 0) + r.revenue_usd);
  }
  const cohort = [...o.entries()].filter(([, v]) => v > 0);
  if (!cohort.length) return none;
  const oSum = sum(cohort.map(([, v]) => v));
  const lVals = cohort.map(([c]) => l.get(c) ?? 0);
  const lost = sum(cohort.map(([, v], i) => Math.max(0, v - lVals[i])));
  const lc = lVals.filter((v) => v <= 0).length / cohort.length;
  return { NRR: sum(lVals) / oSum, GROSS_REV_CHURN: lost / oSum, LOGO_CHURN: lc, LOGO_RETENTION: 1 - lc, cohort: cohort.length };
}

export type OpenInvoice = { invoice_line_id: string; client_id: string; service_line_id: string; invoice_date: string; due_date: string; currency: string; amount_usd: number; open_usd: number };
export function receivables(endDate = AS_OF, bu = "ALL") {
  const S = getStore();
  const ok = inBu(bu);
  const paidBy = new Map<string, number>();
  const payDate = new Map(S.payments.map((p) => [p.payment_id, p.payment_date] as const));
  for (const b of S.bridge) if ((payDate.get(b.payment_id) as string) <= endDate) paidBy.set(b.invoice_line_id, (paidBy.get(b.invoice_line_id) ?? 0) + b.allocated_usd);
  const inv: OpenInvoice[] = S.invoices.filter((i) => ok(i.client_id) && i.invoice_date <= endDate).map((i) => ({ ...(i as any), open_usd: i.amount_usd - (paidBy.get(i.invoice_line_id) ?? 0) }));
  const d = new Date(Date.parse(endDate) - 89 * 86400000).toISOString().slice(0, 10);
  const inv90 = sum(inv.filter((i) => i.invoice_date >= d).map((i) => i.amount_usd));
  return { inv, inv90 };
}
export function dso(endDate = AS_OF, bu = "ALL") {
  const { inv, inv90 } = receivables(endDate, bu);
  const open = sum(inv.map((i) => i.open_usd));
  return { DSO: ratio(open * 90, inv90), open };
}

export function pmUtil(months: string[]) {
  const S = getStore();
  const w0 = Date.parse(months[0] + "-01");
  const [y, m] = months[months.length - 1].split("-").map(Number);
  const w1 = Date.UTC(y, m, 0);
  const DAY = 86400000;
  let alloc = 0;
  for (const p of S.projects) {
    const st = Date.parse(p.start_date), du = Date.parse(p.due_date);
    const span = (du - st) / DAY + 1;
    const ov = Math.max(0, (Math.min(du, w1) - Math.max(st, w0)) / DAY + 1);
    alloc += (p.est_pm_hours * ov) / span;
  }
  let cap = 0;
  for (const o of S.owners.filter((x) => x.role === "PROJECT_MANAGER")) {
    const a = Math.max(Date.parse(o.hire_date), w0), b = Math.min(o.termination_date ? Date.parse(o.termination_date) : w1, w1);
    const days = Math.max(0, Math.round((b - a) / DAY) + 1);
    cap += (o.weekly_capacity_hours * days) / 7;
  }
  return ratio(alloc, cap);
}

export function monthlySeries(bu = "ALL", months: string[] = MONTHS) {
  const S = getStore();
  const ok = inBu(bu);
  const ms = new Set(months);
  const m = new Map<string, { month: string; rev: number; direct: number; words: number; minutes: number }>(months.map((x) => [x, { month: x, rev: 0, direct: 0, words: 0, minutes: 0 }]));
  for (const r of S.revenue) {
    if (!ms.has(r.month_id) || !ok(r.client_id)) continue;
    const t = m.get(r.month_id)!;
    t.rev += r.revenue_usd; t.direct += r.direct;
    if (r.unit_type === "WORD") t.words += r.units; else t.minutes += r.units;
  }
  return months.map((x) => {
    const t = m.get(x)!;
    const tot = sum(S.revenue.filter((r) => r.month_id === x).map((r) => r.revenue_usd));
    const share = tot ? t.rev / tot : 0;
    const opex = (S.opexByMonth.get(x) ?? 0) * share;
    return { ...t, gp: t.rev - t.direct, opex, ebitda: t.rev - t.direct - opex };
  });
}

export { scenarioOutputs, type ScnInputs, type ScnBase, type ScnParams } from "@/lib/scenario";
import type { ScnParams as ScnParamsT, ScnInputs as ScnInputsT } from "@/lib/scenario";
import type { ScnBase } from "@/lib/scenario";

export function scenarioBaseline(): ScnBase {
  const S = getStore();
  const months = new Set(MONTHS.slice(-12));
  const r = S.revenue.filter((x) => months.has(x.month_id));
  const wr = r.filter((x) => x.unit_type === "WORD");
  const aiR = wr.filter((x) => x.workflow_id === "MTPE" || x.workflow_id === "AIR");
  const htR = wr.filter((x) => x.workflow_id === "HT");
  const W = sum(wr.map((x) => x.units));
  const AIW = sum(aiR.map((x) => x.units));
  const cat = (c: string, rows = r) => sum(rows.map((x) => x.cost[c] ?? 0));
  const weeks = new Map<string, number>();
  for (const c of S.capacity) if (!c.is_forecast) weeks.set(c.week_start, (weeks.get(c.week_start) ?? 0) + c.supply_words);
  let X = 0, D = 0;
  for (const m of months) { X += S.opexByMonth.get(m) ?? 0; D += S.daByMonth.get(m) ?? 0; }
  return {
    Rw: sum(wr.map((x) => x.revenue_usd)), Ri: sum(r.filter((x) => x.unit_type === "MINUTE").map((x) => x.revenue_usd)),
    W, a0: AIW / W, ch: cat("VENDOR_LINGUIST", htR) / (W - AIW), ca: cat("VENDOR_LINGUIST", aiR) / AIW, t: cat("MT_AI_TOOLING", aiR) / AIW,
    Pi: cat("INTERPRETER_PAY"), Pl: cat("PLATFORM_TELECOM"), L: cat("PM_DISPATCH_LABOR"), X, D, S_week: mean([...weeks.values()])!,
  };
}
export { sum, mean, ratio };

/** Scenario settings from the dataset: elasticities (meta_config.csv), presets (fact_scenario_assumption_set.csv), trajectory rates. */
export function scenarioSettings(): { params: ScnParamsT; presets: Record<string, ScnInputsT>; trajectories: { name: string; rate: number }[] } {
  const S = getStore();
  const cfg = manifest().config;
  const params: ScnParamsT = { effort: cfg.assumptions.ai_effort_factor, pmElasticity: cfg.scenario.pm_labor_volume_elasticity, opexElasticity: cfg.scenario.opex_volume_elasticity, platformElasticity: cfg.scenario.platform_volume_elasticity };
  const presets = Object.fromEntries(S.scnSets.map((s) => [String(s.set_id).replace(/^SCN-/, ""), { ai_adoption_delta: s.ai_adoption_delta, price_adjustment: s.price_adjustment, vendor_inflation: s.vendor_inflation, volume_growth: s.volume_growth }]));
  const trajectories = Object.entries<number>(cfg.scenario.trajectory_cagr).map(([k, r]) => ({ name: k.charAt(0) + k.slice(1).toLowerCase(), rate: r }));
  return { params, presets, trajectories };
}
