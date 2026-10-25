/* eslint-disable @typescript-eslint/no-explicit-any */
/* Expanded-analysis engine. Every number comes from the existing KPI layer (core(), nrr(), dso(), pmUtil(), receivables())
 * or from straightforward aggregation of the same synthetic tables the dashboard uses. Insights are generated from these
 * numbers only; when the data model cannot support a comparison, the payload says so in `unavailable`. */
import "server-only";
import { getStore, manifest, fxRate, onDataChange } from "@/lib/data/store";
import { AS_OF, BUS, LATEST_MONTH, MONTHS, RANGES, parseFilters, type Currency, type Filters, type SP } from "@/lib/filters";
import { core, dso, mean, nrr, pmUtil, receivables, sum, type Core, type Scope } from "@/lib/kpi/core";
import { SL_LABEL, groupBy } from "@/lib/kpi/agg";
import { isDegraded, slaRuleText, slaStatus } from "@/lib/kpi/rules";
import { fmt, type Fmt } from "@/lib/format";
import type { AnalysisPayload, Breakdown, BreakdownRow, Mover, Stat, Trend } from "./types";

type Ctx = { f: Filters; sp: URLSearchParams; fx: number; cur: Currency };
const SYN = "All figures are synthetic demo data.";

// ---------- formatting helpers for generated insight text
const fv = (v: number | null | undefined, f: Fmt | "pp", cur: Currency = "USD") =>
  v == null ? "n/a" : f === "pp" ? `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)} pp` : fmt(v, f, cur);
const pct = (v: number | null | undefined) => (v == null ? "n/a" : `${(v * 100).toFixed(1)}%`);
const signed = (v: number, f: Fmt, cur: Currency) => `${v >= 0 ? "+" : "−"}${fmt(Math.abs(v), f, cur)}`;
const periodText = (months: string[]) => `${months[0]} to ${months[months.length - 1]}`;

function chips(c: Ctx, applied: { period: boolean; bu: boolean; cur: boolean }, extra: { label: string; value: string; applied: boolean }[] = []) {
  const r = RANGES.find((x) => x.value === c.f.range)!.label;
  return [
    { label: "Period", value: applied.period ? `${r} (${c.f.label})` : "Not applicable: fixed window", applied: applied.period },
    ...(applied.period && c.f.prior ? [{ label: "Compared with", value: periodText(c.f.prior), applied: true }] : []),
    { label: "Business unit", value: applied.bu ? BUS.find((b) => b.value === c.f.bu)!.label : "Not applicable", applied: applied.bu },
    { label: "Currency", value: applied.cur ? c.cur : "Not applicable", applied: applied.cur },
    ...extra,
  ];
}

// ---------- monthly core cache (data is static, so results never change while the server runs)
const monthlyCache = new Map<string, Core[]>();
function coreByMonth(bu: string): Core[] {
  let v = monthlyCache.get(bu);
  if (!v) { v = MONTHS.map((m) => core([m], bu)); monthlyCache.set(bu, v); }
  return v;
}

// ---------- dimensions for drill-down
type Dim = "bu" | "sl" | "client" | "tier" | "vertical" | "lp" | "wf" | "engine";
const DIM_LABEL: Record<Dim, string> = { bu: "Business unit", sl: "Service line", client: "Client", tier: "Client tier", vertical: "Client vertical", lp: "Language pair", wf: "Workflow", engine: "AI engine category" };
const WF_LABEL: Record<string, string> = { HT: "Human translation (HT)", MTPE: "MT post-editing (MTPE)", AIR: "AI-assisted review (AIR)" };
function dimValues(dim: Dim, bu: string): { id: string; name: string }[] {
  const S = getStore();
  const cl = S.clients.filter((c) => bu === "ALL" || c.business_unit === bu);
  switch (dim) {
    case "bu": return BUS.filter((b) => b.value !== "ALL").map((b) => ({ id: b.value, name: b.label }));
    case "sl": return S.serviceLines.map((s) => ({ id: s.service_line_id as string, name: SL_LABEL[s.service_line_id] ?? s.service_line_id }));
    case "client": return cl.map((c) => ({ id: c.client_id as string, name: c.client_name as string }));
    case "tier": case "vertical": return [...new Set(cl.map((c) => c[dim] as string))].sort().map((x) => ({ id: x, name: x }));
    case "lp": return S.lps.map((l) => ({ id: l.lp_id as string, name: l.pair_label as string }));
    case "wf": return ["HT", "MTPE", "AIR"].map((w) => ({ id: w, name: WF_LABEL[w] }));
    case "engine": return [...new Set(S.ai.map((a) => a.engine_category as string))].sort().map((x) => ({ id: x, name: x }));
  }
}

// ---------- KPIs computed by core()
type Pop = "rev" | "batch" | "session" | "eval" | "ai";
const WEIGHT: Record<Pop, { key: string; label: string; fmt: Fmt; money?: boolean }> = {
  rev: { key: "REV", label: "Revenue", fmt: "money", money: true },
  batch: { key: "_N_BATCHES", label: "Delivered batches", fmt: "num" },
  session: { key: "_N_SESSIONS", label: "Requests", fmt: "num" },
  eval: { key: "_N_EVALS", label: "Evaluations", fmt: "num" },
  ai: { key: "_AI_WORDS", label: "AI-touched words", fmt: "words" },
};
type CoreSpec = { title: string; fmt: Fmt; money?: boolean; kind: "rel" | "pp"; good: "up" | "down"; pop: Pop; additive?: boolean; dims: Dim[]; dimNote?: string };
const CORE: Record<string, CoreSpec> = {
  REV: { title: "Recognized revenue", fmt: "money", money: true, kind: "rel", good: "up", pop: "rev", additive: true, dims: ["bu", "sl", "client", "tier", "vertical"] },
  GP: { title: "Gross profit", fmt: "money", money: true, kind: "rel", good: "up", pop: "rev", additive: true, dims: ["bu", "sl", "client", "tier"] },
  GM: { title: "Gross margin", fmt: "pct1", kind: "pp", good: "up", pop: "rev", dims: ["bu", "sl", "tier", "vertical", "client"] },
  EBITDA: { title: "EBITDA", fmt: "money", money: true, kind: "rel", good: "up", pop: "rev", additive: true, dims: ["bu", "sl"], dimNote: "Segment EBITDA allocates company operating expenses in proportion to each segment's revenue." },
  EBITDA_M: { title: "EBITDA margin", fmt: "pct1", kind: "pp", good: "up", pop: "rev", dims: ["bu", "sl"], dimNote: "Segment EBITDA allocates company operating expenses in proportion to each segment's revenue." },
  ACTIVE_CLIENTS: { title: "Active clients", fmt: "num", kind: "rel", good: "up", pop: "rev", dims: ["bu", "sl", "tier", "vertical"], dimNote: "A client can be active in several service lines, so segment counts can add up to more than the total." },
  ARPA: { title: "Average revenue per account", fmt: "money", money: true, kind: "rel", good: "up", pop: "rev", dims: ["bu", "tier", "vertical", "sl"] },
  TOP10_CONC: { title: "Top-10 client concentration", fmt: "pct1", kind: "pp", good: "down", pop: "rev", dims: ["bu", "client"], dimNote: "The client table shows each client's share of revenue; the KPI is the sum of the ten largest shares." },
  TR_WORDS: { title: "Translation words delivered", fmt: "words", kind: "rel", good: "up", pop: "batch", additive: true, dims: ["bu", "lp", "wf", "client", "tier"] },
  TR_OTD: { title: "Translation on-time delivery", fmt: "pct1", kind: "pp", good: "up", pop: "batch", dims: ["bu", "lp", "wf", "tier", "client"] },
  TR_TAT: { title: "Average turnaround time (days)", fmt: "dec1", kind: "rel", good: "down", pop: "batch", dims: ["bu", "lp", "wf", "tier"] },
  TM_REUSE: { title: "Translation-memory reuse", fmt: "pct1", kind: "pp", good: "up", pop: "batch", dims: ["bu", "lp", "wf", "tier"] },
  REJECTION_RATE: { title: "Client rejection rate", fmt: "pct1", kind: "pp", good: "down", pop: "batch", dims: ["bu", "lp", "wf", "tier", "client"] },
  AI_SHARE: { title: "AI-touched word share", fmt: "pct1", kind: "pp", good: "up", pop: "batch", dims: ["bu", "lp", "tier", "client"] },
  INT_MIN: { title: "Interpretation minutes delivered", fmt: "words", kind: "rel", good: "up", pop: "session", additive: true, dims: ["bu", "sl", "lp", "client", "tier"] },
  OPI_ASA: { title: "OPI average speed to answer (s)", fmt: "sec", kind: "rel", good: "down", pop: "session", dims: ["bu", "lp", "tier"] },
  FILL_ON_DEMAND: { title: "On-demand fill rate", fmt: "pct1", kind: "pp", good: "up", pop: "session", dims: ["bu", "sl", "lp", "tier"] },
  VRI_CONN: { title: "VRI connection success", fmt: "pct1", kind: "pp", good: "up", pop: "session", dims: ["bu", "lp", "tier"] },
  INT_AVG_DUR: { title: "Average session duration (min)", fmt: "dec1", kind: "rel", good: "up", pop: "session", dims: ["bu", "sl", "lp", "tier"] },
  QUALITY_SCORE: { title: "Quality score", fmt: "dec1", kind: "rel", good: "up", pop: "eval", dims: ["bu", "lp", "tier", "client"] },
  REVIEW_PASS: { title: "Review pass rate", fmt: "pct1", kind: "pp", good: "up", pop: "eval", dims: ["bu", "lp", "tier", "client"] },
  OPEN_DISPUTES: { title: "Open disputes", fmt: "num", kind: "rel", good: "down", pop: "eval", additive: true, dims: ["bu", "lp", "client", "tier"] },
  MTQE_ACCEPT: { title: "MTQE acceptance", fmt: "pct1", kind: "pp", good: "up", pop: "ai", dims: ["bu", "engine", "wf", "lp"] },
  AI_EDIT_DIST: { title: "Post-edit distance", fmt: "pct1", kind: "pp", good: "down", pop: "ai", dims: ["bu", "engine", "wf", "lp"] },
  AI_HOURS_SAVED: { title: "Estimated hours saved", fmt: "num", kind: "rel", good: "up", pop: "ai", additive: true, dims: ["bu", "engine", "wf", "lp", "client"] },
  AI_COST_SAVED: { title: "Estimated cost impact", fmt: "money", money: true, kind: "rel", good: "up", pop: "ai", additive: true, dims: ["bu", "engine", "wf", "lp", "client"] },
};
const CLIENT_LIMIT = 15;

