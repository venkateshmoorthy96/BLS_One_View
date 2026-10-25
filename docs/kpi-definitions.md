# KPI definitions

> **Generated** from `scripts/kpi_catalog.py` by `scripts/build_docs.py`. Do not edit by hand.
> All targets and examples are illustrative demo values - not BLS targets or results. Data is 100% synthetic.

## Conventions

- **Date ranges are whole calendar months.** Revenue is recognised monthly, so every KPI uses the same month boundaries (presets: YTD, QTD, TTM, last 6 months, last 3 months, latest month, all data, custom month range). The BRD's 'trailing 30 days' is implemented as 'latest month'.
- **Data as-of date:** 2026-09-30 (last closed month). **Reporting currency:** USD by default; EUR/GBP via the fixed table below.
- **Fixed FX (illustrative, `DEMO-FX-2026-09`):** 1 EUR = 1.08 USD, 1 GBP = 1.27 USD. Reporting-currency conversion divides aggregated USD by the rate; rounding only at display.
- **Percentages** are stored as fractions (0..1) and formatted only in the UI. **Zero denominators** return N/A, never infinity or NaN.
- **Revenue basis:** recognised revenue. Bookings (pipeline value), invoices, cash receipts and receivables are separate measures and are never mixed into revenue.
- **Service lines** (TRANSLATION, LOCALIZATION, ALT_FORMAT, OPI, VRI, ONSITE) are mutually exclusive revenue categories. **Workflows** (HT, MTPE, AIR) describe how written work is done; MTPE/AI-touched are not revenue categories.
- **Eligible populations:** word KPIs (TR_WORDS, MTPE_SHARE, AI_SHARE, TM_REUSE, REJECTION_RATE) all use delivered batches with `delivered_date` in range. Interpretation KPIs use sessions by `request_date`.
- **Business-unit filter:** applied through the client's business unit. Company-level items (plan targets, OPEX) are allocated pro-rata to revenue or shown as N/A, and the UI says so.

## Index

| ID | KPI | Domain | Tab |
|---|---|---|---|
| `REV` | Recognized revenue | Finance | Overview / Finance |
| `REV_VS_PLAN` | Revenue vs plan (variance) | Finance | Overview |
| `DIRECT_COST` | Direct costs | Finance | Finance |
| `GP` | Gross profit | Finance | Finance |
| `GM` | Gross margin | Finance | Overview / Finance |
| `OPEX` | Operating expenses | Finance | Finance / Strategy |
| `EBITDA` | EBITDA | Finance | Finance / Strategy |
| `EBITDA_M` | EBITDA margin | Finance | Strategy / Finance |
| `VENDOR_COGS_SHARE` | Vendor COGS share | Finance | Finance |
| `COST_PER_WORD` | Vendor cost per word | Finance | Finance |
| `REV_PER_WORD` | Revenue per word | Finance | Finance |
| `DSO` | Days sales outstanding (demo formula) | Finance | Finance |
| `ACTIVE_CLIENTS` | Active clients | Clients | Client & Revenue |
| `ARPA` | Average revenue per account | Clients | Client & Revenue |
| `TOP10_CONC` | Top-10 client concentration | Clients | Client & Revenue |
| `NRR` | Net revenue retention | Clients | Client & Revenue |
| `GROSS_REV_CHURN` | Gross revenue churn | Clients | Client & Revenue |
| `LOGO_CHURN` | Logo churn | Clients | Client & Revenue |
| `LOGO_RETENTION` | Client retention (logo) | Clients | Overview |
| `HEALTH` | Client health score | Clients | Client & Revenue |
| `PIPE_UNW` | Pipeline value (unweighted) | Sales | Sales & Marketing |
| `PIPE_W` | Pipeline value (weighted) | Sales | Sales & Marketing |
| `WIN_RATE_COUNT` | Win rate (by count) | Sales | Sales & Marketing |
| `WIN_RATE_VALUE` | Win rate (by value) | Sales | Sales & Marketing |
| `SALES_CYCLE` | Sales cycle length | Sales | Sales & Marketing |
| `QUOTE_TAT` | Quote turnaround | Sales | Sales & Marketing |
| `MQL` | Marketing-qualified leads | Sales | Sales & Marketing |
| `CAC` | Customer acquisition cost (blended) | Sales | Sales & Marketing / Strategy |
| `LTV_CAC` | LTV : CAC (illustrative) | Sales | Strategy |
| `TR_WORDS` | Translation words delivered | Translation | Overview / Translation Ops |
| `TR_TAT` | Average turnaround time | Translation | Translation Ops |
| `TR_OTD` | Translation on-time delivery | Translation | Overview / Translation Ops |
| `MTPE_SHARE` | MTPE word share | Translation | Translation Ops / AI |
| `TM_REUSE` | Translation-memory reuse | Translation | Translation Ops |
| `ACTIVE_PROJECTS` | Active projects | Translation | Translation Ops |
| `INT_MIN` | Interpretation minutes delivered | Interpretation | Overview / Interpretation Ops |
| `OPI_ASA` | OPI average speed to answer | Interpretation | Interpretation Ops |
| `VRI_CONN` | VRI connection success | Interpretation | Interpretation Ops |
| `FILL_ON_DEMAND` | On-demand fill rate | Interpretation | Interpretation Ops |
| `FILL_SCHEDULED` | Scheduled fill rate | Interpretation | Interpretation Ops |
| `ONSITE_FILL` | On-site fulfilment | Interpretation | Interpretation Ops |
| `INT_AVG_DUR` | Average session duration | Interpretation | Interpretation Ops |
| `QUALITY_SCORE` | Quality score | Quality | Quality & Compliance |
| `REJECTION_RATE` | Client rejection rate | Quality | Quality & Compliance |
| `REVIEW_PASS` | Review pass rate | Quality | Quality & Compliance |
| `COMPLIANCE_IDX` | Compliance index (illustrative) | Quality | Quality & Compliance |
| `OPEN_DISPUTES` | Open disputes | Quality | Quality & Compliance |
| `TALENT_POOL` | Active synthetic talent pool | Workforce | HR & Workforce |
| `INTERNAL_FTE` | Internal FTE count | Workforce | HR & Workforce |
| `PM_UTIL` | PM utilization | Workforce | HR & Workforce |
| `FREELANCER_ACTIVE` | Active freelancer rate | Workforce | HR & Workforce |
| `ONBOARD_DAYS` | Onboarding time | Workforce | HR & Workforce |
| `TURNOVER` | Staff turnover | Workforce | HR & Workforce |
| `CAP_LOAD` | Capacity load | Capacity | Capacity & Demand |
| `CAP_GAP` | Projected demand surplus / deficit | Capacity | Capacity & Demand |
| `UNASSIGNED` | Unassigned work | Capacity | Capacity & Demand |
| `CONSTRAINED_LP` | Constrained language pairs | Capacity | Capacity & Demand |
| `AI_SHARE` | AI-touched word share | AI | AI & Automation |
| `AI_EDIT_DIST` | Post-edit distance | AI | AI & Automation |
| `AI_HOURS_SAVED` | Estimated hours saved | AI | AI & Automation |
| `AI_COST_SAVED` | Estimated cost impact | AI | AI & Automation |
| `MTQE_ACCEPT` | MTQE acceptance | AI | AI & Automation |
| `CONN_UPTIME` | Simulated connector uptime | Technology | Technology & Integration |
| `LATENCY_P95` | Simulated p95 latency | Technology | Technology & Integration |
| `CONN_COUNT` | Simulated connector count | Technology | Technology & Integration |
| `SYNC_ERR` | Simulated sync error rate | Technology | Technology & Integration |
| `INGEST_VOL` | Simulated ingestion volume | Technology | Technology & Integration |
| `ALERTS_OPEN` | Open synthetic alerts | Risk | Risk & Alerts |
| `SLA_RISK` | Projects at SLA risk | Risk | Risk & Alerts / Overview |
| `CHURN_RISK_REV` | Revenue at simulated churn risk | Risk | Risk & Alerts |
| `FX_EXPOSURE` | Illustrative FX exposure | Risk | Risk & Alerts |
| `OKR_ATTAIN` | OKR attainment | Strategy | Executive Strategy |
| `ORGANIC_GROWTH` | Organic growth | Strategy | Executive Strategy |
| `SCN_REVENUE` | Scenario revenue | Strategy | Forecasting |
| `SCN_GM` | Scenario gross margin | Strategy | Forecasting |
| `SCN_EBITDA` | Scenario EBITDA impact | Strategy | Forecasting |
| `SCN_CAPGAP` | Scenario capacity gap | Strategy | Forecasting |
| `FORECAST_RANGE` | Forecast / scenario range | Strategy | Executive Strategy / Forecasting |
| `SCHEMA_VALID` | Schema validation rate | Governance | Data Governance |
| `ID_COVERAGE` | Synthetic-identifier coverage | Governance | Data Governance |
| `CATALOG_COMPLETE` | Catalog completeness | Governance | Data Governance |

