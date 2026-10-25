/* Central registry of contextual explanations for KPIs, charts and tables.
 *
 * Two kinds of entries:
 *  - K(id): built from the KPI dictionary (public/data/dim_kpi_definition.csv), the same definitions the app and the
 *    independent Python reference use. Page-specific caveats are added where the page applies the KPI differently.
 *  - X(key): page-computed metrics and charts that are not in the dictionary. Each is written from the page code in
 *    app/(app)/<tab>/page.tsx or from the generator rules in scripts/, and labelled with that basis.
 * Where the dictionary and the app code disagree, the entry says so ("mismatch") rather than choosing one silently.
 */
import "server-only";
import { getStore, manifest, onDataChange } from "@/lib/data/store";
import type { InfoBasis, InfoContent } from "./types";
import { scenarioSettings } from "@/lib/kpi/core";

const CUT = "Measured at the data cut-off (30 Sep 2026); the reporting-period selector does not change it.";
const NO_BU = "Not filtered by business unit.";
const FXC = "Money is shown in the selected currency, converted once from USD totals at fixed illustrative rates.";
const OPEX_BU = "With a business unit selected, company operating expenses are allocated to it in proportion to its share of revenue.";
const ALL_MONTHS = "Shows all 33 months (2024-01 to 2026-09) regardless of the reporting period; the business-unit filter applies.";
const SIM = "Telemetry is SIMULATED: no real systems are connected.";
const SYN = "synthetic demo data";

const CODE: Record<string, string> = {
  NRR: "nrr() in lib/kpi/core.ts", GROSS_REV_CHURN: "nrr() in lib/kpi/core.ts", LOGO_RETENTION: "nrr() in lib/kpi/core.ts",
  DSO: "dso() in lib/kpi/core.ts", PM_UTIL: "pmUtil() in lib/kpi/core.ts",
  SCN_REVENUE: "lib/scenario.ts (SCN-F1.0)", SCN_GM: "lib/scenario.ts (SCN-F1.0)", SCN_EBITDA: "lib/scenario.ts (SCN-F1.0)", SCN_CAPGAP: "lib/scenario.ts (SCN-F1.0)",
};

type Extra = Partial<Omit<InfoContent, "caveats">> & { caveats?: string[]; code?: string };
const firstSentence = (s: string) => (s.match(/^.*?[.!?](\s|$)/)?.[0] ?? s).trim();
const blank = (s: unknown) => s == null || ["", "-", "n/a"].includes(String(s).trim());

function direction(d: string | null): string | undefined {
  if (!d) return undefined;
  if (d.startsWith("Higher (adoption)")) return "Higher means more adoption.";
  if (d.startsWith("Higher")) return "Higher is better.";
  if (d.startsWith("Lower")) return "Lower is better.";
  if (d.startsWith("Target band")) return "Best inside a target band, not as high or as low as possible.";
  return undefined;
}

/** KPI explanation from the KPI dictionary, with optional page-specific additions. */
export function K(id: string, x: Extra = {}): InfoContent {
  const d = getStore().kpiDefs.find((k) => k.kpi_id === id);
  if (!d) throw new Error(`Unknown KPI id ${id}`);
  const calc: string[] = [String(d.formula)];
  if (!blank(d.numerator) && !blank(d.denominator)) calc.push(`Numerator: ${d.numerator}. Denominator: ${d.denominator}.`);
  if (!blank(d.unit)) calc.push(`Unit: ${d.unit}.`);
  if (!blank(d.null_behavior)) calc.push(`When there is no data: ${d.null_behavior}.`);
  const dir = direction(d.target_direction);
  const tgt = blank(d.illustrative_target) ? "" : ` Illustrative demo target: ${d.illustrative_target} (not a real company target).`;
  const basis: InfoBasis = x.basis ?? { kind: "dictionary", text: `KPI dictionary ${id} · matches the app calculation` };
  return {
    title: d.kpi_name,
    summary: x.summary ?? firstSentence(String(d.definition)),
    meaning: x.meaning ?? String(d.definition),
    calculation: x.calculation ?? calc,
    interpretation: x.interpretation ?? (dir || tgt ? `${dir ?? ""}${tgt}`.trim() : undefined),
    comparison: x.comparison,
    source: x.source ?? `${d.source_fact} (${SYN}); calculated in ${x.code ?? CODE[id] ?? "core() in lib/kpi/core.ts"}.`,
    caveats: x.caveats,
    basis,
  };
}

const code = (file: string): InfoBasis => ({ kind: "code", text: `Not in the KPI dictionary · derived from ${file}` });
const mismatch = (text: string): InfoBasis => ({ kind: "mismatch", text });

