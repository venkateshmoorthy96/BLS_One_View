# BLS OneView - Requirements

> Interview demonstration of an enterprise BI and predictive-analytics experience for a language services provider.
> **All data is synthetic.** No BIG Language Solutions (BLS) system, client, vendor, financial result or technology is represented or connected.

## 1. Purpose and audience

- **Immediate audience:** the interview panel, judging product thinking, KPI literacy, data modelling, secure engineering and an honest executive narrative.
- **Imagined users:** executives (CEO/COO/CFO), sales and account leaders, translation and interpretation operations leaders, quality and vendor managers, data/systems architects.
- **Goal:** show one connected view in which operational drivers (volume, AI workflow mix, capacity, quality) explain commercial and financial outcomes (revenue, margin, retention) and forecasts.

## 2. Truthfulness rules (apply to every page)

1. Synthetic data only; fictional client names, project names, anonymised resource IDs, simulated connector names.
2. A persistent `DEMO / SYNTHETIC DATA` badge in the shell plus page-level disclosure where relevant.
3. Forecasts, AI savings, telemetry, risks and scenario outputs are labelled *illustrative* or *simulated*.
4. No claim of connected systems, live FX, certifications, verified benchmarks or audited results.
5. Votes, alert acknowledgements and feedback are browser-local and are not persisted or sent to a server.

## 3. Scope - 18 tabs

Every tab with data has an "i" explanation on each KPI, chart and table, and an Expand analysis view on most cards (see `docs/architecture.md` section 5). The table below lists what each tab actually shows.

| # | Route | Tab | Priority | Depth delivered |
|---|---|---|---|---|
| 1 | `/overview` | Overview | Must | 10 KPI cards (revenue, gross and EBITDA margin, active clients, NRR, on-time delivery, OPI speed to answer, AI share, quality score, DSO); monthly revenue and EBITDA; revenue by service line; top 8 open alerts |
| 2 | `/executive-strategy` | Executive Strategy | Must | Revenue vs plan, gross margin, EBITDA, OKRs on track; monthly actual vs plan; OKR progress by pillar; KPI scorecard against targets; OKR table |
| 3 | `/client-revenue` | Client & Revenue | Must | 5 KPIs incl. NRR and top-10 concentration; top 10 clients, revenue by tier and vertical; health bands; retention detail; client roster (`?tier=`, `?health=`) |
| 4 | `/translation-ops` | Translation Operations | Must | 5 KPIs (words, on-time, turnaround, TM reuse, rejection); monthly words and on-time rate; workflow mix; performance by language pair; active pipeline by stage and SLA status; active batch table (`?lp=`, `?stage=`) |
| 5 | `/interpretation-ops` | Interpretation Operations | Must | 5 KPIs (minutes, OPI speed to answer, on-demand fill, VRI connection, session length); minutes by modality; requests by hour; language-pair performance; latest 1,000 sessions (`?mod=`) |
| 6 | `/finance-profitability` | Finance & Profitability | Must | 5 KPIs incl. DSO; margin trend; AR aging; P&L bridge from revenue to EBITDA; margin by service line; open receivables by client |
| 7 | `/ai-automation` | AI & Automation | Must | 5 KPIs (AI share, MTQE acceptance, edit distance, hours and cost saved); AI share trend; savings by month; results by engine category; assumptions panel; top 500 batches by saving |
| 8 | `/forecasting-scenarios` | Forecasting & Scenarios | Must | Presets and four sliders with reset; six scenario result cards with line-by-line detail; baseline vs scenario bars; revenue trajectory ranges |
| 9 | `/sales-marketing` | Sales & Marketing | Should | 5 KPIs (open and weighted pipeline, win rate, won value, quote turnaround); conversion funnel; win rate by lead source; loss reasons; opportunities table (`?stage=`) |
| 10 | `/quality-compliance` | Quality & Compliance | Should | 5 KPIs (quality score, pass rate, errors per 1,000 words, open disputes, open corrective actions); monthly score; errors by category and severity; latest 500 evaluations (`?dsev=`) |
| 11 | `/hr-workforce` | HR & Workforce | Should | 4 KPIs (active resources, quality, onboarding days, PM utilisation); resources by type; quality vs availability scatter; PM workload; anonymised roster (`?rt=`) |
| 12 | `/capacity-demand` | Capacity & Demand | Should | 4 KPIs (8-week load, shortfall pairs, gap, forecast weeks); weekly demand vs supply; load heatmap by pair and week; next-8-weeks table (`?lp=`) |
| 13 | `/technology-integration` | Technology & Integration | Should | 4 simulated KPIs (uptime, error rate, p95 latency, degraded connectors); daily uptime; error mix; connector health table |
| 14 | `/risk-alerts` | Risk & Alerts | Should | 4 KPIs; open alerts by domain and severity; likelihood x impact matrix; alert list with rule detail, severity filter and local acknowledge (`?sev=`) |
| 15 | `/data-governance` | Data Governance | Should | 5 KPIs from the generator's validation checks and the loader; pass rate by dimension; provenance; live CSV inventory with reload and downloads; KPI dictionary (`?dom=`) |
| 16 | `/enhancement` | Enhancement | Concept | Roadmap cards with category filter and local upvote toggle |
| 17 | `/coming-soon` | Coming Soon | Concept | Six "not built" concept cards |
| 18 | `/feedback` | Feedback | Concept | Local-only form (category, rating, comment) and fictional sample feedback |