## Finance

### Recognized revenue (`REV`)

| Attribute | Value |
|---|---|
| Business definition | Revenue recognised in the period: written work when a batch is delivered, interpretation when fulfilled minutes are served. Not bookings, invoices or cash. |
| Formula | `SUM(revenue_usd) over revenue lines in range, converted to reporting currency` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_revenue_line |
| Grain | Delivered written batch, or client x month x modality |
| Date field | month_id |
| Filters | Date range, business unit (via client), service line, client tier/vertical/AM, language pair |
| Unit | USD (or EUR/GBP) |
| Null / zero behaviour | Empty set = 0 |
| Target direction | Higher |
| Illustrative target | Plan = smoothed trend +3% (fact_kpi_target_period) |
| Worked example | Two lines of $1,000 and $2,500 in range -> revenue $3,500. |
| Dependencies | dim_client, dim_fx_rate |

### Revenue vs plan (variance) (`REV_VS_PLAN`)

| Attribute | Value |
|---|---|
| Business definition | Actual recognised revenue minus the illustrative plan for the same months; variance % = variance / plan. |
| Formula | `(REV - SUM(target REVENUE_USD)) ; variance % = (REV - plan) / plan` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_revenue_line, fact_kpi_target_period |
| Grain | Month |
| Date field | month_id |
| Filters | Date range (plan is company-level, so business-unit filter shows N/A for plan) |
| Unit | USD / % |
| Null / zero behaviour | Plan = 0 -> N/A |
| Target direction | Higher |
| Illustrative target | 0% or better |
| Worked example | Actual $1.0M vs plan $0.9M -> +$0.1M (+11.1%). |
| Dependencies | REV |

### Direct costs (`DIRECT_COST`)

| Attribute | Value |
|---|---|
| Business definition | Costs directly attributed to delivering revenue: vendor linguists, interpreter pay, MT/AI tooling, platform/telecom, project-management and dispatch labour allocation. |
| Formula | `SUM(amount_usd) where cost_class = DIRECT` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_cost_line |
| Grain | Cost per revenue line and category |
| Date field | month_id |
| Filters | Same scope as REV (via revenue_id) |
| Unit | USD |
| Null / zero behaviour | Empty = 0 |
| Target direction | Lower |
| Illustrative target | n/a |
| Worked example | Vendor $500 + labour $70 = $570. |
| Dependencies | REV |

### Gross profit (`GP`)

| Attribute | Value |
|---|---|
| Business definition | Recognised revenue less direct costs (categories listed in DIRECT_COST). Operating expenses and D&A are excluded. |
| Formula | `GP = REV - DIRECT_COST` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_revenue_line, fact_cost_line |
| Grain | Revenue line |
| Date field | month_id |
| Filters | Same as REV |
| Unit | USD |
| Null / zero behaviour | Empty = 0 |
| Target direction | Higher |
| Illustrative target | - |
| Worked example | $1,000 revenue - $570 direct = $430 GP. |
| Dependencies | REV, DIRECT_COST |

### Gross margin (`GM`)

| Attribute | Value |
|---|---|
| Business definition | Gross profit as a share of the same-basis recognised revenue. |
| Formula | `GM = GP / REV` |
| Numerator | GP |
| Denominator | REV |
| Source fact | fact_revenue_line, fact_cost_line |
| Grain | Revenue line |
| Date field | month_id |
| Filters | Same as REV |
| Unit | Fraction (shown %) |
| Null / zero behaviour | REV = 0 -> N/A |
| Target direction | Higher |
| Illustrative target | >= 38% |
| Worked example | $430 / $1,000 = 43%. |
| Dependencies | GP, REV |

### Operating expenses (`OPEX`)

| Attribute | Value |
|---|---|
| Business definition | Sales & marketing, technology & product, and general & admin expenses. Excludes direct costs and D&A. |
| Formula | `SUM(amount_usd) where cost_class = OPEX` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_cost_line |
| Grain | Month x category |
| Date field | month_id |
| Filters | Date range (company-level) |
| Unit | USD |
| Null / zero behaviour | Empty = 0 |
| Target direction | Lower |
| Illustrative target | - |
| Worked example | $150 + $70 + $60 = $280. |
| Dependencies | - |

### EBITDA (`EBITDA`)

| Attribute | Value |
|---|---|
| Business definition | Earnings before interest, taxes, depreciation and amortisation = gross profit less operating expenses. D&A is shown separately below EBITDA in the bridge; interest and tax are out of scope. |
| Formula | `EBITDA = GP - OPEX` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_cost_line, fact_revenue_line |
| Grain | Month |
| Date field | month_id |
| Filters | Date range (company-level; business-unit filter allocates OPEX pro-rata to revenue) |
| Unit | USD |
| Null / zero behaviour | Empty = 0 |
| Target direction | Higher |
| Illustrative target | - |
| Worked example | $430 - $280 = $150. |
| Dependencies | GP, OPEX |

### EBITDA margin (`EBITDA_M`)

| Attribute | Value |
|---|---|
| Business definition | EBITDA / recognised revenue. |
| Formula | `EBITDA_M = EBITDA / REV` |
| Numerator | EBITDA |
| Denominator | REV |
| Source fact | fact_cost_line, fact_revenue_line |
| Grain | Month |
| Date field | month_id |
| Filters | As EBITDA |
| Unit | Fraction |
| Null / zero behaviour | REV = 0 -> N/A |
| Target direction | Higher |
| Illustrative target | >= 12% |
| Worked example | $150 / $1,000 = 15%. |
| Dependencies | EBITDA, REV |

### Vendor COGS share (`VENDOR_COGS_SHARE`)

| Attribute | Value |
|---|---|
| Business definition | Third-party linguist and interpreter pay as a share of revenue. |
| Formula | `(VENDOR_LINGUIST + INTERPRETER_PAY) / REV` |
| Numerator | VENDOR_LINGUIST + INTERPRETER_PAY |
| Denominator | REV |
| Source fact | fact_cost_line, fact_revenue_line |
| Grain | Cost line |
| Date field | month_id |
| Filters | Same as REV |
| Unit | Fraction |
| Null / zero behaviour | REV = 0 -> N/A |
| Target direction | Lower |
| Illustrative target | <= 52% |
| Worked example | $520 / $1,000 = 52%. |
| Dependencies | REV |

### Vendor cost per word (`COST_PER_WORD`)

