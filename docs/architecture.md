# BLS OneView - Architecture

## 1. Overview

```
scripts/generate_synthetic_data.py  --(deterministic, seed 20261029)-->  public/data/*.csv  (36 tables + meta_tables, meta_fields, meta_dataset, meta_config)
                                                                         data/generated/kpi_reference.json, validation_report.json (test/report artifacts)
                                                                              |
Next.js 16 (App Router, server components)
   |  lib/data/source.ts   DataSource interface; CsvDirectorySource reads DATA_DIR (default public/data)
   |  lib/data/csv.ts      RFC 4180 parser (quotes, embedded commas/newlines, "" escapes, BOM)
   |  lib/data/loader.ts   types and validates every file against meta_fields/meta_tables: header, types, nulls, enums,
   |                       ranges, dates, primary keys (incl. composite), foreign keys, empty tables; builds a DataReport
   |  lib/data/store.ts    process-wide cache, change detection (1 s), reloadData(), app consistency checks
   |                       (calendar, cut-off, FX rates for every currency, required config); refuses invalid data
   |  lib/kpi/*.ts         shared KPI functions (core() with optional segment scope, nrr, dso, pmUtil), rules.ts thresholds
   |  lib/analysis/*.ts    Expand analysis payloads built on the same KPI functions (served by /api/analysis)
   |  lib/info/*.ts        metric explanations shown by the "i" buttons (from the KPI dictionary or the page code)
   |  app/(app)/*          server components compute props from URL search params
   |  app/api/*            /api/analysis (Expand analysis), /api/data (validation report and reload)
   |  components/*         client components: ECharts wrapper, DataTable, filters, info and expand views, scenario UI
   v
Browser: receives only the aggregates/rows each page needs
```

- **CSV is the current source, not a requirement.** Calculations and UI depend only on `getStore()`; a database or API adapter can implement `DataSource` (or replace the loader) without UI changes.
- **Fail closed.** If any file is missing, malformed or inconsistent, the layout shows "Dataset unavailable" with every problem, the analysis API returns 503, and no KPI is calculated from partial data. `GET /api/data` returns the validation report; `POST /api/data` forces a reload (also available as the **Reload data** button on Data Governance and on the "Dataset unavailable" screen).
- **No runtime database.** CSV is read by server code only; it is not part of the client bundle. The files in `public/data` are behind the login proxy, so they can be downloaded only after signing in.
- **Server-side Next.js code is still used** for authentication and for computing KPIs, so the browser never receives the full fact tables.
- **Caches.** The dataset, the derived store, the info registry and the analysis results are cached in memory per server process. They are cleared when the CSV files change (checked at most once a second) or on reload.

## 2. Filter contract (URL search params)

Global: `range` (`ytd|qtd|ttm|l6m|l3m|latest|all|custom`), `from`, `to` (`yyyy-mm`, custom range only), `cur` (`USD|EUR|GBP`), `bu` (`ALL|UNIT_ALPHA|UNIT_BETA|UNIT_GAMMA`). Invalid values fall back to the defaults (YTD, USD, all units). The sidebar keeps the global parameters when you switch tabs, and **Reset** clears every parameter.

Page filters, typed into the URL (they are not set by chart clicks):

| Tab | Parameter | Effect |
|---|---|---|
| Client & Revenue | `tier`, `health` | Filter the client roster |
| Translation Ops | `lp` (pair label, e.g. `EN>ES`), `stage` | Filter the active-batch table and the status counts |
| Interpretation Ops | `mod` (`OPI|VRI|ONSITE`) | Limit charts and tables to one modality |
| Sales & Marketing | `stage` | Filter the opportunities table |
| Quality & Compliance | `dsev` (e.g. `OPEN`) | Filter evaluations by dispute status |
| HR & Workforce | `rt` (resource type) | Filter the roster |
| Capacity & Demand | `lp` | Limit the weekly chart and its Expand analysis to one pair |
| Risk & Alerts | `sev` | Initial severity filter of the alert list |
| Data Governance | `dom` | Filter the KPI dictionary by domain |

Because filters live in the URL, deep links, refresh and back/forward work, and all KPI cards, charts and tables on a page are computed from the same filter context. That is what makes revenue reconcile across tabs.