function build(): Record<string, InfoContent> {
  const m = manifest();
  const A = m.config.assumptions, T = m.config.thresholds, surge = m.config.seeded_surge;
  const pg = (tab: string) => `app/(app)/${tab}/page.tsx`;
  const e: Record<string, InfoContent> = {};

  // ---------- Overview
  e["ov.revEbitda"] = {
    title: "Revenue and EBITDA by month", summary: "Monthly recognised revenue (bars) and EBITDA (line).",
    calculation: ["Revenue = sum of revenue_usd on revenue lines in the month.", "EBITDA = revenue − direct costs − operating expenses (OPEX allocated by revenue share when a business unit is selected)."],
    interpretation: "Bars show scale and seasonality; the line shows how much of each month's revenue is left after all operating costs.",
    source: `fact_revenue_line, fact_cost_line (${SYN}); monthlySeries() in lib/kpi/core.ts.`, caveats: [ALL_MONTHS, FXC], basis: code("monthlySeries() in lib/kpi/core.ts"),
  };
  e["ov.bySl"] = {
    title: "Revenue by service line", summary: "Recognised revenue in the selected period split by the six service lines.",
    meaning: "Service lines (translation, localization, alternative formats, OPI, VRI, on-site) are mutually exclusive revenue categories. Workflows such as MTPE are not service lines, so nothing is double counted.",
    calculation: ["Sum of revenue_usd grouped by service_line_id, for the selected months and business unit."],
    source: `fact_revenue_line (${SYN}); revBy() in lib/kpi/agg.ts.`, caveats: [FXC], basis: code(pg("overview")),
  };
  e["ov.alerts"] = {
    title: "Open alerts (top 8)", summary: "The eight most severe alerts that are not resolved, with the rule-based exposure estimate.",
    calculation: ["Alerts with status OPEN or IN_PROGRESS, in the dataset's order: severity (critical first), then exposure, largest first."],
    source: `fact_risk_alert (${SYN}), produced by documented rules in scripts/assemble.py.`,
    caveats: ["Not filtered by reporting period or business unit.", "Exposure is always in USD and is indicative only."], basis: code(pg("overview")),
  };

  // ---------- Executive Strategy
  e["ex.revVsPlan"] = {
    title: "Revenue vs plan", summary: "Recognised revenue as a percentage of the illustrative plan for the same months.",
    calculation: ["Attainment = REV ÷ sum of monthly REV plan targets in the period.", "With a business unit selected, the plan is scaled by that unit's share of company revenue in the period."],
    interpretation: "100% = exactly on plan; above 100% = ahead of plan.",
    source: `fact_revenue_line, fact_kpi_target_period (${SYN}); ${pg("executive-strategy")}.`,
    caveats: [
      "The plan is generated from the actuals themselves: a centred 5-month rolling average of monthly revenue × 1.03 (scripts/assemble.py). It is illustrative, not a real budget.",
      "KPI dictionary REV_VS_PLAN defines a variance (REV − plan) and shows N/A when a business unit is selected; this card shows actual ÷ plan and scales the plan instead.",
    ],
    basis: mismatch("Differs from KPI dictionary REV_VS_PLAN (see caveats)"),
  };
  e["ex.okrOnTrack"] = {
    title: "OKRs on track or complete", summary: "Share of the 14 key results whose status is ON_TRACK or COMPLETE.",
    calculation: [
      "Count of key results with status ON_TRACK or COMPLETE ÷ all key results.",
      "Progress = (current − baseline) ÷ (target − baseline), capped to 0–100%.",
      "Status (set by the generator): COMPLETE at 100% progress, ON_TRACK ≥ 70%, AT_RISK ≥ 40%, otherwise OFF_TRACK.",
    ],
    interpretation: "Higher is better.", source: `fact_okr (${SYN}); status rule in scripts/assemble.py (build_okrs).`,
    caveats: [CUT, NO_BU, "This is a count of statuses. KPI dictionary OKR_ATTAIN (mean progress) is a different measure and is shown in the OKR progress chart."],
    basis: code(`${pg("executive-strategy")} and scripts/assemble.py`),
  };
  e["ex.actualPlan"] = {
    title: "Monthly revenue: actual vs plan", summary: "Actual recognised revenue (bars) against the illustrative monthly plan (line).",
    calculation: ["Actual = monthly recognised revenue.", "Plan = centred 5-month rolling average of actual monthly revenue × 1.03, scaled by the business unit's revenue share when one is selected."],
    source: `fact_revenue_line, fact_kpi_target_period (${SYN}).`, caveats: [ALL_MONTHS, "Because the plan is derived from actuals, small gaps are expected by construction.", FXC],
    basis: code(`${pg("executive-strategy")} and scripts/assemble.py (build_targets)`),
  };
  e["ex.okrPillar"] = {
    title: "OKR progress by pillar", summary: "Average key-result progress for each strategic pillar.",
    calculation: ["Mean of progress over the key results in each pillar; progress = (current − baseline) ÷ (target − baseline), capped to 0–100%."],
    interpretation: "Higher is better; 100% means every key result in the pillar has reached its target.",
    source: `fact_okr (${SYN}).`, caveats: [CUT, NO_BU], basis: { kind: "dictionary", text: "Matches KPI dictionary OKR_ATTAIN, averaged per pillar" },
  };
  e["ex.scorecard"] = {
    title: "KPI scorecard", summary: "Six headline KPIs against their illustrative targets for the selected period.",
    calculation: [
      "Attainment = actual ÷ target.",
      "Revenue target = sum of monthly plan values; other targets = mean of the monthly targets (gross margin 40%, EBITDA margin 13%, on-time delivery 95%, on-demand fill rate 95%, quality score 92).",
      "Status: On target ≥ 100% of target, Near ≥ 97%, otherwise Behind.",
    ],
    source: `fact_kpi_target_period and the KPI layer (${SYN}).`,
    caveats: ["Targets are illustrative demo values, not company targets. The dictionary lists slightly different illustrative targets for some KPIs (for example gross margin ≥ 38%); this table uses fact_kpi_target_period."],
    basis: code(`${pg("executive-strategy")} and scripts/assemble.py (build_targets)`),
  };
  e["ex.okrTable"] = {
    title: "Objectives and key results", summary: "Each key result with its baseline, current value, target, progress and status.",
    calculation: ["Baseline = same period of the prior year or opening value; progress = (current − baseline) ÷ (target − baseline), capped to 0–100%.", "Status: COMPLETE at 100%, ON_TRACK ≥ 70%, AT_RISK ≥ 40%, otherwise OFF_TRACK."],
    source: `fact_okr (${SYN}); scripts/assemble.py (build_okrs).`, caveats: [CUT, NO_BU, "Money values are USD; ratios are shown as decimals (0.42 = 42%)."],
    basis: code("scripts/assemble.py (build_okrs)"),
  };

  // ---------- Client & Revenue
  e["cr.top10"] = { title: "Top 10 clients by revenue", summary: "The ten clients with the most recognised revenue in the selected period.", calculation: ["Sum of revenue_usd per client for the selected months and business unit; largest ten shown."], source: `fact_revenue_line, dim_client (${SYN}).`, caveats: ["Client names are fictional.", FXC], basis: code(pg("client-revenue")) };
  e["cr.tier"] = { title: "Revenue by tier", summary: "Recognised revenue in the period grouped by the client's tier.", calculation: ["Sum of revenue_usd grouped by dim_client.tier."], source: `fact_revenue_line, dim_client (${SYN}).`, caveats: [FXC], basis: code(pg("client-revenue")) };
  e["cr.vertical"] = { title: "Revenue by vertical", summary: "Recognised revenue in the period grouped by the client's industry vertical.", calculation: ["Sum of revenue_usd grouped by dim_client.vertical."], source: `fact_revenue_line, dim_client (${SYN}).`, caveats: [FXC], basis: code(pg("client-revenue")) };
  e["cr.health"] = K("HEALTH", {
    title: "Client health bands", summary: "Number of clients in each health band at the 2026-09 quarter-end snapshot.",
    calculation: ["Health = 0.30 on-time delivery (90 days) + 0.25 quality (normalised) + 0.20 payment timeliness + 0.25 revenue trend; weights are renormalised when a component has no data.", `Bands: healthy ≥ ${T.health_healthy}, watch ≥ ${T.health_watch}, otherwise at risk. Bars count clients per band.`],
    caveats: [CUT, "This chart counts all clients and is not filtered by business unit."], code: pg("client-revenue"),
  });
  e["cr.retention"] = K("GROSS_REV_CHURN", {
    title: "Retention detail", summary: "Gross revenue churn, logo retention and cohort size for the net revenue retention cohort.",
    calculation: [
      "Cohort = clients with revenue in the opening 12 months (2024-10 to 2025-09).",
      "Gross revenue churn = Σ max(0, opening − latest) ÷ Σ opening (expansion ignored).",
      "Logo retention = 1 − share of cohort clients with no revenue in the latest 12 months (2025-10 to 2026-09).",
    ],
    caveats: [CUT, "The business-unit filter narrows the cohort."],
    basis: mismatch("KPI dictionary GROSS_REV_CHURN / LOGO_RETENTION · window fixed at the cut-off, not the range end"),
  });
  e["cr.roster"] = { title: "Client roster", summary: "Every client in scope with period revenue, health score and status.", calculation: ["Revenue = recognised revenue in the selected period.", "Health and band = 2026-09 snapshot.", "Status = Churned when the client has a churn date, otherwise Active."], source: `dim_client, fact_revenue_line, fact_client_period_snapshot (${SYN}).`, caveats: ["Revenue column uses the selected currency.", "Optional URL filters: ?tier= and ?health=."], basis: code(pg("client-revenue")) };

  // ---------- Translation Ops
  e["tr.monthly"] = { title: "Words delivered and on-time rate by month", summary: "Delivered words (bars) and the share of batches delivered by their due date (line).", calculation: ["Words = sum of words_total for batches delivered in the month.", "On-time rate = batches with delivered_date ≤ due_date ÷ batches delivered in the month."], source: `fact_translation_batch (${SYN}).`, caveats: [ALL_MONTHS], basis: { kind: "dictionary", text: "Monthly view of KPI dictionary TR_WORDS and TR_OTD" } };
  e["tr.workflow"] = { title: "Workflow mix (words)", summary: "Delivered words in the period by workflow: human translation (HT), MT post-editing (MTPE) and AI-assisted review (AIR).", calculation: ["Sum of words_total of delivered batches, grouped by workflow_id."], interpretation: "A larger MTPE + AIR share means more AI-touched work.", source: `fact_translation_batch (${SYN}).`, caveats: ["Workflow is separate from service line, so MTPE words are not a revenue category and are never double counted."], basis: code(pg("translation-ops")) };
  e["tr.byPair"] = { title: "Performance by language pair", summary: "Delivered batches, words, on-time rate, turnaround and AI-touched share for each language pair.", calculation: ["Delivered batches in the period and business unit, grouped by language pair.", "On-time = delivered_date ≤ due_date; turnaround = mean days from start to delivery; AI-touched share = non-HT words ÷ all words."], source: `fact_translation_batch (${SYN}).`, basis: code(pg("translation-ops")) };
  e["tr.stage"] = { title: "Active pipeline by stage", summary: "Batches not yet delivered, counted by current production stage.", calculation: ["Count of batches with status other than DELIVERED, grouped by stage."], source: `fact_translation_batch (${SYN}).`, caveats: [CUT], basis: code(pg("translation-ops")) };
  e["tr.status"] = { title: "Pipeline status", summary: "Active batches classified as on track, at risk or overdue.", calculation: [`Overdue: due date before 30 Sep 2026.`, `At risk: due within ${T.sla_warning_days} days and under ${Math.round(T.sla_warning_progress * 100)}% complete.`, "Otherwise on track."], interpretation: "Overdue and at-risk batches need re-assignment or a revised delivery date.", source: `fact_translation_batch (${SYN}); thresholds in the dataset manifest.`, caveats: [CUT, "URL filters ?lp= and ?stage= narrow these counts."], basis: code(pg("translation-ops")) };
  e["tr.active"] = { title: "Active batches", summary: "Every batch not yet delivered, with progress and status.", calculation: ["Status uses the same rule as Pipeline status."], source: `fact_translation_batch, dim_client (${SYN}).`, caveats: [CUT], basis: code(pg("translation-ops")) };

  // ---------- Interpretation Ops
  e["in.modality"] = { title: "Fulfilled minutes by modality", summary: "Minutes of fulfilled sessions each month for phone (OPI), video (VRI) and on-site interpreting.", calculation: ["Sum of duration_min for sessions with status FULFILLED, by month and service line."], source: `fact_interpretation_session (${SYN}).`, caveats: [ALL_MONTHS, "The ?mod= URL filter limits it to one modality."], basis: { kind: "dictionary", text: "Monthly view of KPI dictionary INT_MIN" } };
  e["in.hour"] = { title: "Requests by hour of day", summary: "All interpretation requests in the period by hour requested.", calculation: ["Count of sessions (any status) by request_hour, 0–23."], source: `fact_interpretation_session (${SYN}).`, caveats: ["Hours are synthetic local time."], basis: code(pg("interpretation-ops")) };
  e["in.byPair"] = { title: "Language-pair performance", summary: "Requests, fulfilled minutes, fill rate and OPI speed to answer per language pair.", calculation: ["Fill rate = fulfilled ÷ (fulfilled + unfulfilled), all request types; cancellations and technical failures excluded.", "OPI ASA = mean connect_seconds of fulfilled on-demand OPI sessions."], source: `fact_interpretation_session (${SYN}).`, caveats: ["This fill rate covers scheduled and on-demand requests, unlike the On-demand fill rate card."], basis: code(pg("interpretation-ops")) };
  e["in.recent"] = { title: "Recent sessions", summary: "Up to 1,000 sessions from the selected period, newest first.", calculation: ["The last 1,000 matching rows; the dataset is stored in request-date order, so reversing them shows the newest first."], source: `fact_interpretation_session (${SYN}).`, caveats: ["Search and CSV export apply only to these 1,000 rows."], basis: code(pg("interpretation-ops")) };

  // ---------- Finance & Profitability
  e["fi.margin"] = { title: "Margin trend", summary: "Gross margin and EBITDA margin for each month.", calculation: ["Gross margin = (revenue − direct costs) ÷ revenue.", "EBITDA margin = (gross profit − OPEX) ÷ revenue."], source: `fact_revenue_line, fact_cost_line (${SYN}); monthlySeries().`, caveats: [ALL_MONTHS, OPEX_BU], basis: { kind: "dictionary", text: "Monthly view of KPI dictionary GM and EBITDA_M" } };
  e["fi.aging"] = { title: "Accounts receivable aging", summary: "Open invoice balances grouped by days past due at the cut-off.", calculation: ["Open balance = invoice amount − cash allocated from payments received by 30 Sep 2026; balances of $1 or less are excluded.", "Buckets by days past due date: not yet due, 1–30, 31–60, 61–90, 90+."], interpretation: "More value in the older buckets means slower collection and higher credit risk.", source: `fact_invoice_line, bridge_payment_invoice, fact_payment (${SYN}).`, caveats: [CUT, FXC], basis: code(pg("finance-profitability")) };
  e["fi.pnl"] = { title: "Profit and loss bridge", summary: "From revenue to EBITDA for the period, with each cost category and its share of revenue.", calculation: ["Direct costs: vendor linguists, interpreter pay, MT/AI tooling, platform/telecom, PM and dispatch labour.", "OPEX: sales and marketing, technology and product, general and admin.", "Gross profit = revenue − direct costs; EBITDA = gross profit − OPEX."], source: `fact_revenue_line, fact_cost_line (${SYN}).`, caveats: [OPEX_BU, "Depreciation, amortisation, interest and tax are out of scope.", FXC], basis: { kind: "dictionary", text: "Matches KPI dictionary DIRECT_COST, GP, OPEX, EBITDA" } };
  e["fi.bySl"] = { title: "Margin by service line", summary: "Revenue, direct cost and gross margin for each service line in the period.", calculation: ["Gross margin = (revenue − direct cost) ÷ revenue for each service line."], source: `fact_revenue_line (${SYN}).`, caveats: [FXC], basis: code(pg("finance-profitability")) };
  e["fi.arClient"] = { title: "Open receivables by client", summary: "Open and overdue invoice balances per client at the cut-off.", calculation: ["Open = invoiced − cash allocated by 30 Sep 2026 (balances over $1).", "Overdue = open amount on invoices with a due date before 30 Sep 2026."], source: `fact_invoice_line, bridge_payment_invoice, fact_payment (${SYN}).`, caveats: [CUT, FXC], basis: code(pg("finance-profitability")) };

  // ---------- AI & Automation
  const assumptions = `Assumptions: human baseline ${A.baseline_words_per_hour} words/hour, review cost $${A.review_hourly_cost_usd}/hour, full post-edit ${A.full_postedit_words_per_hour} w/h, light review ${A.light_review_words_per_hour} w/h, tooling $${A.tooling_cost_per_ai_word_usd} per AI word.`;
  e["ai.shareTrend"] = { title: "AI-touched share of delivered words", summary: "Monthly share of delivered words produced with MTPE or AI-assisted review.", calculation: ["Words in workflows MTPE or AIR ÷ all delivered words in the month."], interpretation: "Noisy month to month; read the trend by quarter.", source: `fact_translation_batch (${SYN}).`, caveats: [ALL_MONTHS], basis: { kind: "dictionary", text: "Monthly view of KPI dictionary AI_SHARE" } };
  e["ai.savings"] = { title: "Estimated savings by month", summary: "Estimated net cost impact of AI-touched batches, by delivery month.", calculation: ["Sum of est_cost_saved_usd = hours saved × review hourly cost − tooling cost.", "Hours saved = words ÷ baseline words per hour − words ÷ observed words per hour.", assumptions], source: `fact_ai_workflow_batch (${SYN}).`, caveats: ["An assumption-driven estimate, not a measured saving.", ALL_MONTHS, FXC], basis: { kind: "dictionary", text: "Monthly view of KPI dictionary AI_COST_SAVED" } };
  e["ai.engine"] = { title: "By engine category", summary: "AI-touched batches grouped by generic engine category, with quality and savings indicators.", calculation: ["Avg QE score and edit distance are word-weighted means.", "Accepted = words with segment QE ≥ 0.85 ÷ words."], source: `fact_ai_workflow_batch (${SYN}).`, caveats: ["Engine categories are generic and synthetic, not vendors.", "Quality uses QE score and edit distance only; BLEU and COMET are not used."], basis: code(pg("ai-automation")) };
  e["ai.assumptions"] = { title: "Assumptions behind the savings estimate", summary: "The fixed inputs that drive every hours-saved and cost-saved figure on this tab.", calculation: [assumptions, `QE acceptance threshold ${T.mtqe_accept_threshold}.`], source: "assumptions.* in public/data/meta_config.csv.", caveats: ["Changing any assumption changes the estimates proportionally; they are not editable in this demo."], basis: code("public/data/meta_config.csv") };
  e["ai.batches"] = { title: "Largest estimated savings", summary: "The 500 AI-touched batches with the highest estimated cost saving in the period.", calculation: ["Sorted by est_cost_saved_usd, top 500."], source: `fact_ai_workflow_batch (${SYN}).`, caveats: ["Savings are estimates from the documented assumptions.", FXC], basis: code(pg("ai-automation")) };

  // ---------- Forecasting & Scenarios
  const scnBase = "Baseline = trailing 12 months to 2026-09, all business units.";
  const SC = scenarioSettings();
  const pp = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(0)}`;
  const presetText = Object.entries(SC.presets).filter(([k]) => k !== "BASELINE").map(([k, p]) => `${k.charAt(0) + k.slice(1).toLowerCase()} = ${pp(p.ai_adoption_delta)} pp AI, ${pp(p.price_adjustment)}% price, ${pp(p.vendor_inflation)}% vendor cost, ${pp(p.volume_growth)}% volume`).join(". ");
  const rates = SC.trajectories.map((t) => `${(t.rate * 100).toFixed(0)}% (${t.name.toLowerCase()})`).join(", ");
  e["sc.drivers"] = { title: "Scenario drivers", summary: "Four what-if inputs applied to the trailing-12-month baseline.", calculation: [
    "AI adoption change: added to the baseline AI-touched share (clamped to 0–100%); AI words cost less vendor time but add tooling cost.",
    "Price change: revenue × (1 + price).", "Vendor cost inflation: applied to vendor linguist cost and interpreter pay.",
    `Volume growth: scales words and revenue; PM labour moves at ${SC.params.pmElasticity}× and OPEX at ${SC.params.opexElasticity}× of volume.`,
    `Presets (fact_scenario_assumption_set.csv): ${presetText}.`,
  ], source: "lib/scenario.ts (formula version SCN-F1.0); presets in fact_scenario_assumption_set.csv; elasticities in meta_config.csv.", caveats: ["Runs in the browser only; nothing is saved.", "Illustrative scenario ranges, not statistical forecasts."], basis: code("lib/scenario.ts") };
  e["sc.revenue"] = K("SCN_REVENUE", { title: "Scenario revenue (12 months)", calculation: ["Revenue′ = baseline revenue × (1 + volume growth) × (1 + price change).", scnBase], comparison: "Compared with the baseline preset (all drivers at zero).", caveats: [FXC] });
  e["sc.gm"] = K("SCN_GM", { title: "Scenario gross margin", calculation: [
    "Gross profit′ = revenue′ − vendor − tooling − interpreter pay − platform − labour, where:",
    "vendor = words′ × ((1 − a) × human cost/word + a × AI cost/word) × (1 + inflation); tooling = words′ × a × tooling/word;",
    "interpreter pay × (1 + volume) × (1 + inflation); platform × (1 + volume); labour × (1 + 0.6 × volume). a = AI share.",
    "Gross margin′ = gross profit′ ÷ revenue′.", scnBase,
  ], comparison: "Change vs the baseline preset in percentage points." });
  e["sc.ebitda"] = K("SCN_EBITDA", { title: "Scenario EBITDA", calculation: ["EBITDA′ = gross profit′ − OPEX × (1 + 0.25 × volume growth).", "The card shows EBITDA′ and its difference from the baseline.", scnBase], comparison: "Difference from the baseline preset, which reproduces trailing-12-month EBITDA exactly.", caveats: [FXC] });
  e["sc.em"] = { title: "Scenario EBITDA margin", summary: "Scenario EBITDA as a share of scenario revenue.", calculation: ["EBITDA margin′ = EBITDA′ ÷ revenue′."], comparison: "Change vs the baseline preset in percentage points.", interpretation: "Higher is better.", source: "lib/scenario.ts (SCN-F1.0).", basis: code("lib/scenario.ts") };
  e["sc.ai"] = { title: "Scenario AI-touched word share", summary: "AI-touched share of written words after the AI adoption change.", calculation: ["a = baseline AI share + AI adoption change, clamped to 0–100%.", "Baseline share = MTPE + AIR words ÷ all written words on trailing-12-month revenue lines."], source: "lib/scenario.ts and scenarioBaseline() in lib/kpi/core.ts.", caveats: ["The baseline is from revenue lines, so it can differ slightly from the AI-touched share on the AI tab, which uses delivered batches."], basis: code("lib/scenario.ts") };
  e["sc.gap"] = K("SCN_CAPGAP", { title: "Scenario capacity gap (words/yr)", calculation: [`Required = words′ × ((1 − a) + ${SC.params.effort} × a): AI words need ${Math.round(SC.params.effort * 100)}% of human effort.`, "Supply = 52 × average weekly actual linguist supply.", "Gap = required − supply; positive = shortfall."], interpretation: "Positive means demand exceeds human capacity; negative means spare capacity." });
  e["sc.bars"] = { title: "Baseline vs scenario", summary: "Revenue, direct costs, gross profit, OPEX and EBITDA for the baseline and the current scenario.", calculation: ["Both bars come from the SCN-F1.0 formulas; the baseline uses all drivers at zero."], source: "lib/scenario.ts.", caveats: [FXC], basis: code("lib/scenario.ts") };
  e["sc.traj"] = K("FORECAST_RANGE", { title: "Revenue trajectory ranges", summary: `Monthly revenue for the next 12 months if the trailing-12-month average grows at ${rates} a year.`, calculation: [`Month n = average monthly TTM revenue × (1 + annual rate)^(n ÷ 12), for rates ${rates}.`], caveats: ["Illustrative ranges from fixed growth rates, not predictions or confidence intervals.", FXC], basis: code("forecasting-scenarios/ScenarioClient.tsx (growth rates from meta_config.csv)") });

  // ---------- Sales & Marketing
  const salesBu = "Not filtered by business unit (opportunities are not linked to the unit filter).";
  e["sm.open"] = K("PIPE_UNW", { title: "Open pipeline", caveats: [CUT, salesBu, FXC], basis: mismatch("KPI dictionary PIPE_UNW · app measures at the cut-off, not the range end") });
  e["sm.weighted"] = K("PIPE_W", { title: "Weighted pipeline", caveats: [CUT, "Probabilities are a configured stage table, not a predictive model.", salesBu, FXC], basis: mismatch("KPI dictionary PIPE_W · app measures at the cut-off, not the range end") });
  e["sm.win"] = K("WIN_RATE_COUNT", { calculation: ["Won ÷ (won + lost) for opportunities with a close date in the selected period.", "When there are no closed deals: N/A."], caveats: [salesBu], code: pg("sales-marketing") });
  e["sm.won"] = { title: "Won value", summary: "Total estimated annual contract value of opportunities won in the period.", calculation: ["Sum of value_usd for opportunities with stage CLOSED_WON and a close date in the selected period."], interpretation: "Higher is better.", source: `fact_opportunity (${SYN}).`, caveats: ["value_usd is an estimated annual contract value, not recognised revenue.", salesBu, FXC], basis: code(pg("sales-marketing")) };
  e["sm.quote"] = K("QUOTE_TAT", { calculation: ["Mean quote_turnaround_hours for opportunities created in the selected period."], caveats: [salesBu], code: pg("sales-marketing") });
  e["sm.funnel"] = { title: "Conversion funnel", summary: "Of the opportunities created in the period, how many reached each stage.", calculation: ["Distinct opportunities created in the period with a stage event for LEAD, QUALIFIED, PROPOSAL, NEGOTIATION and CLOSED_WON."], source: `fact_opportunity, fact_opportunity_stage_event (${SYN}).`, caveats: ["Recent opportunities may still be progressing, so later stages are understated for recent periods.", salesBu], basis: code(pg("sales-marketing")) };
  e["sm.source"] = { title: "Win rate by lead source", summary: "Win rate of opportunities closed in the period, by lead source.", calculation: ["Won ÷ all closed (won + lost) for each lead source."], source: `fact_opportunity (${SYN}).`, caveats: ["Small groups can swing widely.", salesBu], basis: code(pg("sales-marketing")) };
  e["sm.loss"] = { title: "Loss reasons", summary: "Opportunities lost in the period, counted by recorded loss reason.", calculation: ["Count of CLOSED_LOST opportunities with a close date in the period, by loss_reason."], source: `fact_opportunity (${SYN}).`, caveats: [salesBu], basis: code(pg("sales-marketing")) };
  e["sm.table"] = { title: "Opportunities", summary: "Every opportunity in the dataset with stage, value, probability and dates.", source: `fact_opportunity (${SYN}).`, caveats: ["Not filtered by the reporting period or business unit; use ?stage= to filter.", "Prospect names are fictional."], basis: code(pg("sales-marketing")) };

  // ---------- Quality & Compliance
  e["qc.perK"] = { title: "Errors per 1,000 words", summary: "Logged errors per 1,000 sampled words across evaluations in the period.", calculation: ["(critical + major + minor error counts) ÷ sampled words × 1,000.", "Counts are not severity-weighted (the quality score applies the weights)."], interpretation: "Lower is better.", source: `fact_quality_evaluation (${SYN}).`, basis: code(pg("quality-compliance")) };
  e["qc.ca"] = { title: "Open corrective actions", summary: "Evaluations in the period with a corrective action that is still open.", calculation: ["Count of evaluations with corrective_status OPEN and corrective_action other than NONE_REQUIRED."], interpretation: "Lower is better.", source: `fact_quality_evaluation (${SYN}).`, basis: code(pg("quality-compliance")) };
  e["qc.monthly"] = { title: "Average quality score by month", summary: "Mean evaluation score each month on the illustrative 0–100 scale.", calculation: ["Mean of score per month; score = max(0, 100 − (minor × 1 + major × 5 + critical × 25) × 1,000 ÷ sampled words)."], source: `fact_quality_evaluation (${SYN}).`, caveats: [ALL_MONTHS, "Axis starts at 85 to show variation."], basis: { kind: "dictionary", text: "Monthly view of KPI dictionary QUALITY_SCORE" } };
  e["qc.errors"] = { title: "Errors by category and severity", summary: "Errors logged in the period's evaluations by category, stacked by severity.", calculation: [`Count of error records by category and severity. Weights in the score: minor ${T.quality_penalty_minor}, major ${T.quality_penalty_major}, critical ${T.quality_penalty_critical} points per 1,000 words.`, `Pass = score ≥ ${T.quality_pass_score} and no critical errors.`], source: `fact_quality_error, fact_quality_evaluation (${SYN}).`, caveats: ["Illustrative MQM-style framework, not an official certification."], basis: code(pg("quality-compliance")) };
  e["qc.table"] = { title: "Evaluations", summary: "The 500 most recent evaluations in the period, with error counts, outcome, disputes and corrective actions.", source: `fact_quality_evaluation (${SYN}).`, caveats: ["Linguists appear only as anonymised codes.", "?dsev=OPEN shows only open disputes."], basis: code(pg("quality-compliance")) };

  // ---------- HR & Workforce
  e["hr.active"] = K("TALENT_POOL", { title: "Active resources", caveats: [CUT, NO_BU] });
  e["hr.quality"] = { title: "Average quality score (active resources)", summary: "Mean of the illustrative quality attribute held on each active linguist and interpreter record.", calculation: ["Mean of dim_resource.quality_score over active resources."], interpretation: "Higher is better.", source: `dim_resource (${SYN}).`, caveats: ["This is a generated attribute (normal distribution around 93 for internal and 91 for freelance resources), not an average of quality evaluations.", CUT, NO_BU], basis: code(`${pg("hr-workforce")} and scripts/generate_synthetic_data.py`) };
  e["hr.onboard"] = K("ONBOARD_DAYS", { calculation: ["Mean of (onboarded_date − application_date) in days over all resources with an onboarded date."], caveats: ["Not limited to the trailing 12 months as the dictionary describes, and not affected by the reporting period.", NO_BU], basis: mismatch("KPI dictionary ONBOARD_DAYS · app averages all onboarded resources") });
  e["hr.pmUtil"] = K("PM_UTIL", { caveats: ["The card colours a fall as favourable, but the dictionary treats utilisation as a target band (70–90%).", NO_BU] });
  e["hr.types"] = { title: "Active resources by type", summary: "Active linguists and interpreters, internal and freelance.", calculation: ["Count of active resources grouped by resource_type."], source: `dim_resource (${SYN}).`, caveats: [CUT], basis: code(pg("hr-workforce")) };
  e["hr.scatter"] = { title: "Quality score vs availability", summary: "Each dot is an active resource: illustrative quality score against typical availability.", calculation: ["x = availability (share of capacity typically free); y = quality_score."], source: `dim_resource (${SYN}).`, caveats: ["Both are generated attributes; linguist availability is derived from the supply each language pair needs; interpreter availability is random between 30% and 80%."], basis: code(`${pg("hr-workforce")} and scripts/generate_synthetic_data.py`) };
  e["hr.pm"] = { title: "Project manager workload", summary: "Allocated versus available hours for each project manager in the period.", calculation: ["Allocated = project PM hours spread evenly from start to due date, counted for days inside the period.", "Capacity = weekly capacity hours × days employed in the period ÷ 7. Utilisation = allocated ÷ capacity."], interpretation: `Above ${Math.round(T.pm_util_warning * 100)}% signals overload.`, source: `fact_project, dim_owner (${SYN}).`, caveats: ["The window ends on the 28th of the last month, so totals differ slightly from the PM utilisation card."], basis: code(pg("hr-workforce")) };
  e["hr.roster"] = { title: "Resource roster", summary: "All linguists and interpreters with anonymised codes and fictional attributes.", source: `dim_resource (${SYN}).`, caveats: ["No personal data. Rates are in USD per word or per minute.", "?rt= filters by resource type."], basis: code(pg("hr-workforce")) };

  // ---------- Capacity & Demand
  const capWin = "Uses a fixed 26-week window (13 actual weeks to 21 Sep 2026, then 13 forecast weeks from 28 Sep 2026); ignores the reporting period and business unit.";
  const fcMethod = `Forecast demand = average of the last 8 actual weeks × seasonality × small weekly growth × random noise; ${surge.language_codes.join(", ")} carry a seeded +${Math.round(surge.uplift * 100)}% surge in some weeks. Supply = linguist capacity × availability.`;
  e["cd.load"] = K("CAP_LOAD", { title: "Forecast load, next 8 weeks", calculation: ["Σ demand words ÷ Σ supply words over the first 8 forecast weeks, all language pairs (or the ?lp= pair)."], caveats: [capWin, fcMethod] });
  e["cd.short"] = { title: "Pairs with a shortfall", summary: "Language pairs whose demand exceeds supply over the next 8 forecast weeks.", calculation: ["Count of pairs with demand ÷ supply > 100% over the first 8 forecast weeks."], interpretation: "Lower is better.", source: `fact_capacity_period (${SYN}).`, caveats: ["Uses a 100% threshold. KPI dictionary CONSTRAINED_LP counts pairs above 90% (shown as Tight in the table).", capWin], basis: code(pg("capacity-demand")) };
  e["cd.gap"] = { title: "Largest gap (words, 8 weeks)", summary: "Shortfall in words for the shortfall pair with the highest load.", calculation: ["Pairs are ranked by load (demand ÷ supply); the card shows max(0, demand − supply) for the first shortfall pair."], interpretation: "Lower is better.", source: `fact_capacity_period (${SYN}).`, caveats: ["Needs confirmation: despite the label, this is the gap of the highest-load pair, which is not necessarily the largest gap in words. Check the table's Gap column.", capWin], basis: { kind: "unverified", text: "Label may not match the calculation · needs confirmation" } };
  e["cd.weeks"] = { title: "Forecast weeks", summary: "Number of weekly forecast periods after the data cut-off.", calculation: ["Count of distinct weeks flagged is_forecast."], source: `fact_capacity_period (${SYN}).`, basis: code(pg("capacity-demand")) };
  e["cd.weekly"] = { title: "Weekly demand vs supply", summary: "Demand (bars; faded = forecast) against linguist supply (line), in words.", calculation: ["Actual weeks: demand = words in batches that started that week.", fcMethod], source: `fact_capacity_period (${SYN}).`, caveats: ["Actual demand is lumpy; forecast weeks are smoothed.", "An illustrative scenario, not a statistical forecast.", capWin], basis: code(`${pg("capacity-demand")} and scripts/generate_synthetic_data.py`) };
  e["cd.heat"] = { title: "Load heatmap", summary: "Demand ÷ supply for every language pair and week.", calculation: ["Cell = demand_words ÷ supply_words for one pair-week. Colour scale from 0.4 to 1.6."], interpretation: "Above 1.0 (orange to red) means demand exceeds supply that week.", source: `fact_capacity_period (${SYN}).`, caveats: [capWin], basis: code(pg("capacity-demand")) };
  e["cd.table"] = K("CAP_LOAD", { title: "Next 8 weeks by language pair", summary: "Demand, supply, load and gap per language pair over the first 8 forecast weeks.", calculation: ["Load = Σ demand ÷ Σ supply; gap = max(0, demand − supply).", `Status: Shortfall above 100%, Tight above ${Math.round(T.capacity_load_warning * 100)}%, otherwise OK.`], caveats: [capWin] });

  // ---------- Technology & Integration
  e["te.uptime"] = K("CONN_UPTIME", { title: "Overall uptime (90 days)", caveats: [SIM, "Covers all 90 days of telemetry; ignores the reporting period and business unit."] });
  e["te.err"] = K("SYNC_ERR", { title: "Error rate", caveats: [SIM] });
  e["te.latency"] = K("LATENCY_P95", { title: "Average p95 latency", calculation: ["Simple mean of daily p95_ms across all connector-days."], caveats: [SIM, "The dictionary defines a request-weighted mean; the app uses an unweighted mean."], basis: mismatch("KPI dictionary LATENCY_P95 · app uses an unweighted mean") });
  e["te.degraded"] = { title: "Degraded connectors", summary: `Simulated connectors whose 90-day uptime is below ${(T.uptime_warning * 100).toFixed(1)}%.`, calculation: [`Count of connectors with Σ up minutes ÷ Σ monitored minutes < ${T.uptime_warning}.`], interpretation: "Lower is better.", source: `fact_integration_telemetry (${SYN}).`, caveats: [SIM, "The R-CONN alert rule uses the last 7 days instead, so the two counts can differ."], basis: code(pg("technology-integration")) };
  e["te.daily"] = { title: "Daily uptime", summary: "Up minutes ÷ monitored minutes across all simulated connectors, per day.", source: `fact_integration_telemetry (${SYN}).`, caveats: [SIM, "Axis starts at 99%."], basis: { kind: "dictionary", text: "Daily view of KPI dictionary CONN_UPTIME" } };
  e["te.mix"] = { title: "Error mix", summary: "Simulated errors over 90 days by type: 4xx client, 5xx server and timeouts.", source: `fact_integration_telemetry (${SYN}).`, caveats: [SIM], basis: code(pg("technology-integration")) };
  e["te.table"] = { title: "Connector health", summary: "Uptime, requests, error rate, records and latency for each simulated connector.", calculation: [`Status: Degraded when 90-day uptime < ${T.uptime_warning}, otherwise Healthy.`, "p95 and p99 are simple means of daily values."], source: `dim_connector, fact_integration_telemetry (${SYN}).`, caveats: [SIM, "Endpoints use the reserved .invalid domain and are never contacted."], basis: code(pg("technology-integration")) };

  // ---------- Risk & Alerts
  const ruleList = "Rules: R-SLA (overdue or at-risk batches), R-HEALTH (clients at risk), R-CAP (8-week capacity load above 90%), R-DISP (open disputes), R-CA (corrective actions open over 45 days), R-FX (EUR/GBP receivables), R-AR60 (receivables over 60 days past due), R-CONN (7-day connector uptime).";
  const alertCave = ["Not filtered by reporting period or business unit.", "Alert status (open, in progress, resolved) is assigned at random by the generator for demonstration."];
  e["ra.open"] = K("ALERTS_OPEN", { calculation: ["Count of alerts with status OPEN or IN_PROGRESS."], caveats: [...alertCave, "Acknowledging an alert in the table below is local to your browser tab and does not change this count."], code: pg("risk-alerts") });
  e["ra.crit"] = { title: "Critical + high alerts", summary: "Open alerts with severity CRITICAL or HIGH.", calculation: ["Count of open alerts with severity CRITICAL or HIGH. Severity is set by each rule (for example, an overdue batch worth over $1,500 is CRITICAL)."], interpretation: "Lower is better.", source: `fact_risk_alert (${SYN}); scripts/assemble.py (build_alerts).`, caveats: alertCave, basis: code(`${pg("risk-alerts")} and scripts/assemble.py`) };
  e["ra.exposure"] = { title: "Exposure (USD, indicative)", summary: "Sum of the rule-based exposure estimates on open alerts.", calculation: ["Σ exposure_usd over open alerts. Each rule estimates exposure differently: batch revenue (R-SLA), client TTM revenue (R-HEALTH), shortfall words × revenue per word (R-CAP), batch revenue (R-DISP), overdue amount (R-AR60), 10% of foreign-currency receivables (R-FX); R-CA and R-CONN carry no exposure."], interpretation: "Lower is better.", source: `fact_risk_alert (${SYN}); scripts/assemble.py (build_alerts).`, caveats: ["Exposures overlap and are not additive across rules; indicative only.", "Always USD; the currency selector does not apply.", ...alertCave], basis: code("scripts/assemble.py (build_alerts)") };
  e["ra.resolved"] = { title: "Resolved alerts", summary: "Alerts marked RESOLVED in the dataset.", calculation: ["All alerts − open alerts."], source: `fact_risk_alert (${SYN}).`, caveats: alertCave, basis: code(pg("risk-alerts")) };
  e["ra.domain"] = { title: "Open alerts by domain and severity", summary: "Open alerts counted by business domain, stacked by severity.", calculation: [ruleList], source: `fact_risk_alert (${SYN}).`, caveats: alertCave, basis: code(`${pg("risk-alerts")} and scripts/assemble.py`) };
  e["ra.matrix"] = { title: "Risk matrix", summary: "Open alerts placed by likelihood (rows) and impact (columns) on a 1–5 scale.", calculation: ["Cell = number of open alerts with that likelihood and impact."], source: `fact_risk_alert (${SYN}).`, caveats: ["Likelihood and impact are drawn at random within a band set by severity (for example CRITICAL: likelihood 4–5). They are illustrative, not assessed scores.", ...alertCave], basis: code("scripts/assemble.py (build_alerts)") };
  e["ra.table"] = { title: "Alert list", summary: "Every alert with severity, rule, exposure, owner and recommended action. Select a row to see the rule that raised it.", calculation: [ruleList], source: `fact_risk_alert (${SYN}).`, caveats: ["Acknowledgements are kept in this browser tab only and are lost on refresh.", ...alertCave], basis: code("scripts/assemble.py (build_alerts)") };

  // ---------- Data Governance
  e["dg.checks"] = K("SCHEMA_VALID", { title: "Validation checks passed" });
  e["dg.tables"] = { title: "Tables", summary: "Number of data files in the generated dataset.", calculation: ["Count of data tables defined in meta_tables.csv and loaded from CSV (dimensions, facts and bridges)."], source: "public/data/meta_tables.csv and the loader report.", basis: code(pg("data-governance")) };
  e["dg.rows"] = { title: "Rows (all tables)", summary: "Total valid rows across all data tables.", calculation: ["Σ rows loaded from each CSV after validation."], source: "public/data/*.csv (loader report).", basis: code(pg("data-governance")) };
  e["dg.kpis"] = { title: "KPI definitions", summary: "Number of KPIs defined in the KPI dictionary.", calculation: ["Count of rows in dim_kpi_definition."], source: "dim_kpi_definition, generated from scripts/kpi_catalog.py.", basis: code(pg("data-governance")) };
  e["dg.size"] = { title: "Dataset size", summary: "Total size of the data CSV files.", calculation: ["Σ file bytes ÷ 1,048,576 (MB), metadata files excluded."], source: "public/data/*.csv (loader report).", basis: code(pg("data-governance")) };
  e["dg.dims"] = { title: "Validation pass rate by dimension", summary: "Share of generator checks passed, by quality dimension.", calculation: ["Passed checks ÷ checks for completeness, uniqueness, validity, consistency, integrity and reconciliation."], source: "fact_data_quality_check (checks run by the data generator; see scripts/validate.py).", basis: { kind: "dictionary", text: "KPI dictionary SCHEMA_VALID, by dimension" } };
  e["dg.prov"] = { title: "Dataset provenance", summary: "Version, seed, data window and FX basis of the dataset behind every number.", source: "public/data/meta_dataset.csv.", caveats: ["Regenerating with the same seed reproduces identical files (verified by test)."], basis: code(pg("data-governance")) };
  e["dg.inventory"] = { title: "Table inventory", summary: "Each CSV table with kind, row count, size and SHA-256 prefix, as loaded.", source: "public/data/*.csv (computed by the loader on each load).", basis: code(pg("data-governance")) };
  e["dg.dict"] = { title: "KPI dictionary", summary: "The single written definition of each KPI, used by the app and the independent Python test reference.", source: "dim_kpi_definition (from scripts/kpi_catalog.py); full detail in docs/kpi-definitions.md.", caveats: ["?dom= filters by domain."], basis: code(pg("data-governance")) };

  return e;
}

let cache: Record<string, InfoContent> | null = null;
onDataChange(() => { cache = null; });
/** Page-specific explanation by key (see build()). */
export function X(key: string): InfoContent {
  getStore(); // detects changed files (clearing this cache) and refuses invalid data before serving cached text
  cache ??= build();
  const v = cache[key];
  if (!v) throw new Error(`Unknown info key ${key}`);
  return v;
}

/** Explanation for the DEMO / SYNTHETIC DATA badge, using the dataset manifest. */
export function demoInfo(): InfoContent {
  const m = manifest();
  return {
    title: "Synthetic demo data",
    summary: "Every client, linguist, amount and event in this app is fictional and generated for an interview demonstration.",
    calculation: [`Generated by scripts/generate_synthetic_data.py with fixed seed ${m.seed}; dataset ${m.dataset_version}, window ${m.first_month} to ${m.last_month}, cut-off ${m.as_of}.`],
    caveats: ["No real company, client or employee data is represented, and no figure is a real result or target.", String(m.disclaimer)],
    source: "public/data/meta_dataset.csv.",
    basis: code("public/data/meta_dataset.csv"),
  };
}