| Attribute | Value |
|---|---|
| Business definition | Vendor linguist cost per delivered written word (same delivered-batch population as revenue per word). |
| Formula | `SUM(VENDOR_LINGUIST) / SUM(words) for written revenue lines` |
| Numerator | VENDOR_LINGUIST (written) |
| Denominator | Written words |
| Source fact | fact_cost_line, fact_revenue_line |
| Grain | Written revenue line |
| Date field | month_id |
| Filters | Same as REV, written service lines only |
| Unit | USD per word |
| Null / zero behaviour | Words = 0 -> N/A |
| Target direction | Lower |
| Illustrative target | - |
| Worked example | $7,500 vendor cost / 100,000 words = $0.075. |
| Dependencies | REV |

### Revenue per word (`REV_PER_WORD`)

| Attribute | Value |
|---|---|
| Business definition | Written recognised revenue per delivered word. |
| Formula | `SUM(revenue_usd written) / SUM(units written)` |
| Numerator | Written revenue |
| Denominator | Written words |
| Source fact | fact_revenue_line |
| Grain | Written revenue line |
| Date field | month_id |
| Filters | Written service lines only |
| Unit | USD per word |
| Null / zero behaviour | Words = 0 -> N/A |
| Target direction | Higher |
| Illustrative target | - |
| Worked example | $15,000 / 100,000 words = $0.15. |
| Dependencies | REV |

### Days sales outstanding (demo formula) (`DSO`)

| Attribute | Value |
|---|---|
| Business definition | Simplified demo DSO: open receivables at the range end divided by invoiced value in the trailing 90 days, times 90. Receivable = invoiced less allocated cash receipts received on or before the range end. |
| Formula | `DSO = open_AR_usd(end) / invoiced_usd(end-89d..end) * 90` |
| Numerator | open AR |
| Denominator | invoiced last 90 days |
| Source fact | fact_invoice_line, bridge_payment_invoice, fact_payment |
| Grain | Invoice line / allocation |
| Date field | invoice_date, payment_date |
| Filters | Date range end only; BU filter via client |
| Unit | Days |
| Null / zero behaviour | Invoiced = 0 -> N/A |
| Target direction | Lower |
| Illustrative target | <= 50 days |
| Worked example | AR $450k / invoiced $900k * 90 = 45 days. |
| Dependencies | - |

## Clients

### Active clients (`ACTIVE_CLIENTS`)

| Attribute | Value |
|---|---|
| Business definition | Clients with recognised revenue > 0 in the selected range. |
| Formula | `COUNT(DISTINCT client_id) with revenue_usd > 0 in range` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_revenue_line |
| Grain | Client |
| Date field | month_id |
| Filters | Range, BU, tier, vertical, AM, health band |
| Unit | Count |
| Null / zero behaviour | Empty = 0 |
| Target direction | Higher |
| Illustrative target | - |
| Worked example | 40 clients billed in range -> 40. |
| Dependencies | REV |

### Average revenue per account (`ARPA`)

| Attribute | Value |
|---|---|
| Business definition | Revenue divided by active clients in the same range. |
| Formula | `ARPA = REV / ACTIVE_CLIENTS` |
| Numerator | REV |
| Denominator | ACTIVE_CLIENTS |
| Source fact | fact_revenue_line |
| Grain | Client |
| Date field | month_id |
| Filters | As ACTIVE_CLIENTS |
| Unit | USD |
| Null / zero behaviour | Active = 0 -> N/A |
| Target direction | Higher |
| Illustrative target | - |
| Worked example | $1.2M / 40 = $30k. |
| Dependencies | REV, ACTIVE_CLIENTS |

### Top-10 client concentration (`TOP10_CONC`)

| Attribute | Value |
|---|---|
| Business definition | Share of revenue from the ten largest clients in the range. |
| Formula | `SUM(revenue of top 10 clients) / REV` |
| Numerator | Top-10 revenue |
| Denominator | REV |
| Source fact | fact_revenue_line |
| Grain | Client |
| Date field | month_id |
| Filters | As ACTIVE_CLIENTS |
| Unit | Fraction |
| Null / zero behaviour | REV = 0 -> N/A |
| Target direction | Lower |
| Illustrative target | <= 55% |
| Worked example | $600k from top 10 of $1.1M -> 54.5%. |
| Dependencies | REV |

### Net revenue retention (`NRR`)

| Attribute | Value |
|---|---|
| Business definition | Fixed opening cohort = clients with revenue in the 12 months ending 12 months before the range end. NRR = cohort revenue in the latest 12 months / cohort revenue in the opening 12 months. New clients are excluded; expansion and contraction included. |
| Formula | `NRR = SUM(cohort revenue, latest 12m) / SUM(cohort revenue, opening 12m)` |
| Numerator | Cohort latest-12m revenue |
| Denominator | Cohort opening-12m revenue |
| Source fact | fact_revenue_line |
| Grain | Client x month |
| Date field | month_id |
| Filters | Range end (windows are TTM-based); BU / tier / vertical / AM filters narrow the cohort |
| Unit | Fraction |
| Null / zero behaviour | Opening = 0 -> N/A |
| Target direction | Higher |
| Illustrative target | >= 100% |
| Worked example | Cohort billed $800k opening, $880k now (incl. $60k lost to churn): NRR 110%. |
| Dependencies | - |

### Gross revenue churn (`GROSS_REV_CHURN`)

| Attribute | Value |
|---|---|
| Business definition | Revenue-based gross churn for the NRR cohort: revenue lost from churn and contraction, ignoring expansion. |
| Formula | `SUM(max(0, opening_i - latest_i)) / SUM(opening_i)` |
| Numerator | Lost + contracted revenue |
| Denominator | Opening revenue |
| Source fact | fact_revenue_line |
| Grain | Client x month |
| Date field | month_id |
| Filters | As NRR |
| Unit | Fraction |
| Null / zero behaviour | Opening = 0 -> N/A |
| Target direction | Lower |
| Illustrative target | <= 8% |
| Worked example | Lost $60k + contraction $20k on $800k -> 10%. |
| Dependencies | NRR cohort |

### Logo churn (`LOGO_CHURN`)

| Attribute | Value |
|---|---|
| Business definition | Share of NRR-cohort clients with zero revenue in the latest 12 months. |
| Formula | `COUNT(cohort clients with latest_i = 0) / COUNT(cohort)` |
| Numerator | Lost clients |
| Denominator | Cohort clients |
| Source fact | fact_revenue_line |
| Grain | Client |
| Date field | month_id |
| Filters | As NRR |
| Unit | Fraction |
| Null / zero behaviour | Cohort = 0 -> N/A |
| Target direction | Lower |
| Illustrative target | <= 10% |
| Worked example | 4 of 45 lost -> 8.9%. |
| Dependencies | NRR cohort |

### Client retention (logo) (`LOGO_RETENTION`)

| Attribute | Value |
|---|---|
| Business definition | 1 - logo churn over the same cohort and window. |
| Formula | `1 - LOGO_CHURN` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_revenue_line |
| Grain | Client |
| Date field | month_id |
| Filters | As NRR |
| Unit | Fraction |
| Null / zero behaviour | Cohort = 0 -> N/A |
| Target direction | Higher |
| Illustrative target | >= 90% |
| Worked example | 1 - 8.9% = 91.1%. |
| Dependencies | LOGO_CHURN |

### Client health score (`HEALTH`)

| Attribute | Value |
|---|---|
| Business definition | Composite 0..1: 0.30 OTD(90d) + 0.25 quality(norm) + 0.20 payment timeliness + 0.25 revenue trend (weights renormalised for missing components). Bands: healthy >= 0.70, watch >= 0.50, else at risk. |
| Formula | `See formula; latest snapshot at or before range end` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_client_period_snapshot |
| Grain | Client x quarter-end/as-of |
| Date field | snapshot_month_id |
| Filters | Client filters |
| Unit | Fraction |
| Null / zero behaviour | Missing component -> weights renormalised |
| Target direction | Higher |
| Illustrative target | >= 0.70 |
| Worked example | OTD .96, quality .8, pay .9, trend .5 -> .30*.96+.25*.8+.20*.9+.25*.5 = 0.793. |
| Dependencies | OTD, QUALITY_SCORE |