function targetFor(id: string, months: string[]): { monthly: Map<string, number>; has: boolean } {
  const rows = getStore().targets.filter((t) => t.kpi_id === id);
  const monthly = new Map(rows.map((t) => [t.month_id as string, t.target_value as number]));
  return { monthly, has: rows.length > 0 && months.some((m) => monthly.has(m)) };
}

type Drill = { dim: Dim; id: string; name: string };
const scopedMonthly = new Map<string, Core[]>();
function coreByMonthScoped(bu: string, scope?: Scope): Core[] {
  if (!scope) return coreByMonth(bu);
  const k = `${bu}|${JSON.stringify(scope)}`;
  let v = scopedMonthly.get(k);
  if (!v) { v = MONTHS.map((m) => core([m], bu, scope)); if (scopedMonthly.size > 100) scopedMonthly.clear(); scopedMonthly.set(k, v); }
  return v;
}

function runCore(id: string, c0: Ctx, drill?: Drill): AnalysisPayload {
  // A business-unit drill is the same as selecting that unit; any other drill scopes every core() call to the segment.
  const c: Ctx = drill?.dim === "bu" ? { ...c0, f: { ...c0.f, bu: drill.id } } : c0;
  const scope: Scope | undefined = drill && drill.dim !== "bu" ? ({ [drill.dim]: drill.id } as Scope) : undefined;
  const sp = CORE[id], { f } = c;
  const W = WEIGHT[sp.pop];
  const conv = (v: number | null | undefined) => (v == null ? null : sp.money ? v / c.fx : v);
  const now = core(f.months, f.bu, scope), pri = f.prior ? core(f.prior, f.bu, scope) : null;
  const v = conv(now[id]), pv = pri ? conv(pri[id]) : null;
  const unavailable: string[] = [], insights: string[] = [];
  const stats: Stat[] = [{ label: "Selected period", v, fmt: sp.fmt, note: f.label }];
  const tone = (d: number) => (d === 0 ? "mute" : (d > 0) === (sp.good === "up") ? "good" : "bad") as Stat["tone"];
  if (pri && v != null && pv != null) {
    stats.push({ label: "Prior period", v: pv, fmt: sp.fmt, note: periodText(f.prior!) });
    if (sp.kind === "pp") stats.push({ label: "Change", v: v - pv, fmt: "pp", tone: tone(v - pv) });
    else {
      stats.push({ label: "Absolute change", v: v - pv, fmt: sp.fmt, tone: tone(v - pv) });
      if (pv !== 0) stats.push({ label: "Relative change", v: v / pv - 1, fmt: "pct1", tone: tone(v - pv) });
    }
    const d = v - pv;
    insights.push(d === 0 ? `${sp.title} is unchanged from the prior period (${periodText(f.prior!)}).`
      : `${sp.title} is ${sp.kind === "pp" ? fv(d, "pp") : `${d > 0 ? "up" : "down"} ${pct(Math.abs(pv ? v / pv - 1 : 0))}`} vs the prior period (${fv(pv, sp.fmt, c.cur)} in ${periodText(f.prior!)}), a ${tone(d) === "good" ? "favourable" : "unfavourable"} move.`);
  } else unavailable.push(f.prior ? "The prior period has no data for this KPI, so no comparison is shown." : "No prior-period comparison for this range (All data, or the comparison window would start before 2024-01).");

  // Target vs actual (fact_kpi_target_period), using the same rule as the Executive Strategy scorecard.
  const tg = scope ? { monthly: new Map<string, number>(), has: false } : targetFor(id, f.months);
  if (scope && targetFor(id, f.months).has) unavailable.push("Targets exist only at company and business-unit level, so no target is shown for this segment.");
  const shareOf = (a: Core, b: Core) => (f.bu === "ALL" ? 1 : (a.REV ?? 0) / Math.max(1, b.REV ?? 0));
  let targetMonthly: (number | null)[] | null = null;
  if (tg.has) {
    const vals = f.months.map((m) => tg.monthly.get(m)).filter((x): x is number => x != null);
    const t = id === "REV" ? sum(vals) * shareOf(now, core(f.months)) : mean(vals);
    const tc = conv(t);
    const att = v != null && tc ? v / tc : null;
    stats.push({ label: "Illustrative target", v: tc, fmt: sp.fmt, note: id === "REV" ? "Sum of monthly plan" : "Mean of monthly targets" });
    stats.push({ label: "Attainment", v: att, fmt: "pct1", tone: att == null ? "mute" : att >= 1 ? "good" : "bad" });
    if (att != null) insights.push(`At ${pct(att)} of the illustrative target (${fv(tc, sp.fmt, c.cur)}); ${att >= 1 ? "on or above target" : att >= 0.97 ? "near target (within 3%)" : "behind target"}.`);
    const mb = coreByMonth(f.bu), ma = coreByMonth("ALL");
    targetMonthly = MONTHS.map((m, i) => { const x = tg.monthly.get(m); return x == null ? null : conv(id === "REV" ? x * shareOf(mb[i], ma[i]) : x); });
  } else if (!scope) unavailable.push("No target exists for this KPI in fact_kpi_target_period, so target vs actual is not shown.");

  // 33-month trend with the selected and comparison windows shaded
  const mb = coreByMonthScoped(f.bu, scope);
  const trend: Trend = {
    title: "Monthly trend", note: "All 33 months of history; shaded areas mark the selected period and its comparison period.",
    x: MONTHS, fmt: sp.fmt, series: [{ name: sp.title, data: mb.map((x) => conv(x[id])), type: sp.additive ? "bar" : "line" }],
    bands: [{ from: f.months[0], to: f.months[f.months.length - 1], label: "Selected", tone: "current" }, ...(f.prior ? [{ from: f.prior[0], to: f.prior[f.prior.length - 1], label: "Prior", tone: "prior" as const }] : [])],
  };
  if (targetMonthly) trend.series.push({ name: "Illustrative target", data: targetMonthly, type: "line", dashed: true });
  const last = mb[MONTHS.length - 1][id], yearAgo = mb[MONTHS.length - 13][id];
  if (last != null && yearAgo != null) insights.push(`In ${LATEST_MONTH} the monthly value was ${fv(conv(last), sp.fmt, c.cur)}, compared with ${fv(conv(yearAgo), sp.fmt, c.cur)} in ${MONTHS[MONTHS.length - 13]}.`);

  // Breakdowns, each segment computed by core() with a scope so the formula is identical to the headline KPI
  const breakdowns: Breakdown[] = [];
  let movers: AnalysisPayload["movers"];
  for (const dim of sp.dims.filter((d) => d !== drill?.dim)) {
    const vals = dimValues(dim, f.bu);
    const calc = (months: string[], val: string) => (dim === "bu" ? core(months, val, scope) : core(months, f.bu, { ...scope, [dim]: val } as Scope));
    let rows: (BreakdownRow & { w: number })[] = vals.map((val) => {
      const a = calc(f.months, val.id), b = pri ? calc(f.prior!, val.id) : null;
      const value = conv(a[id]), prior = b ? conv(b[id]) : undefined;
      const w = (W.money ? (a[W.key] ?? 0) / c.fx : a[W.key] ?? 0) as number;
      const change = prior == null || value == null ? null : sp.kind === "pp" ? value - prior : prior ? value / prior - 1 : null;
      return { name: val.name, value, prior, change, weight: w, w, highlight: dim === "bu" && val.id === f.bu, drill: drill ? undefined : `${dim}:${val.id}` };
    }).filter((r) => r.w > 0 || (r.value ?? 0) !== 0);
    if (!rows.length) continue;
    const totalW = sum(rows.map((r) => r.w));
    if (sp.additive && pri && dim !== "bu" && !movers) {
      const ms: Mover[] = rows.filter((r) => r.value != null && r.prior != null).map((r) => ({ name: r.name, delta: (r.value as number) - (r.prior as number) }));
      const up = ms.filter((m) => m.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3);
      const down = ms.filter((m) => m.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3);
      if (up.length || down.length) {
        movers = { title: `Largest contributors to the change, by ${DIM_LABEL[dim].toLowerCase()}`, fmt: sp.fmt, up, down };
        insights.push([up[0] && `Largest increase: ${up[0].name} (${signed(up[0].delta, sp.fmt, c.cur)})`, down[0] && `largest decrease: ${down[0].name} (${signed(down[0].delta, sp.fmt, c.cur)})`].filter(Boolean).join("; ") + ".");
      }
    }
    const total = sum(rows.map((r) => r.value ?? 0));
    rows.sort((a, b) => (sp.additive ? (b.value ?? 0) - (a.value ?? 0) : b.w - a.w));
    const n = rows.length;
    if (dim === "client") rows = rows.slice(0, CLIENT_LIMIT);
    const bd: Breakdown = {
      title: `By ${DIM_LABEL[dim].toLowerCase()}`, fmt: sp.fmt, changeKind: sp.kind === "pp" ? "pp" : "rel", weightLabel: W.label, weightFmt: W.fmt,
      showShare: !!sp.additive && dim !== "bu" ? true : dim === "client" && id === "TOP10_CONC",
      note: [dim === "client" && n > CLIENT_LIMIT ? `Top ${CLIENT_LIMIT} of ${n} clients.` : "", dim === "bu" && f.bu !== "ALL" ? "The selected unit is highlighted." : "", dim !== "bu" ? sp.dimNote ?? "" : ""].filter(Boolean).join(" ") || undefined,
      rows: rows.map((row) => ({ name: row.name, value: row.value, prior: row.prior, change: row.change, weight: row.weight, highlight: row.highlight, drill: row.drill, share: id === "TOP10_CONC" && dim === "client" ? (row.weight ?? 0) / Math.max(1, totalW) : sp.additive && total ? (row.value ?? 0) / total : null })),
    };
    breakdowns.push(bd);
    // One ranking insight from the first non-unit breakdown
    if (dim !== "bu" && breakdowns.length <= 2 && !insights.some((s) => s.startsWith("Across") || s.includes("largest share"))) {
      if (sp.additive && total) { const top = rows[0]; insights.push(`${top.name} has the largest share by ${DIM_LABEL[dim].toLowerCase()}: ${pct((top.value ?? 0) / total)} of the total.`); }
      else {
        const elig = rows.filter((r) => r.value != null && r.w >= 0.05 * totalW);
        if (elig.length >= 2) {
          const s2 = [...elig].sort((a, b) => (b.value as number) - (a.value as number));
          insights.push(`Across ${DIM_LABEL[dim].toLowerCase()}s with at least 5% of ${W.label.toLowerCase()}, the highest is ${s2[0].name} (${fv(s2[0].value, sp.fmt, c.cur)}) and the lowest is ${s2[s2.length - 1].name} (${fv(s2[s2.length - 1].value, sp.fmt, c.cur)}).`);
        }
      }
    }
  }
  return {
    key: id, title: drill ? `${sp.title}: ${drill.name}` : sp.title, subtitle: drill ? `Drill-down by ${DIM_LABEL[drill.dim].toLowerCase()}` : undefined,
    headline: { v, fmt: sp.fmt, label: f.label },
    stats, trends: [trend], breakdowns, movers, insights, unavailable,
    context: chips(c, { period: true, bu: true, cur: !!sp.money }, drill && drill.dim !== "bu" ? [{ label: DIM_LABEL[drill.dim], value: drill.name, applied: true }] : []),
  };
}