Several tabs deliberately ignore some global filters; each one says so in its info text and in the Expand analysis "Not applicable" chips: Capacity & Demand (fixed 26-week window), Technology & Integration (fixed 90 days), Risk & Alerts and Data Governance (snapshots), Forecasting & Scenarios (always trailing 12 months, all units), and Sales & Marketing and HR & Workforce (not linked to business units).

## 3. KPI layer

`lib/filters.ts` resolves the URL filters (month range, prior comparison window, currency, BU). `lib/kpi/core.ts` (plus `lib/scenario.ts`) implements the KPI formulas defined in `docs/kpi-definitions.md`. `core(months, bu, scope?)` returns every period KPI at once; the optional `scope` (service line, language pair, workflow, client, tier, vertical, engine) is used by drill-downs, so a segment is computed with exactly the same formula as the headline.

Unit tests compare the TypeScript results (computed from the CSV files) with `data/generated/kpi_reference.json`, which Python computes independently from the same facts. Thresholds used by business rules (SLA, uptime, capacity, PM utilisation, QE acceptance, health bands) are read from `meta_config.csv` through `lib/kpi/rules.ts`; FX rates from `dim_fx_rate.csv`; scenario presets from `fact_scenario_assumption_set.csv`.

Prior-period comparison (`priorMonths`): Year to date compares with the same months of the previous year; other ranges compare with the equal-length window immediately before; there is no comparison for All data or when that window would start before 2024-01.

Some measures are fixed at the 2026-09-30 cut-off regardless of the range: NRR, DSO, open pipeline, active resources, client health bands, the active translation pipeline and alerts.

## 4. Authentication and session