## Sales

### Pipeline value (unweighted) (`PIPE_UNW`)

| Attribute | Value |
|---|---|
| Business definition | Sum of estimated annual contract value of open opportunities (stage not closed) at range end. |
| Formula | `SUM(value_usd) for opportunities open at range end` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_opportunity, fact_opportunity_stage_event |
| Grain | Opportunity |
| Date field | stage events (as-of range end) |
| Filters | Territory, lead source, deal size |
| Unit | USD |
| Null / zero behaviour | Empty = 0 |
| Target direction | Higher |
| Illustrative target | - |
| Worked example | 5 open deals totalling $750k. |
| Dependencies | - |

### Pipeline value (weighted) (`PIPE_W`)

| Attribute | Value |
|---|---|
| Business definition | Open pipeline weighted by stage probability. |
| Formula | `SUM(value_usd * probability)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_opportunity |
| Grain | Opportunity |
| Date field | stage events |
| Filters | As PIPE_UNW |
| Unit | USD |
| Null / zero behaviour | Empty = 0 |
| Target direction | Higher |
| Illustrative target | - |
| Worked example | $300k at 40% + $100k at 70% = $190k. |
| Dependencies | PIPE_UNW |

### Win rate (by count) (`WIN_RATE_COUNT`)

| Attribute | Value |
|---|---|
| Business definition | Closed-won opportunities / (closed-won + closed-lost) closed in the range. |
| Formula | `won_count / (won_count + lost_count)` |
| Numerator | Won count |
| Denominator | Won + lost |
| Source fact | fact_opportunity |
| Grain | Opportunity |
| Date field | closed_date |
| Filters | Territory, lead source, deal size |
| Unit | Fraction |
| Null / zero behaviour | No closed deals -> N/A |
| Target direction | Higher |
| Illustrative target | >= 25% |
| Worked example | 12 won, 38 lost -> 24%. |
| Dependencies | - |

### Win rate (by value) (`WIN_RATE_VALUE`)

| Attribute | Value |
|---|---|
| Business definition | Closed-won value / (closed-won + closed-lost value). Reported separately from count win rate. |
| Formula | `won_value / (won_value + lost_value)` |
| Numerator | Won value |
| Denominator | Won + lost value |
| Source fact | fact_opportunity |
| Grain | Opportunity |
| Date field | closed_date |
| Filters | As WIN_RATE_COUNT |
| Unit | Fraction |
| Null / zero behaviour | No closed deals -> N/A |
| Target direction | Higher |
| Illustrative target | - |
| Worked example | $900k won of $3.5M closed -> 25.7%. |
| Dependencies | - |

### Sales cycle length (`SALES_CYCLE`)

| Attribute | Value |
|---|---|
| Business definition | Average days from creation to close for closed-won opportunities. |
| Formula | `AVG(closed_date - created_date) for won` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_opportunity |
| Grain | Opportunity |
| Date field | closed_date |
| Filters | As WIN_RATE_COUNT |
| Unit | Days |
| Null / zero behaviour | No won deals -> N/A |
| Target direction | Lower |
| Illustrative target | - |
| Worked example | (60+90+120)/3 = 90 days. |
| Dependencies | - |

### Quote turnaround (`QUOTE_TAT`)

| Attribute | Value |
|---|---|
| Business definition | Average hours from quote request to quote issued. |
| Formula | `AVG(quote_turnaround_hours)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_opportunity |
| Grain | Opportunity |
| Date field | created_date |
| Filters | As WIN_RATE_COUNT |
| Unit | Hours |
| Null / zero behaviour | No quotes -> N/A |
| Target direction | Lower |
| Illustrative target | <= 24 h |
| Worked example | (8+30+22)/3 = 20 h. |
| Dependencies | - |

### Marketing-qualified leads (`MQL`)

| Attribute | Value |
|---|---|
| Business definition | Opportunities that entered the QUALIFIED stage during the month. |
| Formula | `COUNT(stage events where stage = QUALIFIED)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_opportunity_stage_event |
| Grain | Stage event |
| Date field | entered_date |
| Filters | Territory, lead source |
| Unit | Count |
| Null / zero behaviour | Empty = 0 |
| Target direction | Higher |
| Illustrative target | - |
| Worked example | 9 qualified entries in a month. |
| Dependencies | - |

### Customer acquisition cost (blended) (`CAC`)

| Attribute | Value |
|---|---|
| Business definition | Blended CAC = sales & marketing operating expense in the range divided by new-logo clients onboarded in the range. Attribution is blended (not channel-level). |
| Formula | `SALES_MARKETING OPEX / COUNT(clients with onboarding_date in range)` |
| Numerator | S&M OPEX |
| Denominator | New clients |
| Source fact | fact_cost_line, dim_client |
| Grain | Month / client |
| Date field | month_id, onboarding_date |
| Filters | Range |
| Unit | USD |
| Null / zero behaviour | No new clients -> N/A |
| Target direction | Lower |
| Illustrative target | - |
| Worked example | $300k S&M / 5 new clients = $60k. |
| Dependencies | OPEX |

### LTV : CAC (illustrative) (`LTV_CAC`)

| Attribute | Value |
|---|---|
| Business definition | LTV = ARPA(TTM) x gross margin(TTM) / annual logo churn (floored at 5%); LTV:CAC = LTV / CAC over the trailing 24 months. Illustrative; assumes constant churn and margin. |
| Formula | `LTV / CAC` |
| Numerator | - |
| Denominator | - |
| Source fact | Derived |
| Grain | Client |
| Date field | TTM |
| Filters | Company level |
| Unit | Ratio |
| Null / zero behaviour | CAC or churn undefined -> N/A |
| Target direction | Higher |
| Illustrative target | >= 3 |
| Worked example | LTV $150k / CAC $50k = 3.0. |
| Dependencies | ARPA, GM, LOGO_CHURN, CAC |

## Translation

### Translation words delivered (`TR_WORDS`)

| Attribute | Value |
|---|---|
| Business definition | Words in batches with status DELIVERED and delivered_date in the range (eligible population: all written batches). |
| Formula | `SUM(words_total) for delivered batches` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_translation_batch |
| Grain | Batch |
| Date field | delivered_date |
| Filters | Range, BU, language pair, CAT tool, PM, domain |
| Unit | Words |
| Null / zero behaviour | Empty = 0 |
| Target direction | Higher |
| Illustrative target | - |
| Worked example | 3 batches of 10k, 20k, 5k -> 35,000 words. |
| Dependencies | - |

### Average turnaround time (`TR_TAT`)

| Attribute | Value |
|---|---|
| Business definition | Mean calendar days from batch start to delivery for delivered batches. |
| Formula | `AVG(delivered_date - start_date)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_translation_batch |
| Grain | Batch |
| Date field | delivered_date |
| Filters | As TR_WORDS |
| Unit | Days |
| Null / zero behaviour | No batches -> N/A |
| Target direction | Lower |
| Illustrative target | - |
| Worked example | (4+6+8)/3 = 6 days. |
| Dependencies | - |

### Translation on-time delivery (`TR_OTD`)

| Attribute | Value |
|---|---|
| Business definition | Delivered batches with delivered_date <= due_date divided by all delivered batches in the range. |
| Formula | `on_time_batches / delivered_batches` |
| Numerator | On-time batches |
| Denominator | Delivered batches |
| Source fact | fact_translation_batch |
| Grain | Batch |
| Date field | delivered_date |
| Filters | As TR_WORDS |
| Unit | Fraction |
| Null / zero behaviour | No batches -> N/A |
| Target direction | Higher |
| Illustrative target | >= 95% |
| Worked example | 92 of 100 on time -> 92%. |
| Dependencies | - |