// ---------- Net revenue retention family (fixed windows at the cut-off)
function runNrr(c: Ctx): AnalysisPayload {
  const S = getStore(), { f } = c;
  const n = nrr(undefined, f.bu);
  const x = MONTHS.slice(23);
  const hist = x.map((m) => nrr(m, f.bu));
  const e = MONTHS.length - 1, open = new Set(MONTHS.slice(e - 23, e - 11)), latest = new Set(MONTHS.slice(e - 11, e + 1));
  const o = new Map<string, number>(), l = new Map<string, number>();
  for (const r of S.revenue) {
    if (f.bu !== "ALL" && S.clientById.get(r.client_id)!.business_unit !== f.bu) continue;
    if (open.has(r.month_id)) o.set(r.client_id, (o.get(r.client_id) ?? 0) + r.revenue_usd);
    else if (latest.has(r.month_id)) l.set(r.client_id, (l.get(r.client_id) ?? 0) + r.revenue_usd);
  }
  const ms: Mover[] = [...o.entries()].filter(([, v]) => v > 0).map(([id, v]) => ({ name: S.clientById.get(id)!.client_name, delta: ((l.get(id) ?? 0) - v) / c.fx }));
  const up = ms.filter((m) => m.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5), down = ms.filter((m) => m.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5);
  const insights = [`The opening cohort of ${n.cohort} clients generated ${pct(n.NRR)} of its opening-year revenue in the latest 12 months.`, `Gross revenue churn is ${pct(n.GROSS_REV_CHURN)} and logo retention is ${pct(n.LOGO_RETENTION)}.`];
  if (up[0]) insights.push(`Largest expansion: ${up[0].name} (${signed(up[0].delta, "money", c.cur)}).`);
  if (down[0]) insights.push(`Largest contraction: ${down[0].name} (${signed(down[0].delta, "money", c.cur)}).`);
  return {
    key: "NRR", title: "Net revenue retention", headline: { v: n.NRR, fmt: "pct1", label: "Latest 12 months vs opening 12 months" },
    stats: [{ label: "Net revenue retention", v: n.NRR, fmt: "pct1" }, { label: "Gross revenue churn", v: n.GROSS_REV_CHURN, fmt: "pct1" }, { label: "Logo retention", v: n.LOGO_RETENTION, fmt: "pct1" }, { label: "Cohort size", v: n.cohort, fmt: "num", note: "clients" }],
    trends: [{ title: "Retention by month-end", note: "Each point uses the 12 months ending that month vs the 12 months before; earlier months lack a full opening window.", x, fmt: "pct1", series: [{ name: "Net revenue retention", data: hist.map((h) => h.NRR), type: "line" }, { name: "Gross revenue churn", data: hist.map((h) => h.GROSS_REV_CHURN), type: "line" }, { name: "Logo retention", data: hist.map((h) => h.LOGO_RETENTION), type: "line", dashed: true }] }],
    breakdowns: [{ title: "By business unit", fmt: "pct1", weightLabel: "Cohort clients", weightFmt: "num", rows: BUS.filter((b) => b.value !== "ALL").map((b) => { const r = nrr(undefined, b.value); return { name: b.label, value: r.NRR, weight: r.cohort, highlight: b.value === f.bu }; }) }],
    movers: { title: "Largest expansions and contractions in the cohort (latest 12 months − opening 12 months)", fmt: "money", up, down },
    insights,
    unavailable: [`Measured with fixed 12-month windows ending at the ${AS_OF} cut-off; the reporting period does not apply.`, "No NRR target exists in fact_kpi_target_period."],
    context: chips(c, { period: false, bu: true, cur: true }),
  };
}

