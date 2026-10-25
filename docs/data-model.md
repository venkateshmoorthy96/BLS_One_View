# BLS OneView - Data model

Field-level detail for every table is generated into `docs/data-dictionary.md` from `scripts/schema.py`. KPI formulas are in `docs/kpi-definitions.md` (from `scripts/kpi_catalog.py`). This page explains the conventions and the relationships.

## 1. Conventions

- **Synthetic only.** Fictional names; anonymised IDs: `CL-####`, `OWN-###`, `RES-####`, `OPP-####`, `PRJ-######`, `TRB-######`, `INT-######`, `AIB-######`, `QE-#####`, `REV-######`, `COST-######`, `INV-######`, `ALT-####`, `LP-##`, `CON-##`.
- **Currency:** USD canonical. Revenue, invoices and payments store the original currency, the fixed rate and the USD amount. Costs are USD-only. Rate table `dim_fx_rate` (`FIXED_ILLUSTRATIVE`, version `DEMO-FX-2026-09`).
- **Rounding:** line-level amounts are rounded half-up to 2 decimals when generated. Reporting-currency conversion is applied once to aggregated USD totals; rounding happens only at display.
- **Percentages** are stored as fractions in 0..1. UI formats them.
- **Dates:** ISO `yyyy-mm-dd`; month keys `yyyy-mm`. `dim_date` is a *monthly* dimension (grain: one calendar month).
- **CSV files:** one RFC 4180 CSV per table in `public/data/` (UTF-8, comma, LF, quotes only where needed). Empty cell = null; booleans `true`/`false`; numbers in shortest round-trip form. Column types, nullability, allowed values and keys are defined in `meta_fields.csv` and `meta_tables.csv`, and `lib/data/loader.ts` validates every file against them on load.
- **Determinism:** fixed seed `20261029`; the same generator version produces byte-identical CSV files (the generation timestamp is not written to any CSV).
- **Metadata files:** `meta_tables.csv` and `meta_fields.csv` are the data dictionary the loader validates against; `meta_dataset.csv` holds dataset facts (version, seed, window, cut-off, disclaimer); `meta_config.csv` holds thresholds, assumptions, scenario settings and the seeded surge, which the app reads instead of hard-coding them.
- **Templates:** `scripts/build_csv_templates.py` writes header-only templates plus `_tables.csv` (load order, keys) and `_field_guide.csv` (types, formats, allowed values) to `data/templates/`, for loading real data in the same shape.

## 2. Entity relationships (logical)

```
dim_owner ---< dim_client ---< fact_project ---< fact_translation_batch ---< fact_resource_assignment >--- dim_resource
                  |   |                                   |   \--(AI-touched)--> fact_ai_workflow_batch          \--< bridge_resource_language >-- dim_language_pair
                  |   |                                   \---< fact_quality_evaluation ---< fact_quality_error
                  |   \---< fact_interpretation_session >--- dim_resource (interpreter)
                  |---< fact_revenue_line ---< fact_cost_line (DIRECT)       dim_date (month) / dim_service_line / dim_workflow_type
                  |---< fact_invoice_line ---< bridge_payment_invoice >--- fact_payment
                  \---< fact_client_period_snapshot
fact_opportunity ---< fact_opportunity_stage_event          fact_capacity_period >--- dim_language_pair
dim_connector ---< fact_integration_telemetry               fact_risk_alert, fact_okr, fact_kpi_target_period (-> dim_kpi_definition)
fact_scenario_assumption_set ---< fact_scenario_output      fact_data_quality_check, dim_roadmap_feature, fact_feedback_sample
```

## 3. Core modelling rules