### MTPE word share (`MTPE_SHARE`)

| Attribute | Value |
|---|---|
| Business definition | Words in workflow MTPE divided by all delivered written words in the same range and population as TR_WORDS. |
| Formula | `SUM(words | workflow = MTPE) / TR_WORDS` |
| Numerator | MTPE words |
| Denominator | Delivered words |
| Source fact | fact_translation_batch |
| Grain | Batch |
| Date field | delivered_date |
| Filters | As TR_WORDS |
| Unit | Fraction |
| Null / zero behaviour | TR_WORDS = 0 -> N/A |
| Target direction | Higher (adoption) |
| Illustrative target | - |
| Worked example | 30k MTPE of 100k -> 30%. |
| Dependencies | TR_WORDS |

### Translation-memory reuse (`TM_REUSE`)

| Attribute | Value |
|---|---|
| Business definition | Words covered by TM matches divided by delivered words in the same population. |
| Formula | `SUM(tm_match_words) / TR_WORDS` |
| Numerator | TM-matched words |
| Denominator | Delivered words |
| Source fact | fact_translation_batch |
| Grain | Batch |
| Date field | delivered_date |
| Filters | As TR_WORDS |
| Unit | Fraction |
| Null / zero behaviour | TR_WORDS = 0 -> N/A |
| Target direction | Higher |
| Illustrative target | - |
| Worked example | 22k matched of 100k -> 22%. |
| Dependencies | TR_WORDS |

### Active projects (`ACTIVE_PROJECTS`)

| Attribute | Value |
|---|---|
| Business definition | Projects started on or before the range end and not delivered by that date. |
| Formula | `COUNT(projects with start <= end and (delivered is null or delivered > end))` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_project |
| Grain | Project |
| Date field | start_date, delivered_date |
| Filters | Client / PM / domain |
| Unit | Count |
| Null / zero behaviour | Empty = 0 |
| Target direction | n/a |
| Illustrative target | - |
| Worked example | 36 projects open. |
| Dependencies | - |

## Interpretation

### Interpretation minutes delivered (`INT_MIN`)

| Attribute | Value |
|---|---|
| Business definition | Minutes of FULFILLED sessions in the range (scheduled demand and cancellations excluded). |
| Formula | `SUM(duration_min) where status = FULFILLED` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_interpretation_session |
| Grain | Session |
| Date field | request_date |
| Filters | Range, BU, modality, vertical |
| Unit | Minutes |
| Null / zero behaviour | Empty = 0 |
| Target direction | Higher |
| Illustrative target | - |
| Worked example | 100 sessions x 20 min = 2,000. |
| Dependencies | - |

### OPI average speed to answer (`OPI_ASA`)

| Attribute | Value |
|---|---|
| Business definition | Mean seconds to connect for FULFILLED on-demand OPI sessions. Applies to OPI only. |
| Formula | `AVG(connect_seconds | OPI, ON_DEMAND, FULFILLED)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_interpretation_session |
| Grain | Session |
| Date field | request_date |
| Filters | Range, language |
| Unit | Seconds |
| Null / zero behaviour | No sessions -> N/A |
| Target direction | Lower |
| Illustrative target | <= 30 s |
| Worked example | (20+30+40)/3 = 30 s. |
| Dependencies | - |

### VRI connection success (`VRI_CONN`)

| Attribute | Value |
|---|---|
| Business definition | VRI sessions that connected divided by VRI sessions where an interpreter was assigned (FULFILLED + TECH_FAILURE). Applies to VRI only. |
| Formula | `FULFILLED / (FULFILLED + TECH_FAILURE) for VRI` |
| Numerator | VRI fulfilled |
| Denominator | VRI fulfilled + tech failure |
| Source fact | fact_interpretation_session |
| Grain | Session |
| Date field | request_date |
| Filters | Range, language |
| Unit | Fraction |
| Null / zero behaviour | Denominator 0 -> N/A |
| Target direction | Higher |
| Illustrative target | >= 97% |
| Worked example | 970 of 1,000 -> 97%. |
| Dependencies | - |

### On-demand fill rate (`FILL_ON_DEMAND`)

| Attribute | Value |
|---|---|
| Business definition | Fulfilled on-demand OPI/VRI requests divided by on-demand requests excluding client cancellations and VRI technical failures. |
| Formula | `FULFILLED / (FULFILLED + UNFULFILLED) for ON_DEMAND` |
| Numerator | Fulfilled on-demand |
| Denominator | Fulfilled + unfulfilled on-demand |
| Source fact | fact_interpretation_session |
| Grain | Session |
| Date field | request_date |
| Filters | Range, modality, language |
| Unit | Fraction |
| Null / zero behaviour | Denominator 0 -> N/A |
| Target direction | Higher |
| Illustrative target | >= 95% |
| Worked example | 950 of 1,000 eligible -> 95%. |
| Dependencies | - |

### Scheduled fill rate (`FILL_SCHEDULED`)

| Attribute | Value |
|---|---|
| Business definition | Fulfilled scheduled requests divided by scheduled requests excluding client cancellations and VRI technical failures (includes on-site). |
| Formula | `FULFILLED / (FULFILLED + UNFULFILLED) for SCHEDULED` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_interpretation_session |
| Grain | Session |
| Date field | request_date |
| Filters | As FILL_ON_DEMAND |
| Unit | Fraction |
| Null / zero behaviour | Denominator 0 -> N/A |
| Target direction | Higher |
| Illustrative target | >= 94% |
| Worked example | 470 of 500 -> 94%. |
| Dependencies | - |

### On-site fulfilment (`ONSITE_FILL`)

| Attribute | Value |
|---|---|
| Business definition | Fulfilled on-site sessions / (fulfilled + unfulfilled on-site sessions). |
| Formula | `FULFILLED / (FULFILLED + UNFULFILLED) for ONSITE` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_interpretation_session |
| Grain | Session |
| Date field | request_date |
| Filters | Range, language |
| Unit | Fraction |
| Null / zero behaviour | Denominator 0 -> N/A |
| Target direction | Higher |
| Illustrative target | >= 93% |
| Worked example | 186 of 200 -> 93%. |
| Dependencies | - |

### Average session duration (`INT_AVG_DUR`)

| Attribute | Value |
|---|---|
| Business definition | Mean duration of fulfilled sessions. |
| Formula | `AVG(duration_min | FULFILLED)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_interpretation_session |
| Grain | Session |
| Date field | request_date |
| Filters | As INT_MIN |
| Unit | Minutes |
| Null / zero behaviour | No sessions -> N/A |
| Target direction | n/a |
| Illustrative target | - |
| Worked example | 2,000 min / 100 = 20. |
| Dependencies | INT_MIN |

## Quality

### Quality score (`QUALITY_SCORE`)