// ---------- DSO and receivables
function runDso(c: Ctx): AnalysisPayload {
  const S = getStore(), { f } = c;
  const d = dso(undefined, f.bu);
  const { inv, inv90 } = receivables(AS_OF, f.bu);
  const ends = MONTHS.slice(3).map((m) => { const [y, mo] = m.split("-").map(Number); return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10); });
  const open = inv.filter((i) => i.open_usd > 1);
  const bucket = (due: string) => { const dd = (Date.parse(AS_OF) - Date.parse(due)) / 864e5; return dd <= 0 ? "Not yet due" : dd <= 30 ? "1–30 days" : dd <= 60 ? "31–60 days" : dd <= 90 ? "61–90 days" : "90+ days"; };
  const order = ["Not yet due", "1–30 days", "31–60 days", "61–90 days", "90+ days"];
  const totalOpen = sum(open.map((i) => i.open_usd));
  const aging = order.map((b) => { const v = sum(open.filter((i) => bucket(i.due_date) === b).map((i) => i.open_usd)); return { name: b, value: v / c.fx, share: totalOpen ? v / totalOpen : null }; });
  const byClient = [...groupBy(open, (i) => i.client_id).entries()].map(([id, is]) => ({ name: S.clientById.get(id)!.client_name as string, value: sum(is.filter((i) => i.due_date < AS_OF).map((i) => i.open_usd)) / c.fx, weight: sum(is.map((i) => i.open_usd)) / c.fx })).sort((a, b) => (b.value as number) - (a.value as number)).slice(0, 10);
  const overdueShare = totalOpen ? sum(open.filter((i) => i.due_date < AS_OF).map((i) => i.open_usd)) / totalOpen : null;
  return {
    key: "DSO", title: "Days sales outstanding", headline: { v: d.DSO, fmt: "dec1", label: `Days, at ${AS_OF}` },
    stats: [{ label: "DSO", v: d.DSO, fmt: "dec1", note: "days" }, { label: "Open receivables", v: d.open / c.fx, fmt: "money" }, { label: "Invoiced, last 90 days", v: inv90 / c.fx, fmt: "money" }, { label: "Share overdue", v: overdueShare, fmt: "pct1" }],
    trends: [{ title: "DSO at each month-end", note: "Same formula evaluated at each month-end from 2024-04 (earlier months lack 90 days of invoices).", x: MONTHS.slice(3), fmt: "dec1", series: [{ name: "DSO (days)", data: ends.map((e) => dso(e, f.bu).DSO), type: "line" }] }],
    breakdowns: [
      { title: "Receivables aging", fmt: "money", showShare: true, rows: aging },
      { title: "By business unit", fmt: "dec1", weightLabel: "Open receivables", weightFmt: "money", rows: BUS.filter((b) => b.value !== "ALL").map((b) => { const x = dso(undefined, b.value); return { name: b.label, value: x.DSO, weight: x.open / c.fx, highlight: b.value === f.bu }; }) },
      { title: "Clients with the largest overdue balances", fmt: "money", weightLabel: "Total open", weightFmt: "money", rows: byClient, note: "Value = open amount on invoices past their due date." },
    ],
    insights: [`DSO is ${fv(d.DSO, "dec1")} days: open receivables of ${fv(d.open / c.fx, "money", c.cur)} against ${fv(inv90 / c.fx, "money", c.cur)} invoiced in the last 90 days.`, `${pct(overdueShare)} of open receivables are past their due date.`],
    unavailable: [`Measured at the ${AS_OF} cut-off; the reporting period does not apply.`, "No DSO target exists in fact_kpi_target_period."],
    context: chips(c, { period: false, bu: true, cur: true }),
  };
}

function runPmUtil(c: Ctx): AnalysisPayload {
  const { f } = c;
  const v = pmUtil(f.months), pv = f.prior ? pmUtil(f.prior) : null;
  const stats: Stat[] = [{ label: "Selected period", v, fmt: "pct1", note: f.label }];
  if (pv != null && v != null) stats.push({ label: "Prior period", v: pv, fmt: "pct1", note: periodText(f.prior!) }, { label: "Change", v: v - pv, fmt: "pp" });
  return {
    key: "PM_UTIL", title: "PM utilization", headline: { v, fmt: "pct1", label: f.label }, stats,
    trends: [{ title: "Monthly PM utilization", x: MONTHS, fmt: "pct1", series: [{ name: "PM utilization", data: MONTHS.map((m) => pmUtil([m])), type: "line" }], bands: [{ from: f.months[0], to: f.months[f.months.length - 1], label: "Selected", tone: "current" }] }],
    insights: [v != null ? `Utilization is ${pct(v)} in the selected period; the illustrative target band is 70–90%, and the warning threshold is 90%.` : ""].filter(Boolean),
    unavailable: ["Per-manager workload is shown in the Project manager workload table on this tab.", "Not filtered by business unit: projects are not linked to the unit filter here."],
    context: chips(c, { period: true, bu: false, cur: false }),
  };
}

// ---------- Client health snapshots
function runHealth(c: Ctx): AnalysisPayload {
  const S = getStore(), { f } = c;
  const snaps = S.snapshots.filter((s) => f.bu === "ALL" || S.clientById.get(s.client_id)!.business_unit === f.bu);
  const months = [...new Set(snaps.map((s) => s.snapshot_month_id as string))].sort();
  const bands = ["HEALTHY", "WATCH", "AT_RISK"];
  const latest = snaps.filter((s) => s.snapshot_month_id === LATEST_MONTH);
  const tiers = groupBy(latest, (s) => S.clientById.get(s.client_id)!.tier as string);
  const atRisk = latest.filter((s) => s.health_band === "AT_RISK").sort((a, b) => b.ttm_revenue_usd - a.ttm_revenue_usd);
  const n = latest.length;
  return {
    key: "cr.health", title: "Client health", headline: { v: mean(latest.map((s) => s.health_score)), fmt: "dec2", label: `Mean health score, ${LATEST_MONTH} snapshot` },
    stats: bands.map((b) => ({ label: b.replace("_", " ").toLowerCase().replace(/^./, (x) => x.toUpperCase()), v: latest.filter((s) => s.health_band === b).length, fmt: "num" as Fmt, note: `${pct(latest.filter((s) => s.health_band === b).length / Math.max(1, n))} of clients` })),
    trends: [{ title: "Clients by health band at each snapshot", x: months, fmt: "num", series: bands.map((b) => ({ name: b.replace("_", " "), data: months.map((m) => snaps.filter((s) => s.snapshot_month_id === m && s.health_band === b).length), type: "bar" as const })) }],
    breakdowns: [
      { title: "By client tier (latest snapshot)", fmt: "dec2", weightLabel: "Clients", weightFmt: "num", rows: [...tiers.entries()].map(([t, ss]) => ({ name: t, value: mean(ss.map((s) => s.health_score)), weight: ss.length })), note: "Value = mean health score (0–1)." },
      { title: "Clients at risk (latest snapshot)", fmt: "dec2", weightLabel: "TTM revenue", weightFmt: "money", rows: atRisk.map((s) => ({ name: S.clientById.get(s.client_id)!.client_name as string, value: s.health_score, weight: s.ttm_revenue_usd / c.fx })), note: "Sorted by trailing-12-month revenue." },
    ],
    insights: [`${atRisk.length} of ${n} clients are at risk in the ${LATEST_MONTH} snapshot${atRisk[0] ? `; the largest by revenue is ${S.clientById.get(atRisk[0].client_id)!.client_name} (${fv(atRisk[0].ttm_revenue_usd / c.fx, "money", c.cur)} TTM)` : ""}.`],
    unavailable: ["Snapshots exist only at quarter-ends and the cut-off month; the reporting period does not apply.", "Unlike the dashboard chart, this view applies the business-unit filter."],
    context: chips(c, { period: false, bu: true, cur: true }),
  };
}

// ---------- Translation pipeline (snapshot at the cut-off)
function runPipeline(c: Ctx): AnalysisPayload {
  const S = getStore(), { f } = c;
  const active = S.batches.filter((b) => b.status !== "DELIVERED" && (f.bu === "ALL" || S.clientById.get(b.client_id)!.business_unit === f.bu));
  // Same rule as the Translation Ops pipeline status
  const risk = (b: any) => slaStatus(b);
  const grp = (k: (b: any) => string, label: (x: string) => string = (x) => x) => [...groupBy(active, k).entries()].map(([x, bs]) => ({ name: label(x), value: bs.length, weight: sum(bs.map((b) => b.words_total)) })).sort((a, b) => b.value - a.value);
  const byStatus = grp(risk);
  const overdue = byStatus.find((x) => x.name === "Overdue")?.value ?? 0, atRisk = byStatus.find((x) => x.name === "At risk")?.value ?? 0;
  return {
    key: "tr.pipeline", title: "Active translation pipeline", headline: { v: active.length, fmt: "num", label: `Batches in progress at ${AS_OF}` },
    stats: [{ label: "Active batches", v: active.length, fmt: "num" }, { label: "Words in progress", v: sum(active.map((b) => b.words_total)), fmt: "words" }, { label: "Overdue", v: overdue, fmt: "num", tone: overdue ? "bad" : "mute" }, { label: "At risk", v: atRisk, fmt: "num", tone: atRisk ? "bad" : "mute" }],
    breakdowns: [
      { title: "By status", fmt: "num", weightLabel: "Words", weightFmt: "words", rows: byStatus, note: slaRuleText() },
      { title: "By stage", fmt: "num", weightLabel: "Words", weightFmt: "words", rows: grp((b) => b.stage) },
      { title: "By language pair", fmt: "num", weightLabel: "Words", weightFmt: "words", rows: grp((b) => b.lp_id, (x) => S.lpById.get(x)!.pair_label) },
      { title: "By workflow", fmt: "num", weightLabel: "Words", weightFmt: "words", rows: grp((b) => b.workflow_id, (x) => WF_LABEL[x] ?? x) },
    ],
    insights: [`${active.length} batches are in progress; ${overdue} overdue and ${atRisk} at risk under the SLA rule.`],
    unavailable: ["A snapshot at the cut-off; pipeline history is not stored, so there is no trend."],
    context: chips(c, { period: false, bu: true, cur: false }),
  };
}

