# BLS OneView - Test plan

Results are recorded in `docs/test-results.md` after each run (real command output only).

## 1. Layers and commands

| Layer | What | Command |
|---|---|---|
| Data validation | Keys, FKs, enums, nulls, ranges, reconciliations (864 checks); generator exits non-zero on a critical failure | `python3 scripts/generate_synthetic_data.py` (`npm run gen:data`) |
| Generator tests | Every table present with schema columns, data dictionary matches the files, validation clean, determinism (regenerate and compare SHA-256 of every file), independent revenue recompute, synthetic flag | `python3 scripts/test_generator.py` (`npm run test:data`) |
| KPI parity tests | TypeScript `core()` for 6 windows x 2 BU scopes, NRR, DSO, PM utilisation and the scenario engine vs `kpi_reference.json` (pandas), within 1e-9 relative; baseline scenario = TTM EBITDA | `npm test` (`tests/parity.test.ts`) |
| Data-layer tests | CSV parser (quotes, commas, line breaks, BOM, malformed quoting, round trip); loader reports missing files, header mismatches, invalid values, duplicate IDs, broken references and empty tables; store refuses invalid data and recovers | `npm test` (`tests/data-layer.test.ts`) |
| Static checks | Strict TypeScript, ESLint | `npm run typecheck`, `npm run lint` |
| Build | Production build, route list | `npm run build` |
| Security and route smoke | All 18 routes render with a valid cookie and contain the synthetic label; all redirect to /login without one; tampered, expired, wrong-key and garbage cookies rejected; signed-in /login redirects; EUR filter; invalid params fall back; secret and password absent from HTML | `node scripts/smoke-test.mjs` (server running, same `SESSION_SECRET`) |
| Manual (owner) | Visual check at 1024/1280/1536 px and a narrow viewport; chart resize; info tips; Expand analysis; CSV export open in Excel | checklist below |

## 2. Key test cases

| ID | Case | Expected | Covered by |
|---|---|---|---|
| T-DATA-01 | Run generator twice | Identical checksums for every CSV | `test_determinism` |
| T-DATA-02 | All FKs resolve, PKs unique | 0 failures in `validation_report.json` | generator checks, `test_validation_clean` |
| T-DATA-03 | Revenue by client = by service line = total | Equal to the cent | generator check R-REV-1 |
| T-DATA-04 | Broken CSV (missing file, bad header, bad value, duplicate ID, orphan reference, empty table, missing FX rate) | Reported; dashboards and KPIs refuse to calculate | `tests/data-layer.test.ts` |
| T-KPI-01 | TS KPIs vs Python reference for ALL, YTD, prior YTD, TTM, L3M, latest month (all units and Unit Alpha) | Match within 1e-9 relative | `tests/parity.test.ts` |
| T-KPI-02 | Zero-denominator inputs | Return `null` (UI shows N/A) | code review (`ratio()` in `lib/kpi/core.ts`); no dedicated test yet |
| T-RECON-01 | Same filters on Overview, Client & Revenue, Finance | Identical revenue (all use `core()`) | manual; no dedicated test yet |
| T-RECON-02 | MTPE words <= AI-touched words <= delivered words | True | generator check R-WORDS |
| T-SCN-01 | Presets vs Python outputs; baseline = TTM EBITDA | Identical | `tests/parity.test.ts`, generator check R-SCN |
| T-AUTH-01 | GET `/overview` without cookie | 307 redirect to `/login` | smoke test |
| T-AUTH-02 | Wrong password | Generic error, username kept, no cookie | manual |
| T-AUTH-03 | Correct login | `HttpOnly` cookie, redirect to `/overview` | manual |
| T-AUTH-04 | Tampered or expired cookie | Redirect to `/login` | smoke test |
| T-AUTH-05 | Logout | Cookie cleared, dashboard inaccessible | manual |
| T-API-01 | `/api/analysis` and `/api/data` without a session | 401 | manual; not in the smoke test yet |
| T-UI-01 | All 18 routes | 200 and synthetic label present | smoke test |
| T-UI-02 | Table search/sort/paginate/CSV | Behaves as specified | manual |
| T-SEC-01 | Search repo and `.next/static` for the password and secret | Not found | smoke test (HTML) and manual search |

## 3. Manual checklist (owner)

1. Log in; confirm the DEMO / SYNTHETIC DATA badge in the header.
2. Walk the interview story: Overview -> Client & Revenue -> Finance -> Translation -> AI -> Capacity or Risk -> Forecasting.
3. Change the range, currency and business unit; confirm the period chip and the sidebar links keep the filters; press Reset.
4. Hover and click an "i" button; open Expand analysis on a KPI card, drill into a segment, go back, and use **Show data table**; press Escape.
5. Move the scenario sliders, pick each preset, press Reset.
6. Resize to ~390 px wide: the navigation menu works and there is no horizontal page scroll.
7. Export a table to CSV and open it.
8. Data Governance: press Reload data; download one CSV.
9. Log out and confirm `/overview` redirects to login.

## 4. Performance measurement (aspirational targets, to be measured)

FCP < 1.2 s, tab interaction < 150 ms, first-load JS < 250 kB gzipped. Record build output sizes and a local Lighthouse or navigation-timing run; report as measured, with the machine and conditions.