| Attribute | Value |
|---|---|
| Business definition | Mean evaluation score on the single illustrative 0-100 framework (ILLUSTRATIVE_MQM_STYLE): 100 minus weighted error penalties per 1,000 sampled words (minor 1, major 5, critical 25). |
| Formula | `AVG(score)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_quality_evaluation |
| Grain | Evaluation |
| Date field | eval_date |
| Filters | Range, language pair, evaluator |
| Unit | Score 0-100 |
| Null / zero behaviour | No evaluations -> N/A |
| Target direction | Higher |
| Illustrative target | >= 92 |
| Worked example | (94+90+88)/3 = 90.7. |
| Dependencies | - |

### Client rejection rate (`REJECTION_RATE`)

| Attribute | Value |
|---|---|
| Business definition | Delivered batches rejected by the client divided by delivered batches in the range. |
| Formula | `SUM(client_rejected) / delivered batches` |
| Numerator | Rejected batches |
| Denominator | Delivered batches |
| Source fact | fact_translation_batch |
| Grain | Batch |
| Date field | delivered_date |
| Filters | As TR_WORDS |
| Unit | Fraction |
| Null / zero behaviour | No batches -> N/A |
| Target direction | Lower |
| Illustrative target | <= 3% |
| Worked example | 3 of 120 -> 2.5%. |
| Dependencies | TR_WORDS |

### Review pass rate (`REVIEW_PASS`)

| Attribute | Value |
|---|---|
| Business definition | Evaluations with outcome PASS divided by all evaluations. |
| Formula | `PASS / evaluations` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_quality_evaluation |
| Grain | Evaluation |
| Date field | eval_date |
| Filters | As QUALITY_SCORE |
| Unit | Fraction |
| Null / zero behaviour | None -> N/A |
| Target direction | Higher |
| Illustrative target | >= 90% |
| Worked example | 81 of 90 -> 90%. |
| Dependencies | - |

### Compliance index (illustrative) (`COMPLIANCE_IDX`)

| Attribute | Value |
|---|---|
| Business definition | Illustrative composite, not a certification: 0.5 x review pass rate + 0.3 x (1 - open dispute rate) + 0.2 x corrective-action closure rate. |
| Formula | `See definition` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_quality_evaluation |
| Grain | Evaluation |
| Date field | eval_date |
| Filters | As QUALITY_SCORE; 'audit readiness' groups by business unit |
| Unit | Fraction |
| Null / zero behaviour | Missing term -> weights renormalised |
| Target direction | Higher |
| Illustrative target | >= 90% |
| Worked example | 0.5*.9 + 0.3*.97 + 0.2*.8 = 0.901. |
| Dependencies | REVIEW_PASS |

### Open disputes (`OPEN_DISPUTES`)

| Attribute | Value |
|---|---|
| Business definition | Evaluations with dispute_status = OPEN. |
| Formula | `COUNT(dispute_status = OPEN)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_quality_evaluation |
| Grain | Evaluation |
| Date field | eval_date |
| Filters | As QUALITY_SCORE |
| Unit | Count |
| Null / zero behaviour | Empty = 0 |
| Target direction | Lower |
| Illustrative target | - |
| Worked example | 7 open. |
| Dependencies | - |

## Workforce

### Active synthetic talent pool (`TALENT_POOL`)

| Attribute | Value |
|---|---|
| Business definition | Resources with is_active = true at the range end. |
| Formula | `COUNT(resources active)` |
| Numerator | - |
| Denominator | - |
| Source fact | dim_resource |
| Grain | Resource |
| Date field | termination_date |
| Filters | Type, language, domain |
| Unit | Count |
| Null / zero behaviour | Empty = 0 |
| Target direction | Higher |
| Illustrative target | - |
| Worked example | 190 active. |
| Dependencies | - |

### Internal FTE count (`INTERNAL_FTE`)

| Attribute | Value |
|---|---|
| Business definition | Active internal resources plus active owners (account managers, project managers, sales). |
| Formula | `COUNT(INTERNAL_* resources active) + COUNT(owners active)` |
| Numerator | - |
| Denominator | - |
| Source fact | dim_resource, dim_owner |
| Grain | Resource / owner |
| Date field | termination_date |
| Filters | - |
| Unit | Count |
| Null / zero behaviour | Empty = 0 |
| Target direction | n/a |
| Illustrative target | - |
| Worked example | 22 internal + 19 owners = 41. |
| Dependencies | - |

### PM utilization (`PM_UTIL`)

| Attribute | Value |
|---|---|
| Business definition | Estimated PM hours of projects active in the range (spread evenly between start and due) divided by PM available hours (weekly capacity x weeks). |
| Formula | `SUM(est_pm_hours allocated to range) / SUM(weekly_capacity_hours x weeks)` |
| Numerator | Allocated PM hours |
| Denominator | PM available hours |
| Source fact | fact_project, dim_owner |
| Grain | Project / PM |
| Date field | start_date..due_date |
| Filters | PM |
| Unit | Fraction |
| Null / zero behaviour | Capacity 0 -> N/A |
| Target direction | Target band |
| Illustrative target | 70-90% |
| Worked example | 620 h / 800 h = 77.5%. |
| Dependencies | - |

### Active freelancer rate (`FREELANCER_ACTIVE`)

| Attribute | Value |
|---|---|
| Business definition | Freelance linguists with at least one assignment in the 90 days to range end divided by active freelance linguists. |
| Formula | `active freelancers / freelance pool` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_resource_assignment, dim_resource |
| Grain | Resource |
| Date field | assigned_date |
| Filters | Language, domain |
| Unit | Fraction |
| Null / zero behaviour | Pool 0 -> N/A |
| Target direction | Higher |
| Illustrative target | - |
| Worked example | 96 of 150 -> 64%. |
| Dependencies | - |

### Onboarding time (`ONBOARD_DAYS`)

| Attribute | Value |
|---|---|
| Business definition | Average days from application to onboarded for resources onboarded in the trailing 12 months. |
| Formula | `AVG(onboarded_date - application_date)` |
| Numerator | - |
| Denominator | - |
| Source fact | dim_resource |
| Grain | Resource |
| Date field | onboarded_date |
| Filters | Type |
| Unit | Days |
| Null / zero behaviour | None -> N/A |
| Target direction | Lower |
| Illustrative target | <= 30 |
| Worked example | (20+40)/2 = 30. |
| Dependencies | - |

### Staff turnover (`TURNOVER`)

| Attribute | Value |
|---|---|
| Business definition | Internal staff (owners + internal resources) leaving in the trailing 12 months / average internal headcount. |
| Formula | `leavers_12m / avg(headcount at start, headcount at end)` |
| Numerator | - |
| Denominator | - |
| Source fact | dim_owner, dim_resource |
| Grain | Person |
| Date field | termination_date |
| Filters | - |
| Unit | Fraction |
| Null / zero behaviour | Headcount 0 -> N/A |
| Target direction | Lower |
| Illustrative target | <= 12% |
| Worked example | 4 / 40 = 10%. |
| Dependencies | INTERNAL_FTE |

## Capacity

### Capacity load (`CAP_LOAD`)

| Attribute | Value |
|---|---|
| Business definition | Demand words / supply words over the selected weeks (written work only). Both in words. |
| Formula | `SUM(demand_words) / SUM(supply_words)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_capacity_period |
| Grain | Language pair x week |
| Date field | week_start |
| Filters | Lookahead window, language pair |
| Unit | Fraction (can exceed 100%) |
| Null / zero behaviour | Supply 0 -> N/A |
| Target direction | Target band |
| Illustrative target | <= 90% |
| Worked example | 9,500 / 10,000 = 95%. |
| Dependencies | - |

### Projected demand surplus / deficit (`CAP_GAP`)

| Attribute | Value |
|---|---|
| Business definition | Supply words less demand words (negative = deficit). |
| Formula | `SUM(supply_words) - SUM(demand_words)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_capacity_period |
| Grain | Language pair x week |
| Date field | week_start |
| Filters | As CAP_LOAD |
| Unit | Words |
| Null / zero behaviour | - |
| Target direction | Higher |
| Illustrative target | - |
| Worked example | 10,000 - 9,500 = +500. |
| Dependencies | - |

### Unassigned work (`UNASSIGNED`)

| Attribute | Value |
|---|---|
| Business definition | Demand words not yet covered by confirmed assignments. |
| Formula | `SUM(demand_words - confirmed_words)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_capacity_period |
| Grain | Language pair x week |
| Date field | week_start |
| Filters | As CAP_LOAD |
| Unit | Words |
| Null / zero behaviour | - |
| Target direction | Lower |
| Illustrative target | - |
| Worked example | 9,500 - 7,000 = 2,500. |
| Dependencies | - |

### Constrained language pairs (`CONSTRAINED_LP`)

| Attribute | Value |
|---|---|
| Business definition | Language pairs whose capacity load exceeds the warning threshold (90%) in the selected window. |
| Formula | `COUNT(lp with load > 0.90)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_capacity_period |
| Grain | Language pair |
| Date field | week_start |
| Filters | As CAP_LOAD |
| Unit | Count |
| Null / zero behaviour | - |
| Target direction | Lower |
| Illustrative target | - |
| Worked example | 3 of 20. |
| Dependencies | CAP_LOAD |