// ---------- OKRs
function runOkr(c: Ctx): AnalysisPayload {
  const S = getStore();
  const okrs = S.okrs;
  const onTrack = okrs.filter((o) => o.status === "ON_TRACK" || o.status === "COMPLETE").length;
  const pillars = [...groupBy(okrs, (o) => o.pillar as string).entries()];
  return {
    key: "ex.okr", title: "OKR progress", headline: { v: onTrack / okrs.length, fmt: "pct", label: "Key results on track or complete" },
    stats: [{ label: "On track or complete", v: onTrack / okrs.length, fmt: "pct1", note: `${onTrack} of ${okrs.length}` }, { label: "Mean progress (OKR attainment)", v: mean(okrs.map((o) => o.progress)), fmt: "pct1" }],
    breakdowns: [
      { title: "By pillar", fmt: "pct1", weightLabel: "Key results", weightFmt: "num", rows: pillars.map(([p, os]) => ({ name: p, value: mean(os.map((o) => o.progress)), weight: os.length })), note: "Value = mean progress." },
      { title: "By status", fmt: "num", rows: ["COMPLETE", "ON_TRACK", "AT_RISK", "OFF_TRACK"].map((s) => ({ name: s.replace("_", " "), value: okrs.filter((o) => o.status === s).length })) },
      { title: "Key results not on track", fmt: "pct1", rows: okrs.filter((o) => o.status === "AT_RISK" || o.status === "OFF_TRACK").map((o) => ({ name: `${o.key_result} (${o.status.replace("_", " ")})`, value: o.progress })), note: "Value = progress toward target." },
    ],
    insights: pillars.map(([p, os]) => ({ p, m: mean(os.map((o) => o.progress)) ?? 0 })).sort((a, b) => a.m - b.m).slice(0, 1).map((x) => `${x.p} has the lowest mean progress (${pct(x.m)}).`),
    unavailable: ["OKR history is not stored: values are as at the data cut-off, so there is no trend or prior-period comparison.", "Not filtered by period or business unit."],
    context: chips(c, { period: false, bu: false, cur: false }),
  };
}

// ---------- Sales & Marketing
function runSales(c: Ctx, focus: string): AnalysisPayload {
  const S = getStore(), { f } = c;
  const all = S.opportunities, open = all.filter((o) => !o.closed_date);
  const lo = f.months[0] + "-01", hi = f.months[f.months.length - 1] + "-31";
  const closed = all.filter((o) => o.closed_date && o.closed_date >= lo && o.closed_date <= hi);
  const won = closed.filter((o) => o.stage_current === "CLOSED_WON");
  const created = all.filter((o) => o.created_date >= lo && o.created_date <= hi);
  const q = (d: string) => `${d.slice(0, 4)}-Q${Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1}`;
  const quarters = [...new Set(all.filter((o) => o.closed_date).map((o) => q(o.closed_date)))].sort();
  const grpOpen = (k: string) => [...groupBy(open, (o) => o[k] as string).entries()].map(([x, os]) => ({ name: String(x), value: sum(os.map((o) => o.value_usd)) / c.fx, prior: undefined, weight: sum(os.map((o) => o.value_usd * o.probability)) / c.fx })).sort((a, b) => b.value - a.value);
  const grpWin = (k: string, rows: any[]) => [...groupBy(rows, (o) => o[k] as string).entries()].map(([x, os]) => ({ name: String(x), value: os.filter((o) => o.stage_current === "CLOSED_WON").length / os.length, weight: os.length })).sort((a, b) => b.weight - a.weight);
  const monthsAll = MONTHS;
  const wonByMonth = monthsAll.map((m) => sum(all.filter((o) => o.stage_current === "CLOSED_WON" && o.closed_date?.startsWith(m)).map((o) => o.value_usd)) / c.fx);
  const tatByMonth = monthsAll.map((m) => mean(all.filter((o) => o.created_date.startsWith(m)).map((o) => o.quote_turnaround_hours)));
  const winQ = quarters.map((x) => { const os = all.filter((o) => o.closed_date && q(o.closed_date) === x); return os.length ? os.filter((o) => o.stage_current === "CLOSED_WON").length / os.length : null; });
  const nQ = quarters.map((x) => all.filter((o) => o.closed_date && q(o.closed_date) === x).length);
  const openV = sum(open.map((o) => o.value_usd)) / c.fx, wV = sum(open.map((o) => o.value_usd * o.probability)) / c.fx;
  const winRate = closed.length ? won.length / closed.length : null;
  const head: Record<string, AnalysisPayload["headline"]> = {
    open: { v: openV, fmt: "money", label: `Open pipeline at ${AS_OF}` }, weighted: { v: wV, fmt: "money", label: `Weighted pipeline at ${AS_OF}` },
    win: { v: winRate, fmt: "pct1", label: `Closed in ${f.label}` }, won: { v: sum(won.map((o) => o.value_usd)) / c.fx, fmt: "money", label: `Won in ${f.label}` },
    quote: { v: mean(created.map((o) => o.quote_turnaround_hours)), fmt: "dec1", label: `Hours, opportunities created in ${f.label}` }, loss: { v: closed.length - won.length, fmt: "num", label: `Lost in ${f.label}` },
  };
  const titles: Record<string, string> = { open: "Open pipeline", weighted: "Weighted pipeline", win: "Win rate", won: "Won value", quote: "Quote turnaround", loss: "Lost opportunities" };
  const trends: Trend[] = [
    { title: "Win rate by quarter closed", note: "Bars = closed opportunities (right axis).", x: quarters, fmt: "pct1", fmt2: "num", series: [{ name: "Win rate", data: winQ, type: "line" }, { name: "Closed opportunities", data: nQ, type: "bar", axis: 1 }] },
    { title: "Won value by month closed", x: monthsAll, fmt: "money", series: [{ name: "Won value", data: wonByMonth, type: "bar" }], bands: [{ from: f.months[0], to: f.months[f.months.length - 1], label: "Selected", tone: "current" }] },
    { title: "Average quote turnaround by month created", x: monthsAll, fmt: "dec1", series: [{ name: "Hours", data: tatByMonth, type: "line" }] },
  ];
  if (focus === "quote") trends.unshift(trends.pop()!);
  if (focus === "won") trends.unshift(trends.splice(1, 1)[0]);
  const lost = closed.filter((o) => o.stage_current === "CLOSED_LOST");
  const breakdowns: Breakdown[] = focus === "open" || focus === "weighted" ? [
    { title: "Open pipeline by stage", fmt: "money", weightLabel: "Weighted value", weightFmt: "money", rows: grpOpen("stage_current"), showShare: true },
    { title: "Open pipeline by lead source", fmt: "money", weightLabel: "Weighted value", weightFmt: "money", rows: grpOpen("lead_source"), showShare: true },
    { title: "Open pipeline by vertical", fmt: "money", weightLabel: "Weighted value", weightFmt: "money", rows: grpOpen("vertical"), showShare: true },
  ] : [
    { title: "Win rate by lead source (closed in period)", fmt: "pct1", weightLabel: "Closed", weightFmt: "num", rows: grpWin("lead_source", closed) },
    { title: "Win rate by opportunity type (closed in period)", fmt: "pct1", weightLabel: "Closed", weightFmt: "num", rows: grpWin("opportunity_type", closed) },
    { title: "Loss reasons (lost in period)", fmt: "num", showShare: true, rows: [...groupBy(lost, (o) => (o.loss_reason as string) ?? "UNSPECIFIED").entries()].map(([r, os]) => ({ name: r, value: os.length, share: os.length / Math.max(1, lost.length) })).sort((a, b) => (b.value as number) - (a.value as number)) },
  ];
  const insights = [`${open.length} open opportunities worth ${fv(openV, "money", c.cur)} (${fv(wV, "money", c.cur)} weighted by stage probability).`];
  if (winRate != null) insights.push(`${won.length} of ${closed.length} opportunities closed in the period were won (${pct(winRate)}).`);
  return {
    key: `sm:${focus}`, title: titles[focus] ?? "Sales pipeline", headline: head[focus],
    stats: [{ label: "Open pipeline", v: openV, fmt: "money" }, { label: "Weighted pipeline", v: wV, fmt: "money" }, { label: "Win rate (closed in period)", v: winRate, fmt: "pct1", note: `${closed.length} closed` }, { label: "Won value (period)", v: sum(won.map((o) => o.value_usd)) / c.fx, fmt: "money" }],
    trends, breakdowns, insights,
    unavailable: ["Opportunities are not linked to the business-unit filter.", "Open pipeline is a snapshot at the cut-off; pipeline history is not reconstructed.", "No sales targets exist in fact_kpi_target_period."],
    context: chips(c, { period: focus !== "open" && focus !== "weighted", bu: false, cur: true }),
  };
}