Not built (items from earlier plans): service-line cross-filter on chart click, treemap, radar, Sankey, sunburst, gauges, record drawers and dossiers, MQL vs CAC chart, QE threshold slider, alert timeline.

## 4. Functional requirements (traceability to BRD)

| BRD | Requirement | Where implemented |
|---|---|---|
| FR-01, FR-02 | Grouped navigation, URL-synced active tab, shell with badge and global controls | `components/Sidebar.tsx`, `components/FilterBar.tsx`, `app/(app)/layout.tsx` |
| FR-03, FR-04 | Deterministic offline generator; bundled CSV dataset validated on load; no runtime database | `scripts/generate_synthetic_data.py`, `public/data/`, `lib/data/` |
| FR-05 | ECharts, responsive, readable labels | `components/EChart.tsx` |
| FR-06, FR-08 | Filters and drill-downs only where documented | URL search-param contract (see architecture); drill-down in Expand analysis (`lib/analysis/engine.ts`) |
| FR-07, FR-13 | Search, sort, paginate (10/25/50), CSV of filtered rows | `components/DataTable.tsx` |
| FR-09 | Scenario inputs recalculate documented formulas | `lib/scenario.ts`, `app/(app)/forecasting-scenarios/` |
| FR-10 | Local-only votes, acknowledgements, feedback | client components with explicit notices |
| FR-11, FR-12 | Username/password only; server-side validation; signed expiring cookie; logout | `lib/auth/*`, `proxy.ts`, `app/login/page.tsx` |
| FR-14 | Empty / error / no-result states | `app/(app)/error.tsx`, `app/(app)/loading.tsx`, `components/DataUnavailable.tsx`, table "No rows" state |
| - | Metric explanations and expanded analysis | `components/InfoTip.tsx`, `lib/info/`, `components/ExpandAnalysis.tsx`, `app/api/analysis/route.ts` |

## 5. Non-functional requirements and how they are verified

See `docs/test-plan.md`. Performance targets (FCP < 1.2 s, interaction < 150 ms, first-load JS < 250 kB gzipped) are **measured and reported, not promised**.

## 6. Assumptions and demo defaults (decision log)

| ID | Decision | Default | Reason |
|---|---|---|---|
| D-01 | Reporting currency | USD base; fixed EUR 1.08 / GBP 1.27 USD per unit, version `DEMO-FX-2026-09` | Avoids inconsistent totals and any live-FX claim |
| D-02 | Session length | 8 hours, signed cookie, `HttpOnly`, `SameSite=Lax`, `Secure` in production | Covers an interview day; short enough to expire |
| D-03 | Date granularity | Whole calendar months; "latest month" replaces BRD's "trailing 30 days" | Revenue is recognised monthly; keeps every tab reconcilable |
| D-04 | Data period | 2024-01 to 2026-09 (33 months), as-of 2026-09-30 | Gives YoY, cohort and multi-year views |
| D-05 | Business units | Fictional `UNIT_ALPHA / UNIT_BETA / UNIT_GAMMA` | Shows a multi-unit view without claiming BLS's structure |
| D-06 | Quality framework | One illustrative MQM-style 0-100 score | Avoids mixing frameworks |
| D-07 | Connectors | Generic simulated labels on the reserved `.invalid` domain | No implied integrations |
| D-08 | Scale | Demo scale (low millions USD over 33 months) | Keeps the CSV files small; amounts are not representative of any real company |
| D-09 | Tables | Server-fed rows capped (e.g. latest 1,000 sessions) and filtered/sorted/paged in the browser | Keeps payloads small while supporting search/sort/CSV |
| D-10 | Scenario ranges | Preset min/max scenarios, labelled illustrative | No statistical method is implemented, so no confidence-interval claim |
| D-11 | Alerts | Produced by documented rules over generated facts | Keeps the risk tab consistent with the data |
| D-12 | Costs | USD-denominated; revenue, invoices and payments carry original currency | FX exposure concerns receivables, not cost |

## 7. Out of scope

Live connection to any BLS system; SSO/RBAC/multi-tenant identity; durable feedback/vote storage; live FX or telemetry; trained ML models; compliance certification claims; full geographic maps.

## 8. Limitations (stated in the UI and the interview guide)

- The model is built from public information about the language-services industry and assumed definitions, not BLS data.
- Absolute amounts are demo-scale; relationships (margin structure, seasonality, AI adoption) are plausible but invented.
- A single shared demo login is not enterprise identity management.