## AI

### AI-touched word share (`AI_SHARE`)

| Attribute | Value |
|---|---|
| Business definition | Words in AI-touched workflows (MTPE or AIR) divided by delivered written words in the same range and population as TR_WORDS. |
| Formula | `SUM(words | workflow in MTPE, AIR) / TR_WORDS` |
| Numerator | AI-touched words |
| Denominator | Delivered words |
| Source fact | fact_translation_batch |
| Grain | Batch |
| Date field | delivered_date |
| Filters | As TR_WORDS |
| Unit | Fraction |
| Null / zero behaviour | TR_WORDS = 0 -> N/A |
| Target direction | Higher |
| Illustrative target | - |
| Worked example | 45k of 100k -> 45%. |
| Dependencies | TR_WORDS |

### Post-edit distance (`AI_EDIT_DIST`)

| Attribute | Value |
|---|---|
| Business definition | Word-weighted mean normalised edit distance on AI-touched batches (0 = unchanged, 1 = rewritten). Distinct from MTQE, BLEU and COMET. |
| Formula | `SUM(edit_distance x words) / SUM(words)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_ai_workflow_batch, fact_translation_batch |
| Grain | AI batch |
| Date field | delivered_date |
| Filters | Engine category, sensitivity, language family |
| Unit | Fraction |
| Null / zero behaviour | No batches -> N/A |
| Target direction | Lower |
| Illustrative target | - |
| Worked example | (0.2x10k + 0.4x10k)/20k = 0.30. |
| Dependencies | - |

### Estimated hours saved (`AI_HOURS_SAVED`)

| Attribute | Value |
|---|---|
| Business definition | Estimate: words / baseline human words per hour minus words / observed words per hour. An estimate, not a measured result. |
| Formula | `SUM(est_hours_saved)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_ai_workflow_batch |
| Grain | AI batch |
| Date field | delivered_date |
| Filters | As AI_EDIT_DIST |
| Unit | Hours |
| Null / zero behaviour | Empty = 0 |
| Target direction | Higher |
| Illustrative target | - |
| Worked example | 10k words: 10,000/380 - 10,000/600 = 9.6 h. |
| Dependencies | - |

### Estimated cost impact (`AI_COST_SAVED`)

| Attribute | Value |
|---|---|
| Business definition | Estimate: hours saved x blended review hourly cost less tooling cost. |
| Formula | `SUM(est_cost_saved_usd)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_ai_workflow_batch |
| Grain | AI batch |
| Date field | delivered_date |
| Filters | As AI_EDIT_DIST |
| Unit | USD |
| Null / zero behaviour | Empty = 0 |
| Target direction | Higher |
| Illustrative target | - |
| Worked example | 9.6 h x $32 - $40 tooling = $267. |
| Dependencies | AI_HOURS_SAVED |

### MTQE acceptance (`MTQE_ACCEPT`)

| Attribute | Value |
|---|---|
| Business definition | Words whose segment-level quality-estimation score met the acceptance threshold (default 0.85) divided by AI-touched words in the same population. |
| Formula | `SUM(mtqe_accepted_words) / SUM(AI words)` |
| Numerator | Accepted words |
| Denominator | AI words |
| Source fact | fact_ai_workflow_batch |
| Grain | AI batch |
| Date field | delivered_date |
| Filters | As AI_EDIT_DIST |
| Unit | Fraction |
| Null / zero behaviour | No batches -> N/A |
| Target direction | Higher |
| Illustrative target | - |
| Worked example | 62k of 80k -> 77.5%. |
| Dependencies | AI_SHARE |

## Technology

### Simulated connector uptime (`CONN_UPTIME`)

| Attribute | Value |
|---|---|
| Business definition | SIMULATED: up minutes / monitored minutes across connectors in the window. Not production uptime. |
| Formula | `SUM(up_minutes) / SUM(monitored_minutes)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_integration_telemetry |
| Grain | Connector x day |
| Date field | date |
| Filters | Connector, category, environment, horizon |
| Unit | Fraction |
| Null / zero behaviour | Denominator 0 -> N/A |
| Target direction | Higher |
| Illustrative target | >= 99.5% |
| Worked example | 1,435 of 1,440 -> 99.65%. |
| Dependencies | - |

### Simulated p95 latency (`LATENCY_P95`)

| Attribute | Value |
|---|---|
| Business definition | SIMULATED: request-weighted mean of daily p95 latency. |
| Formula | `SUM(p95_ms x requests) / SUM(requests)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_integration_telemetry |
| Grain | Connector x day |
| Date field | date |
| Filters | As CONN_UPTIME |
| Unit | ms |
| Null / zero behaviour | No requests -> N/A |
| Target direction | Lower |
| Illustrative target | <= 400 ms |
| Worked example | (300x100 + 500x300)/400 = 450 ms. |
| Dependencies | - |

### Simulated connector count (`CONN_COUNT`)

| Attribute | Value |
|---|---|
| Business definition | Distinct simulated connectors with telemetry in the window. |
| Formula | `COUNT(DISTINCT connector_id)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_integration_telemetry |
| Grain | Connector |
| Date field | date |
| Filters | As CONN_UPTIME |
| Unit | Count |
| Null / zero behaviour | - |
| Target direction | n/a |
| Illustrative target | - |
| Worked example | 14. |
| Dependencies | - |

### Simulated sync error rate (`SYNC_ERR`)

| Attribute | Value |
|---|---|
| Business definition | SIMULATED: errors (4xx + 5xx + timeout) / requests. |
| Formula | `SUM(errors) / SUM(requests)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_integration_telemetry |
| Grain | Connector x day |
| Date field | date |
| Filters | As CONN_UPTIME |
| Unit | Fraction |
| Null / zero behaviour | Requests 0 -> N/A |
| Target direction | Lower |
| Illustrative target | <= 1% |
| Worked example | 40 errors / 5,000 = 0.8%. |
| Dependencies | - |

### Simulated ingestion volume (`INGEST_VOL`)

| Attribute | Value |
|---|---|
| Business definition | SIMULATED: records ingested in the window. |
| Formula | `SUM(records_ingested)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_integration_telemetry |
| Grain | Connector x day |
| Date field | date |
| Filters | As CONN_UPTIME |
| Unit | Records |
| Null / zero behaviour | Empty = 0 |
| Target direction | n/a |
| Illustrative target | - |
| Worked example | 1.2M records. |
| Dependencies | - |

## Risk

### Open synthetic alerts (`ALERTS_OPEN`)