// ---------- Quality errors and corrective actions
function runQuality(c: Ctx, focus: string): AnalysisPayload {
  const S = getStore(), { f } = c;
  const okc = (id: string) => f.bu === "ALL" || S.clientById.get(id)!.business_unit === f.bu;
  const ms = new Set(f.months);
  const ev = S.evals.filter((e) => ms.has(e.month) && okc(e.client_id));
  const ids = new Set(ev.map((e) => e.evaluation_id));
  const errs = S.errors.filter((e) => ids.has(e.evaluation_id));
  const words = sum(ev.map((e) => e.sample_words));
  const perK = (es: any[]) => (sum(es.map((e) => e.critical_count + e.major_count + e.minor_count)) / Math.max(1, sum(es.map((e) => e.sample_words)))) * 1000;
  const open = ev.filter((e) => e.corrective_status === "OPEN" && e.corrective_action !== "NONE_REQUIRED");
  const monthly = MONTHS.map((m) => { const x = S.evals.filter((e) => e.month === m && okc(e.client_id)); return x.length ? perK(x) : null; });
  return {
    key: `qc:${focus}`, title: focus === "ca" ? "Open corrective actions" : "Errors per 1,000 words",
    headline: focus === "ca" ? { v: open.length, fmt: "num", label: f.label } : { v: ev.length ? perK(ev) : null, fmt: "dec1", label: f.label },
    stats: [{ label: "Errors per 1,000 words", v: ev.length ? perK(ev) : null, fmt: "dec1" }, { label: "Errors logged", v: errs.length, fmt: "num" }, { label: "Sampled words", v: words, fmt: "words" }, { label: "Open corrective actions", v: open.length, fmt: "num" }],
    trends: [{ title: "Errors per 1,000 sampled words by month", x: MONTHS, fmt: "dec1", series: [{ name: "Errors per 1,000 words", data: monthly, type: "line" }], bands: [{ from: f.months[0], to: f.months[f.months.length - 1], label: "Selected", tone: "current" }] }],
    breakdowns: [
      { title: "Errors by category", fmt: "num", showShare: true, rows: [...groupBy(errs, (e) => e.category as string).entries()].map(([k, es]) => ({ name: k, value: es.length, share: es.length / Math.max(1, errs.length) })).sort((a, b) => (b.value as number) - (a.value as number)) },
      { title: "Errors by severity", fmt: "num", showShare: true, rows: ["CRITICAL", "MAJOR", "MINOR"].map((s) => { const n = errs.filter((e) => e.severity === s).length; return { name: s, value: n, share: n / Math.max(1, errs.length) }; }) },
      { title: "Open corrective actions by type", fmt: "num", rows: [...groupBy(open, (e) => e.corrective_action as string).entries()].map(([k, es]) => ({ name: k.replace(/_/g, " "), value: es.length })).sort((a, b) => (b.value as number) - (a.value as number)) },
      { title: "Errors per 1,000 words by language pair", fmt: "dec1", weightLabel: "Evaluations", weightFmt: "num", rows: [...groupBy(ev, (e) => e.lp_id as string).entries()].map(([lp, es]) => ({ name: S.lpById.get(lp)!.pair_label as string, value: perK(es), weight: es.length })).sort((a, b) => (b.weight as number) - (a.weight as number)) },
    ],
    insights: [`${errs.length} errors across ${ev.length} evaluations (${fv(words, "words")} sampled words) in the period; ${open.length} corrective actions are still open.`],
    unavailable: ["No target exists for these measures in fact_kpi_target_period."],
    context: chips(c, { period: true, bu: true, cur: false }),
  };
}

// ---------- HR & Workforce
function runHr(c: Ctx, focus: string): AnalysisPayload {
  const S = getStore();
  const act = S.resources.filter((r) => r.is_active);
  const ends = MONTHS.map((m) => { const [y, mo] = m.split("-").map(Number); return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10); });
  const activeAt = (d: string) => S.resources.filter((r) => r.onboarded_date && r.onboarded_date <= d && (!r.termination_date || r.termination_date > d)).length;
  const grp = (rows: any[], k: string, val: (rs: any[]) => number | null, fmtV: Fmt, title: string, wl = "Resources") => ({ title, fmt: fmtV, weightLabel: wl, weightFmt: "num" as Fmt, rows: [...groupBy(rows, (r) => String(r[k])).entries()].map(([x, rs]) => ({ name: x.replace(/_/g, " "), value: val(rs), weight: rs.length })).sort((a, b) => b.weight - a.weight) });
  const onb = S.resources.filter((r) => r.onboarded_date).map((r) => ({ ...r, days: (Date.parse(r.onboarded_date) - Date.parse(r.application_date)) / 864e5, year: String(r.onboarded_date).slice(0, 4) }));
  const qb = [["Below 85", (q: number) => q < 85], ["85–90", (q: number) => q >= 85 && q < 90], ["90–95", (q: number) => q >= 90 && q < 95], ["95 and above", (q: number) => q >= 95]] as const;
  const focusHead: Record<string, AnalysisPayload["headline"]> = {
    active: { v: act.length, fmt: "num", label: `Active at ${AS_OF}` },
    quality: { v: mean(act.map((r) => r.quality_score)), fmt: "dec1", label: "Mean illustrative quality score, active resources" },
    onboard: { v: mean(onb.map((r) => r.days)), fmt: "dec1", label: "Mean days from application to onboarding" },
  };
  const bds: Breakdown[] = focus === "onboard"
    ? [grp(onb, "resource_type", (rs) => mean(rs.map((r) => r.days)), "dec1", "Onboarding days by resource type"), grp(onb, "year", (rs) => mean(rs.map((r) => r.days)), "dec1", "Onboarding days by year onboarded")]
    : focus === "quality"
      ? [grp(act, "resource_type", (rs) => mean(rs.map((r) => r.quality_score)), "dec1", "Mean quality by resource type"), { title: "Quality score distribution (active)", fmt: "num", showShare: true, rows: qb.map(([n, t]) => { const k = act.filter((r) => t(r.quality_score)).length; return { name: n, value: k, share: k / Math.max(1, act.length) }; }) }, grp(act, "region", (rs) => mean(rs.map((r) => r.quality_score)), "dec1", "Mean quality by region")]
      : [grp(act, "resource_type", (rs) => rs.length, "num", "Active resources by type"), grp(act, "region", (rs) => rs.length, "num", "Active resources by region"), grp(act, "primary_domain", (rs) => rs.length, "num", "Active resources by primary domain")];
  return {
    key: `hr:${focus}`, title: focus === "quality" ? "Resource quality" : focus === "onboard" ? "Onboarding time" : "Active resources", headline: focusHead[focus],
    stats: [{ label: "Active resources", v: act.length, fmt: "num" }, { label: "Mean quality (active)", v: mean(act.map((r) => r.quality_score)), fmt: "dec1" }, { label: "Mean onboarding days", v: mean(onb.map((r) => r.days)), fmt: "dec1" }],
    trends: focus === "active" ? [{ title: "Active resources at each month-end", note: "Derived from onboarding and termination dates.", x: MONTHS, fmt: "num", series: [{ name: "Active resources", data: ends.map(activeAt), type: "line" }] }] : [],
    breakdowns: bds,
    insights: [`${act.length} active resources at the cut-off.`, ...(focus === "quality" ? ["The quality score is a generated attribute of each resource, not an average of evaluations."] : [])],
    unavailable: [...(focus !== "active" ? ["No history is stored for this attribute, so there is no trend."] : []), "Not filtered by period or business unit; resources are not linked to business units.", "No workforce targets exist in fact_kpi_target_period."],
    context: chips(c, { period: false, bu: false, cur: false }),
  };
}