1. **Service line vs workflow.** `dim_service_line` = exclusive revenue category (TRANSLATION, LOCALIZATION, ALT_FORMAT, OPI, VRI, ONSITE). `dim_workflow_type` = how written work is done (HT, MTPE, AIR). MTPE/AIR are workflows, so revenue is never double-counted.
2. **Separate money concepts.** Recognised revenue (`fact_revenue_line`), invoiced value (`fact_invoice_line`, billed in arrears with small adjustments), cash receipts (`fact_payment` + allocations), receivables (invoiced less allocated), pipeline/bookings value (`fact_opportunity`). They are different tables and never summed together.
3. **Declared grain.** Revenue line = delivered written batch, or client x month x interpretation modality. Cost line = revenue line x direct category, or month x OPEX/D&A category. Aggregates are computed per fact before any join; no many-to-many joins are used.
4. **Eligible populations.** Translation words, MTPE words, TM words and AI-touched words all come from delivered batches in `fact_translation_batch` (by `delivered_date`). Interpretation minutes come from `FULFILLED` sessions.
5. **Costs.** Direct: `VENDOR_LINGUIST`, `INTERPRETER_PAY`, `MT_AI_TOOLING`, `PLATFORM_TELECOM`, `PM_DISPATCH_LABOR`. Operating expenses: `SALES_MARKETING`, `TECHNOLOGY_PRODUCT`, `GENERAL_ADMIN`. `DEPRECIATION_AMORTIZATION` (cost class `DA`) is recorded below EBITDA; it is computed by the KPI layer but not shown on any tab. Vendor linguist cost is built from assignments: `words_assigned x resource rate x role factor` (role factors: TRANSLATOR 1.00, EDITOR 0.30, POST_EDITOR 0.62, REVIEWER 0.30 for MTPE, 0.45 for AIR). Interpreter pay is `minutes x interpreter rate x language factor`.
6. **Assignments cover the batch.** For every batch and role, the assigned words sum to `words_total`.
7. **NRR / churn** use a fixed opening cohort (see KPI catalog).
8. **Capacity** units are words for both demand and supply (written work). Past weeks' demand equals actual batch starts; future weeks are a documented forecast.
9. **Alerts** are generated by rule over the facts (SLA risk, client health, capacity load, open disputes, FX receivables, connector degradation), so each alert's exposure is traceable.
10. **Health score** is derived from facts at quarter-ends and the as-of month.

## 4. Generation order and validation

Order: metadata/seed -> dimensions -> opportunities and stage events -> projects and batches -> interpretation sessions -> resources, bridges, assignments, capacity -> quality -> revenue and costs -> invoices, payments -> AI batches -> telemetry and alerts -> OKRs, scenarios, targets, snapshots -> validation -> CSV export (data tables plus the four `meta_*` files) and the report files in `data/generated/`.

The generator **fails (non-zero exit)** if any critical check fails. Checks (recorded in `fact_data_quality_check` and `validation_report.json`) cover: primary-key uniqueness; foreign-key resolution; not-null; enum validity; type validity; fraction ranges 0..1; non-negative amounts; date ordering; ID patterns; and reconciliations:

| Check | Rule |
|---|---|
| R-REV-1 | Revenue by client = revenue by service line = revenue by month = total |
| R-REV-2 | Written revenue units = delivered batch words; interpretation revenue units = fulfilled session minutes (per client-month-modality) |
| R-FX | `revenue_usd = round_half_up(revenue_original x fx, 2)` for every line |
| R-GP | Gross profit = revenue - DIRECT costs; margin = GP / revenue |
| R-WORDS | `tm_match_words <= words_total`; AI-touched words <= delivered words; `mtqe_accepted_words <= words_total` |
| R-ASSIGN | Assignment words per batch-role = `words_total` |
| R-CAP | Past-week capacity demand = sum of batch words started that week |
| R-PAY | Payment amount = sum of allocations; allocations <= invoice line amount |
| R-ERR | Error rows per evaluation = critical + major + minor counts |
| R-SCN | Python scenario outputs reproduce from the formula (TS tests compare the same numbers) |
| R-DET | Two generator runs produce identical checksums (Python test) |

## 5. Volumes and size

Recorded in `data/generated/validation_report.json` after each generation, and computed live by the loader (rows, bytes, SHA-256 per CSV) on the Data Governance tab. About 6 MB of CSV, loaded **server-side only** (never shipped to the browser as a bundle). On load, `lib/data/loader.ts` re-checks every file against the dictionary (types, nulls, enums, ranges, real calendar dates, primary keys including composite keys, foreign keys, empty tables) and `lib/data/store.ts` adds app checks (calendar matches 2024-01..2026-09, cut-off date, an FX rate for every currency, required config sections). Any failure blocks the dashboards.

## 6. Limitations

Synthetic correlations (seasonality, AI adoption ramp, language scarcity, churn behaviour) are invented to make the story coherent. Nothing here is an industry benchmark.
