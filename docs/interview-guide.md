# Interview guide: how to explain BLS OneView

All numbers below come from the generated dataset (seed 20261029). They are synthetic, so say "in the demo data" every time.

## 1. The 30-second pitch
"I built a working prototype of a single place where a language services business can see revenue, delivery, quality, finance, AI impact and risk together. It has 18 tabs, a fully synthetic 33-month dataset I generated and validated myself, and every KPI has one written definition used by both the app and an independent test implementation. It is a demonstration of how I would structure the real thing, not a claim about your actual numbers."

## 2. Who it is for and why
| Audience | Question they ask | Tabs |
|---|---|---|
| Executives | Are we on plan, and where is the risk? | Overview, Executive Strategy, Risk & Alerts |
| Sales and account managers | Which clients and deals matter? | Client & Revenue, Sales & Marketing |
| Operations (translation, interpretation, vendor management) | Are we delivering on time with enough capacity? | Translation Ops, Interpretation Ops, Capacity & Demand, Quality & Compliance, HR & Workforce |
| Finance | Are we making money and getting paid? | Finance & Profitability, Forecasting & Scenarios |
| Product, data and IT | Is AI paying off, are the data and integrations trustworthy? | AI & Automation, Technology & Integration, Data Governance |
| Concept tabs | Where could this go? | Enhancement, Coming Soon, Feedback |

## 3. Architecture in one minute
1. **Python generator** (`scripts/`): fixed seed, 36 tables, built bottom-up so everything reconciles (revenue lines equal batch words and session minutes; costs come from assignments; capacity history equals batch starts; alerts come from rules). 864 automated checks.
2. **CSV files** in `public/data/` (about 6 MB, 36 tables plus a CSV data dictionary). Every file is validated on load against the dictionary (types, keys, references); invalid data blocks the dashboards instead of producing wrong numbers. No runtime database.
3. **Next.js 16 server components** load the validated CSV data, compute KPIs from URL filters, and send only aggregates to the browser. Charts use Apache ECharts.
4. **Auth**: server-side login, SHA-256 digest comparison, HMAC-signed 8-hour cookie (HttpOnly, SameSite, Secure in production), checked in `proxy.ts` and again in the layout.
5. **Tests**: 28 Vitest tests. 16 check the TS KPI code against a separate pandas implementation; 12 check the CSV parser and that broken data is refused. Six Python tests cover the generator, including byte-identical regeneration.
6. **Explainability**: every KPI, chart and table has an "i" explanation (definition, formula, source, caveats) taken from the same KPI dictionary. Where the app's calculation differs from the dictionary, the explanation says so. Cards also open an **Expand analysis** view with prior-period change, target vs actual, a 33-month trend, segment breakdowns with drill-down and generated insights.

## 4. Ten-minute demo script
1. **Login (30 s)**: point to the DEMO / SYNTHETIC DATA badge. "That stays on every screen on purpose."
2. **Overview (1.5 min)**: YTD revenue $1.07M, +24.6% vs the same months last year; gross margin 42.1%; EBITDA margin 14.8%; 53 active clients; NRR 110.9%; on-time delivery 93.8%; AI-touched share 44%. Change the range to *Trailing 12 months* and the currency to EUR: "Filters live in the URL, so any view can be shared." Hover the "i" on Revenue to show the definition, then open Expand analysis on it and drill into a business unit.
3. **Client & Revenue (1 min)**: top-10 clients are 55% of revenue, which is a concentration risk. Health bands: score is 30% on-time, 25% quality, 20% payment timeliness, 25% revenue trend.
4. **Translation Ops (1 min)**: on-time by language pair, active pipeline with overdue and at-risk rules stated on the page.
5. **Interpretation Ops (45 s)**: OPI speed to answer 38 s; on-demand fill rate 95.9%; requests by hour.
6. **Finance & Profitability (1 min)**: P&L from revenue to EBITDA, AR aging, DSO 42.6 days. "Revenue, invoices, cash and receivables are separate measures."
7. **AI & Automation (1 min)**: AI-touched share rose from 15% in 2024 Q1 to 44% in 2026 Q3 (noisy month to month, clear by quarter); estimated saving $74.9K YTD, but "these are assumption-driven estimates, listed beside the numbers". Quality uses QE score and edit distance only.
8. **Forecasting & Scenarios (1.5 min)**: pick *Optimistic*: EBITDA rises from $192K to $315K, margin 14% to 20%. Pick *Conservative*: EBITDA falls to $94K. "These are illustrative scenario ranges from a documented formula, not statistical forecasts. The baseline preset reproduces trailing-12-month EBITDA exactly, and a test proves it."
9. **Capacity & Demand (45 s)**: heatmap of demand/supply for 20 language pairs; 10 pairs exceed 100% load over the next 8 weeks, worst EN>UR (190%), EN>DE (176%) and EN>HI (139%).
10. **Risk & Alerts (45 s)**: 40 alerts (39 not resolved), each stating its rule; acknowledge one and note it is local to the browser tab.
11. **Data Governance (30 s)**: 864/864 checks, dataset version, seed, KPI dictionary of 81 definitions.