// ---------- Capacity & Demand
function runCapacity(c: Ctx, focus: string): AnalysisPayload {
  const S = getStore();
  const lpF = c.sp.get("lp") ?? "";
  const cap = S.capacity.filter((x) => !lpF || S.lpById.get(x.lp_id)!.pair_label === lpF);
  const weeks = [...new Set(S.capacity.map((x) => x.week_start as string))].sort();
  const fcW = weeks.filter((w) => S.capacity.find((x) => x.week_start === w)!.is_forecast);
  const next8 = new Set(fcW.slice(0, 8));
  const tot = weeks.map((w) => { const x = cap.filter((y) => y.week_start === w); return { w, d: sum(x.map((y) => y.demand_words)), s: sum(x.map((y) => y.supply_words)) }; });
  const pairs = S.lps.map((l) => { const x = S.capacity.filter((y) => y.lp_id === l.lp_id && next8.has(y.week_start)); const d = sum(x.map((y) => y.demand_words)), s = sum(x.map((y) => y.supply_words)); return { name: l.pair_label as string, tier: l.resource_tier as string, d, s, load: d / s, gap: Math.max(0, d - s) }; });
  const sh = pairs.filter((p) => p.load > 1);
  const byGap = [...sh].sort((a, b) => b.gap - a.gap), byLoad = [...sh].sort((a, b) => b.load - a.load);
  const n8 = tot.filter((t) => next8.has(t.w));
  const load8 = sum(n8.map((t) => t.d)) / sum(n8.map((t) => t.s));
  const tiers = [...groupBy(pairs, (p) => p.tier).entries()].map(([t, ps]) => ({ name: t, value: sum(ps.map((p) => p.d)) / sum(ps.map((p) => p.s)), weight: sum(ps.map((p) => p.d)) }));
  const head: Record<string, AnalysisPayload["headline"]> = {
    load: { v: load8, fmt: "pct", label: "Demand ÷ supply, next 8 forecast weeks" }, short: { v: sh.length, fmt: "num", label: "Language pairs above 100% load" },
    gap: { v: byLoad[0]?.gap ?? 0, fmt: "words", label: `Gap of the highest-load shortfall pair (${byLoad[0]?.name ?? "none"})` }, weeks: { v: fcW.length, fmt: "num", label: "Forecast weeks" },
  };
  const insights = [`Forecast load over the next 8 weeks is ${pct(load8)}; ${sh.length} language pairs exceed 100%.`];
  if (byGap[0]) insights.push(`Largest shortfall in words: ${byGap[0].name} (${fv(byGap[0].gap, "words")} words). Highest load: ${byLoad[0].name} (${pct(byLoad[0].load)}).`);
  if (focus === "gap" && byGap[0] && byLoad[0] && byGap[0].name !== byLoad[0].name) insights.push(`Note: the dashboard card shows the gap for the highest-load pair (${byLoad[0].name}, ${fv(byLoad[0].gap, "words")} words), not the largest gap in words (${byGap[0].name}).`);
  return {
    key: `cd:${focus}`, title: { load: "Forecast capacity load", short: "Language pairs with a shortfall", gap: "Capacity gap", weeks: "Capacity forecast window" }[focus] ?? "Capacity", headline: head[focus],
    stats: [{ label: "Load, next 8 weeks", v: load8, fmt: "pct1" }, { label: "Pairs with a shortfall", v: sh.length, fmt: "num" }, { label: "Total shortfall (words)", v: sum(sh.map((p) => p.gap)), fmt: "words" }, { label: "Largest gap in words", v: byGap[0]?.gap ?? 0, fmt: "words", note: byGap[0]?.name }],
    trends: [{ title: "Weekly demand, supply and load", note: `Forecast weeks start ${fcW[0]}.${lpF ? ` Filtered to ${lpF}.` : ""}`, x: tot.map((t) => t.w), fmt: "words", fmt2: "pct", series: [{ name: "Demand", data: tot.map((t) => t.d), type: "bar" }, { name: "Supply", data: tot.map((t) => t.s), type: "line" }, { name: "Load (right axis)", data: tot.map((t) => (t.s ? t.d / t.s : null)), type: "line", dashed: true, axis: 1 }], bands: [{ from: fcW[0], to: fcW[fcW.length - 1], label: "Forecast", tone: "prior" }] }],
    breakdowns: [
      { title: "Shortfall pairs by gap in words (next 8 weeks)", fmt: "words", weightLabel: "Load", weightFmt: "pct", rows: byGap.map((p) => ({ name: p.name, value: p.gap, weight: p.load })) },
      { title: "Load by language pair (next 8 weeks)", fmt: "pct", weightLabel: "Demand (words)", weightFmt: "words", rows: [...pairs].sort((a, b) => b.load - a.load).map((p) => ({ name: p.name, value: p.load, weight: p.d })) },
      { title: "Load by resource tier (next 8 weeks)", fmt: "pct", weightLabel: "Demand (words)", weightFmt: "words", rows: tiers },
    ],
    insights,
    unavailable: ["Uses a fixed 26-week window; the reporting period and business-unit filter do not apply.", "Forecast weeks are an illustrative scenario, not a statistical forecast."],
    context: chips(c, { period: false, bu: false, cur: false }, lpF ? [{ label: "Language pair", value: lpF, applied: true }] : []),
  };
}

// ---------- Technology & Integration
function runTech(c: Ctx, focus: string): AnalysisPayload {
  const S = getStore();
  const T = S.telemetry;
  const byC = groupBy(T, (t) => t.connector_id as string);
  const rows = S.connectors.map((cn) => { const t = byC.get(cn.connector_id) ?? []; const req = sum(t.map((x) => x.requests)); return { name: cn.connector_name as string, cat: cn.category as string, up: sum(t.map((x) => x.up_minutes)) / sum(t.map((x) => x.monitored_minutes)), err: sum(t.map((x) => x.errors_4xx + x.errors_5xx + x.errors_timeout)) / req, p95: mean(t.map((x) => x.p95_ms)), req }; });
  const days = [...new Set(T.map((t) => t.date as string))].sort();
  const daily = days.map((d) => { const x = T.filter((t) => t.date === d); return { up: sum(x.map((t) => t.up_minutes)) / sum(x.map((t) => t.monitored_minutes)), p95: mean(x.map((t) => t.p95_ms)), err: sum(x.map((t) => t.errors_4xx + t.errors_5xx + t.errors_timeout)) / Math.max(1, sum(x.map((t) => t.requests))) }; });
  const up = sum(T.map((t) => t.up_minutes)) / sum(T.map((t) => t.monitored_minutes));
  const err = sum(T.map((t) => t.errors_4xx + t.errors_5xx + t.errors_timeout)) / sum(T.map((t) => t.requests));
  const lat = mean(T.map((t) => t.p95_ms));
  const degraded = rows.filter((r) => isDegraded(r.up));
  const metric = focus === "err" ? { k: "err", f: "pct1" as Fmt, t: "Error rate" } : focus === "latency" ? { k: "p95", f: "num" as Fmt, t: "Mean p95 latency (ms)" } : { k: "up", f: "pct1" as Fmt, t: "Uptime" };
  const cats = [...groupBy(rows, (r) => r.cat).entries()].map(([k, rs]) => ({ name: k, value: mean(rs.map((r: any) => r[metric.k])), weight: rs.length }));
  return {
    key: `te:${focus}`, title: { uptime: "Connector uptime", err: "Connector error rate", latency: "Connector latency", degraded: "Degraded connectors" }[focus] ?? "Integration health",
    headline: focus === "err" ? { v: err, fmt: "pct1", label: "90 days, all connectors (simulated)" } : focus === "latency" ? { v: lat, fmt: "num", label: "ms, 90 days (simulated)" } : focus === "degraded" ? { v: degraded.length, fmt: "num", label: "Connectors below 99.5% uptime (simulated)" } : { v: up, fmt: "pct1", label: "90 days, all connectors (simulated)" },
    stats: [{ label: "Uptime", v: up, fmt: "pct1" }, { label: "Error rate", v: err, fmt: "pct1" }, { label: "Mean p95 latency (ms)", v: lat, fmt: "num" }, { label: "Degraded connectors", v: degraded.length, fmt: "num", note: `of ${rows.length}` }],
    trends: [{ title: focus === "latency" ? "Daily mean p95 latency (ms)" : focus === "err" ? "Daily error rate" : "Daily uptime", x: days, fmt: metric.f, series: [{ name: metric.t, data: daily.map((d) => (focus === "latency" ? d.p95 : focus === "err" ? d.err : d.up)), type: "line" }] }],
    breakdowns: [
      { title: `${metric.t} by connector`, fmt: metric.f, weightLabel: "Requests", weightFmt: "num", rows: rows.map((r: any) => ({ name: r.name, value: r[metric.k], weight: r.req, highlight: isDegraded(r.up) })).sort((a, b) => (metric.k === "up" ? (a.value as number) - (b.value as number) : (b.value as number) - (a.value as number))), note: "Highlighted rows are below 99.5% uptime (degraded)." },
      { title: `${metric.t} by connector category`, fmt: metric.f, weightLabel: "Connectors", weightFmt: "num", rows: cats, note: "Simple mean across the category's connectors." },
    ],
    insights: [`${degraded.length} of ${rows.length} simulated connectors are below 99.5% uptime over 90 days${degraded.length ? `: ${degraded.map((d) => d.name).join(", ")}` : ""}.`],
    unavailable: ["Telemetry is SIMULATED; no real systems are connected.", "Uses all 90 days of telemetry; the reporting period and business-unit filter do not apply."],
    context: chips(c, { period: false, bu: false, cur: false }),
  };
}