- Single shared demo account. Username `Demo_project_for_interview` (configurable via `DEMO_USERNAME`). Password only from the environment (`DEMO_PASSWORD`); never committed. `SESSION_SECRET` (at least 32 characters) signs cookies; sign-in is disabled if any of the three is missing.
- Login is a **server action**: credentials are compared server-side as SHA-256 digests with a constant-time comparison, and both fields are always checked so timing does not reveal which was wrong. The error text is generic. There is no rate limiting or lockout, and attempts are not logged.
- Session token = `base64url(payload).base64url(HMAC-SHA256)`; payload `{sub, iat, exp}`; 8-hour expiry; cookie `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production. Tokens are stateless, so signing out deletes the cookie but does not revoke a copied token before it expires.
- `proxy.ts` (Next.js 16 request proxy) verifies the cookie for every path except `/login` and static assets, redirecting to `/login`. The dashboard layout verifies again (defence in depth). The two API routes check the session themselves and return 401 without one.
- Logout is a server action that deletes the cookie.
- **Not** production identity: no SSO, no RBAC, no MFA, no multi-user audit.

## 5. Charts, tables, explanations and accessibility

- `EChart` is a client component that dynamically imports ECharts core and only the chart types used, creates the instance, observes resize with `ResizeObserver`, and disposes on unmount. Options are JSON-serialisable; colours can be given as `var(--token)` and are resolved from CSS at draw time. Axis and tooltip formatting is selected with a `format` prop (`money|money_full|pct|pct1|num|dec1|dec2|sec|days|words`) and the selected currency.
- `DataTable` provides case-insensitive search, sortable columns (mouse or keyboard), 10/25/50 rows per page and CSV export of the currently filtered rows. Exported cells that start with `=`, `+`, `-` or `@` are prefixed so spreadsheets do not run them as formulas.
- `InfoTip` ("i" button): hover or focus shows a short summary; click, Enter or Space opens the full explanation (meaning, calculation, interpretation, comparison basis, source, caveats). Content comes from `lib/info/registry.ts`, either built from the KPI dictionary (`K(id)`) or written from the page code (`X(key)`); each entry carries a basis label (`dictionary`, `code`, `mismatch` or `unverified`) so differences between the dictionary and the app are visible.
- **Expand analysis**: KPI and chart cards have an expand button. Chart cards move their live chart or table into a full-screen dialog (keeping sort, search and page). The dialog then loads `GET /api/analysis?key=…` with the page's filters: stats with prior-period change, target vs actual where `fact_kpi_target_period` has a target, a 33-month trend with the selected and comparison windows shaded, breakdowns by segment with drill-down (`drill=dim:id`), largest movers, generated insight text and a list of what the dataset cannot support. Results are cached per filter combination on the server and in the browser session.
- Accessibility: semantic landmarks (`header`, `nav`, `main`), visible focus rings, dialogs with focus trap, Escape to close and focus return, every chart has an `aria-label`, and in the expanded view category charts offer a **Show data table** alternative. Status is shown with text, not colour alone. Not formally audited.

## 6. Scenario formulas (version `SCN-F1.0`)

Baseline = trailing 12 months (TTM) to 2026-09, all business units, of: written revenue `Rw`, interpretation revenue `Ri`, vendor linguist cost per word for HT `ch` and for AI-touched work `ca`, words `W`, AI-touched share `a0`, tooling cost per AI word `t`, interpreter pay `Pi`, platform/telecom `Pl`, PM/dispatch labour `L`, OPEX `X`, D&A `D`, and average weekly actual linguist supply in words `S`.

Inputs: `Δa` AI adoption change (absolute share of written words), `p` price adjustment, `i` vendor-rate inflation, `v` volume growth. Elasticities and the AI effort factor are read from `meta_config.csv` (defaults shown).

```
W'  = W (1+v)           a = clamp(a0 + Δa, 0, 1)
Rev'  = (Rw + Ri) (1+v)(1+p)
Vendor' = W' [ (1-a) ch + a ca ] (1+i)
Tooling' = W' a t
Interp pay' = Pi (1+v)(1+i)
Platform' = Pl (1 + 1.0 v)
Labour' = L (1 + 0.6 v)
GP' = Rev' - Vendor' - Tooling' - Interp pay' - Platform' - Labour'
GM' = GP' / Rev'
OPEX' = X (1 + 0.25 v)
EBITDA' = GP' - OPEX'          EBITDA delta = EBITDA' - EBITDA(base)
Human words required = W' [ (1-a) + 0.35 a ]
Capacity gap = required - 52 S         (positive = shortfall)
```

Presets: Baseline (all zero), Conservative (`Δa` +3 pp, `p` -2%, `i` +8%, `v` -5%), Optimistic (`Δa` +15 pp, `p` +3%, `i` +2%, `v` +12%). **These are illustrative scenario ranges, not statistically validated confidence intervals.** Identical inputs and formula version always give identical outputs; Python reference outputs are stored in `fact_scenario_output` and compared in tests, and a test proves the Baseline preset reproduces TTM EBITDA.

The scenario runs entirely in the browser (nothing is saved). The same tab shows revenue trajectory ranges: the TTM average monthly revenue grown at illustrative annual rates of 4% / 11% / 20% (conservative / target / aggressive, from `meta_config.csv`) for the next 12 months.

## 7. AI savings (assumptions, editable constants in meta_config.csv)

- Baseline human throughput 380 words/hour; blended review cost $32/hour; tooling $0.004 per AI word (scaled by engine category).
- Estimated hours saved per batch = `words/380 - words/observed_wph`; cost impact = `hours x $32 - tooling`.
- MTQE acceptance = words with segment QE score ≥ 0.85 ÷ AI-touched words.
- QE score, edit distance, BLEU and COMET are different metrics and are never mixed. The demo uses QE score and edit distance only.
- The assumptions are shown on the AI & Automation tab; they are not editable in the UI (an interactive review-threshold slider is not built).

## 8. Deployment

- `npm run build` must pass. `public/data/*.csv` is committed (it is synthetic and deterministic) so Vercel builds without Python; `next.config.ts` traces those files into the server functions.
- Vercel project environment variables: `DEMO_USERNAME`, `DEMO_PASSWORD`, `SESSION_SECRET`; optionally `DATA_DIR` to read the CSVs from another directory. Never commit `.env*` (only `.env.example`).
- `scripts/setup-env.mjs` writes `.env.local` after prompting locally, so the password is never typed into chat or committed.

## 9. Known limitations

Single-user demo login without rate limiting; month-granular ranges; tables show capped rows (latest 1,000 sessions, top 500 AI batches, latest 500 evaluations); page filters are URL-only (no chart click-through filtering); local-only interactions on concept tabs and alert acknowledgements; in-memory caches are per server process; performance numbers are not measured on a user device.
