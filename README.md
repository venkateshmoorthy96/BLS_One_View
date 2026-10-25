# BLS OneView (interview demonstration)

An enterprise BI and predictive-analytics web app for a language services provider: 18 tabs covering revenue, translation and interpretation operations, finance, AI automation, forecasting, quality, workforce, capacity, technology, risk and governance.

> **Everything here is synthetic.** Clients, linguists, amounts and connectors are fictional and generated with a fixed seed. Nothing represents real company systems, clients or results. A `DEMO / SYNTHETIC DATA` badge is shown on every screen.

## Quick start

```bash
npm install
npm run setup:env        # prompts for a password locally, writes .env.local (git-ignored)
npm run dev              # http://localhost:3000
```

Username: `Demo_project_for_interview`. The password is whatever you enter in `setup:env`; it is never stored in the repo.

## Commands

| Command | What it does |
|---|---|
| `npm run gen:data` | Regenerates the CSV dataset in `public/data/` (seed 20261029, deterministic) and runs 864 validation checks |
| `npm run test:data` | Python tests: determinism, schema coverage, validation, independent recomputation (6 tests) |
| `npm test` | Vitest: KPI layer vs the independent pandas reference, CSV parser and loader validation (28 tests) |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm run build && npm start` | Production build and server |
| `node scripts/smoke-test.mjs` | Route, auth and cookie smoke test against a running server (needs `SESSION_SECRET`) |
| `python scripts/build_docs.py` | Re-renders `docs/kpi-definitions.md` and `docs/data-dictionary.md` from the Python catalogs |
| `python scripts/build_csv_templates.py` | Writes blank CSV templates plus a table and field guide to `data/templates/` |

The generator needs Python 3 with `numpy` and `pandas`. On Windows, use `python` instead of the `python3` in the npm scripts if `python3` is not on your path.

## Project layout

```
scripts/         Python generator, schema, KPI catalog, validator, reference KPIs, tests, doc/template builders, env setup, smoke test
public/data/     the dataset: 36 CSV tables + meta_tables/meta_fields (data dictionary), meta_dataset, meta_config
data/generated/  test and report artifacts only: kpi_reference.json (pandas reference values), validation_report.json
data/templates/  blank CSV templates and field guide for loading your own data
lib/             auth (signed cookie), filters (URL contract), data layer (csv parser, source, loader, store), KPI layer and rules,
                 scenario engine, analysis engine (Expand analysis), info registry (the "i" explanations)
app/(app)/       the 18 tab routes (server components); app/login; app/api/analysis and app/api/data
components/      EChart wrapper, KpiCard, ChartCard, DataTable (search/sort/page/CSV), InfoTip, ExpandAnalysis, sidebar, filter bar
docs/            requirements, data model, architecture, KPI definitions, data dictionary, test plan/results, interview guide
tests/           Vitest parity tests and data-layer tests
```

## Features worth knowing

- **Info tips:** every KPI card, chart and table has an "i" button: hover for a summary, click for the definition, formula, source and caveats. Entries built from the KPI dictionary are labelled as such. Where the app's calculation differs from the dictionary, the entry says so.
- **Expand analysis:** the expand icon on cards opens a full-screen view with the prior-period comparison, target vs actual (where a target exists), a 33-month trend, breakdowns with drill-down, and generated insight text. The data comes from `GET /api/analysis`.
- **Fail-closed data:** if any CSV is missing, malformed or inconsistent, the dashboards are replaced by a list of the problems. `GET /api/data` returns the validation report and `POST /api/data` forces a reload.

## Deploying to Vercel (your action)

1. Push this folder to a GitHub repository (`.env.local` is git-ignored).
2. In Vercel, import the repository (framework: Next.js; no build overrides).
3. Set environment variables for Production (and Preview): `DEMO_USERNAME=Demo_project_for_interview`, `DEMO_PASSWORD=<your choice>`, `SESSION_SECRET=<32+ random characters, e.g. openssl rand -base64 48>`.
4. Deploy, then run the smoke test against the deployed URL with the same `SESSION_SECRET`.

No database or external service is used. The server reads and validates the CSV files in `public/data/` (or `DATA_DIR` if set); the raw files are only downloadable after signing in. To change the data, replace the CSVs and use **Reload data** on the Data Governance tab (changed files are also picked up automatically within a second).

## Honest limitations

See `docs/interview-guide.md` section 7. Key ones: single shared demo login (not production authentication), month-granular date ranges, illustrative scenario ranges (not statistical forecasts), and local-only interactions on the concept tabs.

## Visual theme
Inspired by BIG Language Solutions' public branding. All colours are CSS tokens in `app/globals.css`: navy `#20384A` for text and the sidebar, brand red `#E9232B` (and a darker `#D41E26` for white-text buttons, which passes WCAG AA), a warm page background `#F7F3EF`, teal `#29AFC7` and yellow `#FFCC00`. Headings use Georgia (serif); body text uses Barlow (self-hosted via `@fontsource`). Chart series run teal, red, navy, green, amber, blue and slate. Yellow is used only for the DEMO badge and accents, because it is too light to read as a chart series. The header loads the company logo from biglanguage.com and falls back to an unmodified local copy, `public/brand/BIGLS_Logo_Horizontal.png`, so the logo also shows offline. The theme is light-only. This is a visual homage for the interview, not an official product.