// ---------- Risk & Alerts
function runRisk(c: Ctx, focus: string): AnalysisPayload {
  const S = getStore();
  const open = S.alerts.filter((a) => a.status !== "RESOLVED");
  const grp = (rows: any[], k: string, title: string) => ({ title, fmt: "num" as Fmt, weightLabel: "Exposure (USD)", weightFmt: "money" as Fmt, rows: [...groupBy(rows, (a) => String(a[k])).entries()].map(([x, as]) => ({ name: x, value: as.length, weight: sum(as.map((a) => a.exposure_usd)) })).sort((a, b) => b.value - a.value) });
  const crit = open.filter((a) => a.severity === "CRITICAL" || a.severity === "HIGH");
  const exp = sum(open.map((a) => a.exposure_usd));
  return {
    key: `ra:${focus}`, title: { open: "Open alerts", crit: "Critical and high alerts", exposure: "Alert exposure", resolved: "Resolved alerts" }[focus] ?? "Alerts",
    headline: focus === "crit" ? { v: crit.length, fmt: "num", label: "Open alerts, critical or high" } : focus === "exposure" ? { v: exp, fmt: "money", label: "Indicative exposure of open alerts (USD)" } : focus === "resolved" ? { v: S.alerts.length - open.length, fmt: "num", label: "Resolved alerts" } : { v: open.length, fmt: "num", label: "Open or in-progress alerts" },
    stats: [{ label: "Open alerts", v: open.length, fmt: "num" }, { label: "Critical + high", v: crit.length, fmt: "num" }, { label: "Exposure (USD)", v: exp, fmt: "money" }, { label: "Resolved", v: S.alerts.length - open.length, fmt: "num" }],
    breakdowns: [grp(open, "rule_id", "Open alerts by rule"), grp(open, "severity", "Open alerts by severity"), grp(open, "domain", "Open alerts by domain"), grp(S.alerts, "status", "All alerts by status")],
    insights: (() => { const r = grp(open, "rule_id", "").rows; const top = [...r].sort((a, b) => b.weight - a.weight)[0]; return [`${open.length} alerts are open; ${crit.length} are critical or high.`, top ? `Rule ${top.name} carries the largest indicative exposure (${fv(top.weight, "money")}).` : ""].filter(Boolean); })(),
    unavailable: ["Alerts are a snapshot at the cut-off; no alert history is stored, so there is no trend.", "Exposure is always USD and is not additive across rules.", "Not filtered by period or business unit."],
    context: chips(c, { period: false, bu: false, cur: false }),
  };
}

// ---------- Data Governance
function runGov(c: Ctx, focus: string): AnalysisPayload {
  const S = getStore();
  const dq = S.dq;
  const man = manifest();
  const tables = Object.entries<any>(man.files).map(([t, v]) => ({ t, kind: t.startsWith("dim_") ? "Dimension" : t.startsWith("bridge_") ? "Bridge" : "Fact", rows: v.rows as number, kb: v.bytes / 1024 }));
  const failed = dq.filter((x) => !x.passed);
  return {
    key: `dg:${focus}`, title: "Data governance", headline: { v: dq.filter((x) => x.passed).length / dq.length, fmt: "pct1", label: `${dq.filter((x) => x.passed).length} of ${dq.length} validation checks passed` },
    stats: [{ label: "Checks passed", v: dq.filter((x) => x.passed).length / dq.length, fmt: "pct1" }, { label: "Tables", v: tables.length, fmt: "num" }, { label: "Rows", v: sum(tables.map((t) => t.rows)), fmt: "num" }, { label: "KPI definitions", v: S.kpiDefs.length, fmt: "num" }],
    breakdowns: [
      { title: "Checks by quality dimension", fmt: "pct1", weightLabel: "Checks", weightFmt: "num", rows: [...groupBy(dq, (x) => x.dimension as string).entries()].map(([d, cs]) => ({ name: d, value: cs.filter((x) => x.passed).length / cs.length, weight: cs.length })), note: "Value = pass rate." },
      { title: "Largest tables by rows", fmt: "num", weightLabel: "Size (KB)", weightFmt: "num", rows: [...tables].sort((a, b) => b.rows - a.rows).slice(0, 12).map((t) => ({ name: t.t, value: t.rows, weight: t.kb })) },
      { title: "Rows by table kind", fmt: "num", showShare: true, rows: [...groupBy(tables, (t) => t.kind).entries()].map(([k, ts]) => ({ name: k, value: sum(ts.map((t) => t.rows)), share: sum(ts.map((t) => t.rows)) / Math.max(1, sum(tables.map((t) => t.rows))) })) },
      { title: "KPI definitions by domain", fmt: "num", rows: [...groupBy(S.kpiDefs, (k) => k.domain as string).entries()].map(([d, ks]) => ({ name: d, value: ks.length })).sort((a, b) => (b.value as number) - (a.value as number)) },
    ],
    insights: [failed.length ? `${failed.length} validation checks failed.` : `All ${dq.length} validation checks passed for dataset ${man.dataset_version} (seed ${man.seed}).`],
    unavailable: ["Validation runs once per generated dataset; there is no history of earlier runs.", "Not affected by the dashboard filters."],
    context: chips(c, { period: false, bu: false, cur: false }),
  };
}

// ---------- dispatcher
const CUSTOM: Record<string, (c: Ctx, focus: string) => AnalysisPayload> = {
  NRR: (c) => runNrr(c), DSO: (c) => runDso(c), PM_UTIL: (c) => runPmUtil(c), "cr.health": (c) => runHealth(c), "tr.pipeline": (c) => runPipeline(c),
  "ex.okr": (c) => runOkr(c), sm: runSales, qc: runQuality, hr: runHr, cd: runCapacity, te: runTech, ra: runRisk, dg: runGov,
};
export const ANALYSIS_KEYS = [...Object.keys(CORE), "NRR", "DSO", "PM_UTIL", "cr.health", "tr.pipeline", "ex.okr",
  ...["open", "weighted", "win", "won", "quote", "loss"].map((x) => `sm:${x}`), "qc:perK", "qc:ca", "hr:active", "hr:quality", "hr:onboard",
  ...["load", "short", "gap", "weeks"].map((x) => `cd:${x}`), ...["uptime", "err", "latency", "degraded"].map((x) => `te:${x}`),
  ...["open", "crit", "exposure", "resolved"].map((x) => `ra:${x}`), "dg:checks"];

const cache = new Map<string, AnalysisPayload>();
// Results depend on the dataset, so every cache is dropped when the CSV files change or are reloaded.
onDataChange(() => { cache.clear(); monthlyCache.clear(); scopedMonthly.clear(); });
export function analysis(key: string, params: URLSearchParams): AnalysisPayload | null {
  if (!ANALYSIS_KEYS.includes(key)) return null;
  // Validate (and detect changed files) before any cache lookup, so a cached result never outlives a broken or updated dataset.
  getStore();
  const drillRaw = params.get("drill") ?? "";
  const sp: SP = Object.fromEntries(params.entries());
  const f = parseFilters(sp);
  const cacheKey = `${key}|${f.range}|${f.from}|${f.to}|${f.cur}|${f.bu}|${params.get("lp") ?? ""}|${drillRaw}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;
  const c: Ctx = { f, sp: params, fx: fxRate(f.cur), cur: f.cur };
  const [base, focus = ""] = key.split(":");
  let drill: Drill | undefined;
  if (drillRaw && CORE[key]) {
    const [dim, ...rest] = drillRaw.split(":"); const id = rest.join(":");
    if (!CORE[key].dims.includes(dim as Dim)) return null;
    const val = dimValues(dim as Dim, dim === "bu" ? "ALL" : f.bu).find((v) => v.id === id);
    if (!val) return null;
    drill = { dim: dim as Dim, id, name: val.name };
  }
  const out = CORE[key] ? runCore(key, c, drill) : CUSTOM[base](c, focus);
  out.insights = [...(out.insights ?? []).filter(Boolean), SYN];
  if (cache.size > 300) cache.delete(cache.keys().next().value!);
  cache.set(cacheKey, out);
  return out;
}