## 5. Key design decisions (and why)
| Decision | Reason |
|---|---|
| Synthetic data with a fixed seed | No confidential data; reproducible demo; byte-identical regeneration tested |
| Service line separate from workflow (HT / MTPE / AIR) | Prevents double counting MTPE as both a service and a method |
| Revenue ≠ invoices ≠ cash ≠ AR | Finance people spot confusion between these immediately |
| FX converted once on aggregated totals | Avoids rounding drift across thousands of lines |
| Month-granular date ranges | Keeps every number reconcilable to monthly revenue and cost |
| Independent KPI implementation in Python | Catches formula bugs a single codebase would hide |
| "Illustrative scenario ranges", never "confidence intervals" | No statistical model was fitted, so no such claim is made |
| No BLEU or COMET | Not comparable across engines and languages; QE score and edit distance are used instead |
| Server-side auth with signed cookie | Credentials never reach the client; password only in environment config |

## 6. Likely questions and honest answers
- **Is this real data?** No. All clients, linguists and amounts are fictional and the app says so on every screen.
- **How would you connect real systems?** Replace the CSV data source with read-only queries from a warehouse fed by the TMS, telephony platform, CRM and ERP. The KPI layer and the data dictionary are the contract; the Technology tab shows the monitoring shape (simulated connectors).
- **How do you know the numbers are right?** Reconciliation checks in the generator (864), 16 tests where the TypeScript results must match a separate pandas implementation to within 1e-9 relative, and a loader that refuses to calculate from a CSV that fails validation.
- **What if a CSV is wrong?** Every file is checked against the data dictionary on load. A bad file replaces the dashboards with a list of the problems, so no number is calculated from bad data.
- **Why is margin about 42%?** It is a calibration choice (target 38–42%) to look like a typical services business, not a benchmark.
- **How are the AI savings calculated?** Hours saved per batch = words ÷ 380 (human baseline words/hour) minus words ÷ the observed post-edit throughput; cost saved = hours × $32/hour minus tooling at $0.004 per AI word; all assumptions are shown on the AI tab and exported in the manifest.
- **What is NRR here?** A fixed opening cohort: revenue from clients active in months e-23..e-12, compared with their revenue in the latest 12 months. 110.9% in the demo data.
- **What would you do next?** Statistical forecasting with backtests, role-based views, saved scenarios and alerts, and real connectors with row-level security.

## 7. Limitations to state before you are asked
- One shared demo login; not production-grade identity (no MFA, no rate limiting, no per-user audit).
- Some measures differ slightly from their dictionary definition (for example NRR and DSO are fixed at the cut-off, and the "Largest gap" capacity card shows the gap of the highest-load pair). The "i" explanations flag each of these.
- Page-specific filters are typed into the URL; clicking a chart does not filter the page.
- Data is small (about $3.3M revenue over 33 months) because it ships as CSV files; absolute amounts are not representative.
- Actual-week capacity demand is lumpy (it equals words in batches started that week); forecast weeks are smoothed with a seeded surge in AM, SO, HT, VI and ZH.
- Interactions on concept tabs (votes, feedback, alert acknowledgement) are local to the browser tab and not saved.
- The deployment to GitHub and Vercel was not performed by me and has not been verified.
- Accessibility was designed for (labels, keyboard, table alternatives) but not formally audited.