| Attribute | Value |
|---|---|
| Business definition | Alerts in state OPEN or IN_PROGRESS (after local acknowledge/dismiss in the browser, which is not persisted). |
| Formula | `COUNT(status in OPEN, IN_PROGRESS)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_risk_alert |
| Grain | Alert |
| Date field | raised_date |
| Filters | Severity, domain, status |
| Unit | Count |
| Null / zero behaviour | Empty = 0 |
| Target direction | Lower |
| Illustrative target | - |
| Worked example | 24 open. |
| Dependencies | - |

### Projects at SLA risk (`SLA_RISK`)

| Attribute | Value |
|---|---|
| Business definition | Active batches overdue, or due within 2 days with progress below 80% (configurable demo thresholds). |
| Formula | `COUNT(batches overdue or (due - as_of <= 2 and pct_complete < 0.8))` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_translation_batch |
| Grain | Batch |
| Date field | due_date |
| Filters | - |
| Unit | Count |
| Null / zero behaviour | Empty = 0 |
| Target direction | Lower |
| Illustrative target | - |
| Worked example | 6 batches. |
| Dependencies | - |

### Revenue at simulated churn risk (`CHURN_RISK_REV`)

| Attribute | Value |
|---|---|
| Business definition | TTM revenue of clients in the AT_RISK health band. |
| Formula | `SUM(ttm_revenue_usd | health_band = AT_RISK)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_client_period_snapshot |
| Grain | Client |
| Date field | snapshot_month_id |
| Filters | - |
| Unit | USD |
| Null / zero behaviour | Empty = 0 |
| Target direction | Lower |
| Illustrative target | - |
| Worked example | 3 clients x $50k = $150k. |
| Dependencies | HEALTH |

### Illustrative FX exposure (`FX_EXPOSURE`)

| Attribute | Value |
|---|---|
| Business definition | Open receivables in non-USD currencies, converted to USD at the fixed rate: the amount a 10% currency move would change. |
| Formula | `SUM(open AR USD for EUR, GBP)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_invoice_line, bridge_payment_invoice |
| Grain | Invoice line |
| Date field | invoice_date |
| Filters | - |
| Unit | USD |
| Null / zero behaviour | Empty = 0 |
| Target direction | Lower |
| Illustrative target | - |
| Worked example | $120k EUR AR -> 10% = $12k. |
| Dependencies | DSO |

## Strategy

### OKR attainment (`OKR_ATTAIN`)

| Attribute | Value |
|---|---|
| Business definition | Mean progress of key results, each capped at 100%. Progress = (current - baseline) / (target - baseline), with direction handled for lower-is-better metrics. |
| Formula | `AVG(progress)` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_okr |
| Grain | Key result |
| Date field | - |
| Filters | Pillar |
| Unit | Fraction |
| Null / zero behaviour | None -> N/A |
| Target direction | Higher |
| Illustrative target | >= 80% |
| Worked example | (1.0 + .5 + .75)/3 = 75%. |
| Dependencies | - |

### Organic growth (`ORGANIC_GROWTH`)

| Attribute | Value |
|---|---|
| Business definition | Year-over-year revenue growth for the same months, excluding revenue from clients onboarded within the comparison window. |
| Formula | `(REV_now_existing - REV_prior) / REV_prior` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_revenue_line, dim_client |
| Grain | Client x month |
| Date field | month_id |
| Filters | Range |
| Unit | Fraction |
| Null / zero behaviour | Prior = 0 -> N/A |
| Target direction | Higher |
| Illustrative target | >= 8% |
| Worked example | $1.08M vs $1.0M -> 8%. |
| Dependencies | REV |

### Scenario revenue (`SCN_REVENUE`)

| Attribute | Value |
|---|---|
| Business definition | Baseline TTM revenue x (1 + volume growth) x (1 + price adjustment). Transparent formula, versioned SCN-F1.0. |
| Formula | `Rev' = Rev x (1+v) x (1+p)` |
| Numerator | - |
| Denominator | - |
| Source fact | Baseline TTM aggregates |
| Grain | Aggregate |
| Date field | TTM to as-of |
| Filters | Scenario inputs |
| Unit | USD |
| Null / zero behaviour | - |
| Target direction | Higher |
| Illustrative target | - |
| Worked example | $1.0M x 1.10 x 1.02 = $1.122M. |
| Dependencies | REV |

### Scenario gross margin (`SCN_GM`)

| Attribute | Value |
|---|---|
| Business definition | Scenario revenue less scenario direct costs (vendor cost re-priced with AI mix and inflation; PM labour semi-variable; platform variable) / scenario revenue. |
| Formula | `see docs/architecture.md section Scenario formulas` |
| Numerator | - |
| Denominator | - |
| Source fact | Baseline TTM aggregates |
| Grain | Aggregate |
| Date field | TTM |
| Filters | Scenario inputs |
| Unit | Fraction |
| Null / zero behaviour | Rev' = 0 -> N/A |
| Target direction | Higher |
| Illustrative target | - |
| Worked example | n/a (formula-driven) |
| Dependencies | GM, AI mix |

### Scenario EBITDA impact (`SCN_EBITDA`)

| Attribute | Value |
|---|---|
| Business definition | Scenario EBITDA less baseline EBITDA; OPEX is semi-fixed (elasticity 0.25 to volume). |
| Formula | `EBITDA' - EBITDA` |
| Numerator | - |
| Denominator | - |
| Source fact | Baseline TTM aggregates |
| Grain | Aggregate |
| Date field | TTM |
| Filters | Scenario inputs |
| Unit | USD |
| Null / zero behaviour | - |
| Target direction | Higher |
| Illustrative target | - |
| Worked example | n/a (formula-driven) |
| Dependencies | EBITDA |

### Scenario capacity gap (`SCN_CAPGAP`)

| Attribute | Value |
|---|---|
| Business definition | Human words required (human-workflow words + AI words x 0.35 effort factor) less available human capacity words over 12 months. Positive = shortfall. |
| Formula | `Required - Supply` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_capacity_period, baseline |
| Grain | Aggregate |
| Date field | TTM |
| Filters | Scenario inputs |
| Unit | Words |
| Null / zero behaviour | - |
| Target direction | Lower |
| Illustrative target | - |
| Worked example | n/a (formula-driven) |
| Dependencies | CAP_LOAD |

### Forecast / scenario range (`FORECAST_RANGE`)

| Attribute | Value |
|---|---|
| Business definition | Range between conservative and optimistic preset scenarios. These are illustrative scenario ranges, NOT statistically validated confidence intervals. |
| Formula | `min/max across presets` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_scenario_output |
| Grain | Scenario |
| Date field | - |
| Filters | - |
| Unit | USD |
| Null / zero behaviour | - |
| Target direction | n/a |
| Illustrative target | - |
| Worked example | Conservative $0.95M, optimistic $1.2M. |
| Dependencies | SCN_REVENUE |

## Governance

### Schema validation rate (`SCHEMA_VALID`)

| Attribute | Value |
|---|---|
| Business definition | Passing generator checks / total checks (types, enums, nulls, keys, ranges, reconciliations). |
| Formula | `passed checks / total checks` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_data_quality_check |
| Grain | Check |
| Date field | - |
| Filters | Domain |
| Unit | Fraction |
| Null / zero behaviour | No checks -> N/A |
| Target direction | Higher |
| Illustrative target | 100% |
| Worked example | 58 of 58 -> 100%. |
| Dependencies | - |

### Synthetic-identifier coverage (`ID_COVERAGE`)

| Attribute | Value |
|---|---|
| Business definition | Share of identifier fields that follow the synthetic ID patterns (CL-####, PRJ-######, ...). |
| Formula | `valid-pattern IDs / identifier values checked` |
| Numerator | - |
| Denominator | - |
| Source fact | fact_data_quality_check |
| Grain | Check |
| Date field | - |
| Filters | - |
| Unit | Fraction |
| Null / zero behaviour | - |
| Target direction | Higher |
| Illustrative target | 100% |
| Worked example | All IDs match -> 100%. |
| Dependencies | - |

### Catalog completeness (`CATALOG_COMPLETE`)

| Attribute | Value |
|---|---|
| Business definition | Share of fields in the data dictionary with a definition, plus KPIs with all required definition attributes. |
| Formula | `documented fields / total fields` |
| Numerator | - |
| Denominator | - |
| Source fact | data_dictionary |
| Grain | Field |
| Date field | - |
| Filters | - |
| Unit | Fraction |
| Null / zero behaviour | - |
| Target direction | Higher |
| Illustrative target | 100% |
| Worked example | All fields documented -> 100%. |
| Dependencies | - |

