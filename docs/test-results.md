# Test results

Every figure below is copied from actual command output.

## Latest run: 2026-10-25 (Windows 11, Node via npm, Python 3.13.2)

| Check | Command | Result |
|---|---|---|
| Data validation (schema, FK, enums, reconciliations) | `data/generated/validation_report.json` from the last generation | **864 / 864 passed**, 0 critical failures (generator not re-run) |
| Generator tests | `python scripts/test_generator.py` | **6 tests OK**, including byte-identical regeneration of every table |
| TS KPI layer and data layer | `npx vitest run` | **28 tests passed** in 2 files (16 parity tests against the pandas reference, 12 CSV parser / loader / store tests) |
| Type check | `npx tsc --noEmit` | no errors |
| Lint | `npx eslint .` | no errors or warnings |
| Dev server | `npm run dev` | ready on http://localhost:3000; `/login` returns 200, `/overview` without a session redirects (307) to `/login` |
| `scripts/build_docs.py` | regenerate the generated docs | content identical to the committed `kpi-definitions.md` and `data-dictionary.md` (only line endings differed on Windows; committed files kept) |

Not re-run on 2026-10-25: production build, HTTP smoke test, real-browser flow.

### Observation
- `public/brand/` was empty, so the logo's local fallback was missing. Fixed: `public/brand/BIGLS_Logo_Horizontal.png` (1629 × 595 PNG, downloaded unmodified from the same biglanguage.com URL) was added, and the dev server serves it (200, image/png).
- Vitest prints a Vite warning that `vitest.config.ts` uses ESM syntax in a file loaded as CommonJS; tests still pass.

## Earlier run: 2026-10-23 (build environment)

| Check | Command | Result |
|---|---|---|
| Data validation | `python3 scripts/generate_synthetic_data.py` | **864 / 864 passed**, 0 critical failures |
| Generator tests | `python3 scripts/test_generator.py` | **5 tests OK** (before the dictionary test was added) |
| TS KPI layer vs pandas reference | `npx vitest run` | **16 tests passed** (before the data-layer tests were added) |
| Type check / lint | `npx tsc --noEmit`, `npx eslint .` | no errors |
| Production build | `npm run build` | compiled; 18 tab routes + login built |
| HTTP smoke test (production server) | `node scripts/smoke-test.mjs` | **all checks passed**: 18 routes render with session; 18 routes redirect to /login without one; tampered, expired, wrong-key and garbage cookies rejected; signed-in `/login` redirects; EUR filter switches symbol; invalid filter params fall back; secret/password absent from HTML |
| Real-browser flow (Chromium via Playwright) | ad-hoc script | wrong password shows the generic error and keeps the username; correct password lands on Overview; all 18 tabs open from the sidebar (charts render on the 15 tabs that have charts); currency filter persists in sidebar links; scenario preset buttons work; Sign out returns to login and blocks `/overview`; **0 console errors** |

Re-test after applying the brand theme (2026-10-23): typecheck, lint, the Vitest parity tests, production build, the HTTP smoke test and a Chromium login-and-render run were all repeated and passed. The light-mode chart palette was checked with a palette validator: lightness band and chroma pass; one colour pair is in the warning band for red-green colour blindness (acceptable because every chart has a legend and tooltips); several series have under 3:1 contrast against white, so every chart also has a legend, tooltips and (in the expanded view) a data table.

### Defects found and fixed during testing
- After a failed sign-in React cleared the username field, which blocked re-submission. Fixed by echoing the username back in the action state.
- A server-rendered chart passed a function to a client component (500 on Translation Ops). Replaced with a serialisable template formatter.

## Not tested
- Deployment to GitHub or Vercel (a user action).
- Automated accessibility audit and cross-browser testing (only Chromium was used; keyboard and ARIA basics were implemented, not audited).
- Load testing.
- The API routes' 401 behaviour is not part of the smoke test.
