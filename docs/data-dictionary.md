# Data dictionary

> **Generated** from `scripts/schema.py` by `scripts/build_docs.py`. Do not edit by hand.
> Every record is synthetic. IDs follow stable synthetic patterns. No real clients, people, contracts or systems.

## Tables

| Table | Kind | Domain | Grain | Primary key | Fields |
|---|---|---|---|---|---|
| `dim_owner` | dimension | REFERENCE | One row per anonymised internal owner (account manager, project manager, sales rep) | `owner_id` | 8 |
| `dim_client` | dimension | COMMERCIAL | One row per fictional client account | `client_id` | 14 |
| `dim_service_line` | dimension | REFERENCE | One row per mutually exclusive commercial service line (revenue category) | `service_line_id` | 5 |
| `dim_workflow_type` | dimension | REFERENCE | One row per production workflow type | `workflow_id` | 4 |
| `dim_language_pair` | dimension | REFERENCE | One row per English-to-target language pair (interpretation uses the non-English language) | `lp_id` | 7 |
| `dim_date` | dimension | REFERENCE | One row per calendar month (monthly reporting grain) | `month_id` | 7 |
| `dim_fx_rate` | dimension | FINANCE | One row per currency with a fixed illustrative USD rate | `currency_code` | 4 |
| `dim_resource` | dimension | WORKFORCE | One row per anonymised linguist or interpreter resource | `resource_id` | 16 |
| `bridge_resource_language` | bridge | WORKFORCE | One row per resource x language pair coverage | `resource_id+lp_id` | 4 |
| `dim_connector` | dimension | TECHNOLOGY | One row per SIMULATED integration connector | `connector_id` | 7 |
| `dim_kpi_definition` | dimension | GOVERNANCE | One row per KPI definition (rendered from scripts/kpi_catalog.py) | `kpi_id` | 18 |
| `dim_roadmap_feature` | dimension | PLATFORM | One row per illustrative roadmap feature | `feature_id` | 8 |
| `fact_opportunity` | fact | COMMERCIAL | One row per sales opportunity | `opportunity_id` | 17 |
| `fact_opportunity_stage_event` | fact | COMMERCIAL | One row per opportunity stage entry | `event_id` | 4 |
| `fact_project` | fact | TRANSLATION | One row per written-services project (order) for a client | `project_id` | 11 |
| `fact_translation_batch` | fact | TRANSLATION | One row per production batch (one language pair + one workflow) within a project | `batch_id` | 14 |
| `fact_resource_assignment` | fact | TRANSLATION | One row per batch x resource x role; words per role sum to the batch words | `assignment_id` | 6 |
| `fact_ai_workflow_batch` | fact | AI | One row per AI-touched batch (workflow MTPE or AIR); subset of fact_translation_batch | `ai_batch_id` | 11 |
| `fact_interpretation_session` | fact | INTERPRETATION | One row per interpretation request/session (OPI, VRI or on-site) | `session_id` | 12 |
| `fact_capacity_period` | fact | CAPACITY | One row per language pair x week (written work, words) | `capacity_id` | 7 |
| `fact_quality_evaluation` | fact | QUALITY | One row per evaluated deliverable sample | `evaluation_id` | 15 |
| `fact_quality_error` | fact | QUALITY | One row per logged error; counts reconcile to the evaluation | `error_id` | 4 |
| `fact_revenue_line` | fact | FINANCE | One row per recognised revenue line: one delivered written batch, or one client x month x interpretation modality | `revenue_id` | 15 |
| `fact_cost_line` | fact | FINANCE | One row per cost: direct cost per revenue line and category, or monthly operating expense / D&A | `cost_id` | 7 |
| `fact_invoice_line` | fact | FINANCE | One row per invoice line: client x service line x billed revenue month | `invoice_line_id` | 12 |
| `fact_payment` | fact | FINANCE | One row per customer cash receipt | `payment_id` | 6 |
| `bridge_payment_invoice` | bridge | FINANCE | One row per payment x invoice line allocation | `payment_id+invoice_line_id` | 4 |
| `fact_kpi_target_period` | fact | FINANCE | One row per month x KPI illustrative target | `target_id` | 4 |
| `fact_client_period_snapshot` | fact | COMMERCIAL | One row per client x quarter-end (and as-of month) health snapshot | `snapshot_id` | 10 |
| `fact_integration_telemetry` | fact | TECHNOLOGY | One row per SIMULATED connector x day | `telemetry_id` | 13 |
| `fact_risk_alert` | fact | RISK | One row per synthetic alert, produced by documented rules over the generated facts | `alert_id` | 16 |
| `fact_okr` | fact | STRATEGY | One row per key result | `okr_id` | 12 |
| `fact_scenario_assumption_set` | fact | STRATEGY | One row per named scenario assumption set | `set_id` | 8 |
| `fact_scenario_output` | fact | STRATEGY | One row per assumption set: reference outputs computed by the Python formula implementation | `output_id` | 10 |
| `fact_data_quality_check` | fact | GOVERNANCE | One row per validation check executed by the generator | `check_id` | 8 |
| `fact_feedback_sample` | fact | PLATFORM | One row per seeded fictional feedback example | `feedback_id` | 6 |

## Enumerations

- **vertical**: HEALTHCARE, GOVERNMENT, LEGAL, LIFE_SCIENCES, FINANCIAL_SERVICES, TECHNOLOGY
- **region**: NORTH_AMERICA, EMEA, APAC, LATAM
- **tier**: STRATEGIC, GROWTH, STANDARD
- **business_unit**: UNIT_ALPHA, UNIT_BETA, UNIT_GAMMA
- **currency**: USD, EUR, GBP
- **contract_type**: MSA_ANNUAL, MSA_MULTI_YEAR, PAY_AS_YOU_GO
- **owner_role**: ACCOUNT_MANAGER, PROJECT_MANAGER, SALES_REP
- **service_line**: TRANSLATION, LOCALIZATION, ALT_FORMAT, OPI, VRI, ONSITE
- **sl_family**: WRITTEN, INTERPRETATION
- **unit_type**: WORD, MINUTE
- **workflow**: HT, MTPE, AIR
- **resource_tier**: HIGH, MEDIUM, LOW
- **resource_type**: FREELANCE_LINGUIST, FREELANCE_INTERPRETER, INTERNAL_LINGUIST, INTERNAL_INTERPRETER
- **domain**: MEDICAL, LEGAL, REGULATORY, FINANCIAL, TECHNICAL, MARKETING, GOVERNMENT
- **lead_source**: INBOUND_WEB, REFERRAL, PARTNER, OUTBOUND, EVENT
- **opp_stage**: LEAD, QUALIFIED, PROPOSAL, NEGOTIATION, CLOSED_WON, CLOSED_LOST
- **opp_type**: NEW_LOGO, EXPANSION
- **loss_reason**: PRICE, INCUMBENT_PREFERRED, LANGUAGE_COVERAGE, TURNAROUND, NO_DECISION, QUALITY_CONCERNS
- **cat_tool**: CAT_A, CAT_B, CAT_C, CAT_D
- **batch_status**: IN_PROGRESS, DELIVERED
- **batch_stage**: TRANSLATION, EDITING, PROOFREADING, QA, DELIVERY
- **project_status**: ACTIVE, COMPLETED
- **assignment_role**: TRANSLATOR, EDITOR, POST_EDITOR, REVIEWER
- **request_type**: ON_DEMAND, SCHEDULED
- **session_status**: FULFILLED, UNFULFILLED, CANCELLED_BY_CLIENT, TECH_FAILURE
- **qa_framework**: ILLUSTRATIVE_MQM_STYLE
- **qa_outcome**: PASS, FAIL
- **dispute_status**: NONE, OPEN, RESOLVED
- **corrective_action**: COACHING, RETRAINING, TERMINOLOGY_UPDATE, PROCESS_FIX, NONE_REQUIRED
- **corrective_status**: NA, OPEN, CLOSED
- **error_category**: ACCURACY, FLUENCY, TERMINOLOGY, STYLE, LOCALE_CONVENTION, DESIGN_FORMAT, OMISSION_ADDITION
- **error_severity**: MINOR, MAJOR, CRITICAL
- **cost_class**: DIRECT, OPEX, DA
- **cost_category**: VENDOR_LINGUIST, INTERPRETER_PAY, MT_AI_TOOLING, PLATFORM_TELECOM, PM_DISPATCH_LABOR, SALES_MARKETING, TECHNOLOGY_PRODUCT, GENERAL_ADMIN, DEPRECIATION_AMORTIZATION
- **engine_category**: GENERIC_NMT, CUSTOM_NMT, LLM_BASED, HYBRID_NMT_LLM
- **sensitivity**: LOW, MEDIUM, HIGH
- **connector_category**: TMS, CRM, FINANCE, TELEPHONY, VIDEO, HR, AI_MT, QUALITY, DATA
- **protocol**: REST, WEBHOOK, SFTP, SOAP, SIP, WEBSOCKET
- **sim_env**: SIM_PROD, SIM_STAGING
- **severity**: CRITICAL, HIGH, MEDIUM, LOW
- **alert_domain**: DELIVERY, CLIENT, CAPACITY, QUALITY, FINANCE, TECHNOLOGY, COMPLIANCE
- **alert_status**: OPEN, IN_PROGRESS, RESOLVED
- **okr_status**: ON_TRACK, AT_RISK, OFF_TRACK, COMPLETE
- **dq_dimension**: COMPLETENESS, UNIQUENESS, VALIDITY, CONSISTENCY, INTEGRITY, RECONCILIATION
- **health_band**: HEALTHY, WATCH, AT_RISK
- **roadmap_status**: DELIVERED, IN_PROGRESS, PLANNED, UNDER_REVIEW
- **priority**: P1, P2, P3

## `dim_owner`

**Grain:** One row per anonymised internal owner (account manager, project manager, sales rep)  
**Primary key:** `owner_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `owner_id` | string | no | Synthetic owner ID (OWN-###) |  | SYNTHETIC_IDENTIFIER |
| `owner_code` | string | no | Anonymised display code such as AM-01 / PM-03 / SR-02 |  | SYNTHETIC_IDENTIFIER |
| `role` | enum | no | Owner role | ACCOUNT_MANAGER, PROJECT_MANAGER, SALES_REP | SYNTHETIC_OPERATIONAL |
| `region` | enum | no | Home region | NORTH_AMERICA, EMEA, APAC, LATAM | SYNTHETIC_OPERATIONAL |
| `weekly_capacity_hours` | float | yes | Weekly management capacity in hours (project managers only) |  | SYNTHETIC_OPERATIONAL |
| `hire_date` | date | no | Synthetic hire date |  | SYNTHETIC_OPERATIONAL |
| `termination_date` | date | yes | Synthetic leaving date; null if still active |  | SYNTHETIC_OPERATIONAL |
| `is_active` | bool | no | True if active at the data as-of date |  | SYNTHETIC_OPERATIONAL |

## `dim_client`

**Grain:** One row per fictional client account  
**Primary key:** `client_id`  
**Foreign keys:** `account_manager_id` -> `dim_owner.owner_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `client_id` | string | no | Synthetic client ID (CL-####) |  | SYNTHETIC_IDENTIFIER |
| `client_name` | string | no | Fictional client name; any resemblance to a real organisation is coincidental |  | SYNTHETIC_OPERATIONAL |
| `vertical` | enum | no | Industry vertical | HEALTHCARE, GOVERNMENT, LEGAL, LIFE_SCIENCES, FINANCIAL_SERVICES, TECHNOLOGY | SYNTHETIC_OPERATIONAL |
| `region` | enum | no | Client region | NORTH_AMERICA, EMEA, APAC, LATAM | SYNTHETIC_OPERATIONAL |
| `tier` | enum | no | Client tier by synthetic size | STRATEGIC, GROWTH, STANDARD | SYNTHETIC_OPERATIONAL |
| `business_unit` | enum | no | Fictional business unit that owns the account | UNIT_ALPHA, UNIT_BETA, UNIT_GAMMA | SYNTHETIC_OPERATIONAL |
| `account_manager_id` | string | no | Account manager owner |  | SYNTHETIC_IDENTIFIER |
| `billing_currency` | enum | no | Invoice currency | USD, EUR, GBP | SYNTHETIC_OPERATIONAL |
| `contract_type` | enum | no | Contract type | MSA_ANNUAL, MSA_MULTI_YEAR, PAY_AS_YOU_GO | SYNTHETIC_OPERATIONAL |
| `contract_start_date` | date | no | Synthetic contract start |  | SYNTHETIC_OPERATIONAL |
| `contract_end_date` | date | yes | Synthetic contract end / renewal date |  | SYNTHETIC_OPERATIONAL |
| `onboarding_date` | date | no | Date the client first became billable |  | SYNTHETIC_OPERATIONAL |
| `churn_date` | date | yes | Date billing stopped; null if still active |  | SYNTHETIC_OPERATIONAL |
| `contract_summary` | string | no | Short synthetic contract summary used in the client dossier |  | SYNTHETIC_OPERATIONAL |

## `dim_service_line`

**Grain:** One row per mutually exclusive commercial service line (revenue category)  
**Primary key:** `service_line_id`  
**Note:** MTPE is a workflow, never a service line, so revenue cannot be double-counted.  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `service_line_id` | enum | no | Service line code | TRANSLATION, LOCALIZATION, ALT_FORMAT, OPI, VRI, ONSITE | SYNTHETIC_IDENTIFIER |
| `service_line_name` | string | no | Display name |  | SYNTHETIC_OPERATIONAL |
| `family` | enum | no | Written or interpretation | WRITTEN, INTERPRETATION | SYNTHETIC_OPERATIONAL |
| `unit_type` | enum | no | Unit the service is billed in | WORD, MINUTE | SYNTHETIC_OPERATIONAL |
| `sort_order` | int | no | Display order |  | SYNTHETIC_OPERATIONAL |

## `dim_workflow_type`

**Grain:** One row per production workflow type  
**Primary key:** `workflow_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `workflow_id` | enum | no | Workflow code | HT, MTPE, AIR | SYNTHETIC_IDENTIFIER |
| `workflow_name` | string | no | Display name |  | SYNTHETIC_OPERATIONAL |
| `is_ai_touched` | bool | no | True when machine output is used in the workflow |  | SYNTHETIC_OPERATIONAL |
| `description` | string | no | Plain-language description |  | SYNTHETIC_OPERATIONAL |

## `dim_language_pair`

**Grain:** One row per English-to-target language pair (interpretation uses the non-English language)  
**Primary key:** `lp_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `lp_id` | string | no | Synthetic language pair ID (LP-##) |  | SYNTHETIC_IDENTIFIER |
| `pair_label` | string | no | Label such as EN>ES |  | SYNTHETIC_OPERATIONAL |
| `source_language` | string | no | Source language |  | SYNTHETIC_OPERATIONAL |
| `target_language` | string | no | Target language |  | SYNTHETIC_OPERATIONAL |
| `language_family` | string | no | Language family used for filters |  | SYNTHETIC_OPERATIONAL |
| `resource_tier` | enum | no | Linguist supply tier (HIGH = abundant, LOW = scarce) | HIGH, MEDIUM, LOW | SYNTHETIC_OPERATIONAL |
| `demand_weight` | fraction | no | Relative share of synthetic demand |  | SYNTHETIC_OPERATIONAL |

## `dim_date`

**Grain:** One row per calendar month (monthly reporting grain)  
**Primary key:** `month_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `month_id` | string | no | Month key yyyy-mm |  | SYNTHETIC_IDENTIFIER |
| `month_start` | date | no | First day of month |  | SYNTHETIC_OPERATIONAL |
| `month_end` | date | no | Last day of month |  | SYNTHETIC_OPERATIONAL |
| `year` | int | no | Calendar year |  | SYNTHETIC_OPERATIONAL |
| `quarter` | string | no | Quarter label such as 2026-Q3 |  | SYNTHETIC_OPERATIONAL |
| `month_index` | int | no | 0-based month sequence from the first data month |  | SYNTHETIC_OPERATIONAL |
| `is_ytd` | bool | no | True if the month is in the as-of year (year-to-date) |  | SYNTHETIC_OPERATIONAL |

## `dim_fx_rate`

**Grain:** One row per currency with a fixed illustrative USD rate  
**Primary key:** `currency_code`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `currency_code` | enum | no | ISO currency code | USD, EUR, GBP | SYNTHETIC_IDENTIFIER |
| `usd_per_unit` | float | no | USD per 1 unit of currency (fixed, illustrative) |  | SYNTHETIC_OPERATIONAL |
| `rate_type` | string | no | FIXED_ILLUSTRATIVE - never live FX |  | SYNTHETIC_OPERATIONAL |
| `rate_version` | string | no | Rate table version |  | SYNTHETIC_OPERATIONAL |

## `dim_resource`

**Grain:** One row per anonymised linguist or interpreter resource  
**Primary key:** `resource_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `resource_id` | string | no | Synthetic resource ID (RES-####) |  | SYNTHETIC_IDENTIFIER |
| `anon_code` | string | no | Anonymised code such as L-0012 or I-0044; no real names |  | SYNTHETIC_IDENTIFIER |
| `resource_type` | enum | no | Resource type | FREELANCE_LINGUIST, FREELANCE_INTERPRETER, INTERNAL_LINGUIST, INTERNAL_INTERPRETER | SYNTHETIC_OPERATIONAL |
| `region` | enum | no | Region | NORTH_AMERICA, EMEA, APAC, LATAM | SYNTHETIC_OPERATIONAL |
| `primary_domain` | enum | no | Primary subject domain | MEDICAL, LEGAL, REGULATORY, FINANCIAL, TECHNICAL, MARKETING, GOVERNMENT | SYNTHETIC_OPERATIONAL |
| `certification_label` | string | no | Fictional certification label (not a real credential) |  | SYNTHETIC_OPERATIONAL |
| `application_date` | date | no | Synthetic date the resource applied |  | SYNTHETIC_OPERATIONAL |
| `onboarded_date` | date | no | Synthetic date the resource became available |  | SYNTHETIC_OPERATIONAL |
| `termination_date` | date | yes | Synthetic end date; null if active |  | SYNTHETIC_OPERATIONAL |
| `is_active` | bool | no | Active at the as-of date |  | SYNTHETIC_OPERATIONAL |
| `quality_score` | float | no | Illustrative quality score 0-100 |  | SYNTHETIC_WORKFORCE_SENSITIVE |
| `availability` | fraction | no | Share of capacity typically available |  | SYNTHETIC_OPERATIONAL |
| `weekly_capacity_words` | int | yes | Weekly written capacity in words (linguists) |  | SYNTHETIC_OPERATIONAL |
| `weekly_capacity_minutes` | int | yes | Weekly interpretation capacity in minutes (interpreters) |  | SYNTHETIC_OPERATIONAL |
| `rate_per_word_usd` | float | yes | Base synthetic cost rate per word (linguists) |  | SYNTHETIC_WORKFORCE_SENSITIVE |
| `rate_per_minute_usd` | float | yes | Synthetic pay rate per minute (interpreters) |  | SYNTHETIC_WORKFORCE_SENSITIVE |

## `bridge_resource_language`

**Grain:** One row per resource x language pair coverage  
**Primary key:** `resource_id+lp_id`  
**Foreign keys:** `resource_id` -> `dim_resource.resource_id`, `lp_id` -> `dim_language_pair.lp_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `resource_id` | string | no | Resource |  | SYNTHETIC_IDENTIFIER |
| `lp_id` | string | no | Language pair covered |  | SYNTHETIC_IDENTIFIER |
| `expertise_domain` | enum | no | Subject domain for this coverage | MEDICAL, LEGAL, REGULATORY, FINANCIAL, TECHNICAL, MARKETING, GOVERNMENT | SYNTHETIC_OPERATIONAL |
| `is_primary` | bool | no | True if this is the resource's main language pair |  | SYNTHETIC_OPERATIONAL |

## `dim_connector`

**Grain:** One row per SIMULATED integration connector  
**Primary key:** `connector_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `connector_id` | string | no | Synthetic connector ID (CON-##) |  | SYNTHETIC_IDENTIFIER |
| `connector_name` | string | no | Simulated connector label (not a real product) |  | SYNTHETIC_OPERATIONAL |
| `category` | enum | no | Connector category | TMS, CRM, FINANCE, TELEPHONY, VIDEO, HR, AI_MT, QUALITY, DATA | SYNTHETIC_OPERATIONAL |
| `protocol` | enum | no | Simulated protocol | REST, WEBHOOK, SFTP, SOAP, SIP, WEBSOCKET | SYNTHETIC_OPERATIONAL |
| `simulated_endpoint` | string | no | Fictional endpoint on the reserved .invalid domain |  | SYNTHETIC_OPERATIONAL |
| `sim_environment` | enum | no | Simulated environment | SIM_PROD, SIM_STAGING | SYNTHETIC_OPERATIONAL |
| `is_simulated` | bool | no | Always true - no live connection exists |  | SYNTHETIC_OPERATIONAL |

## `dim_kpi_definition`

**Grain:** One row per KPI definition (rendered from scripts/kpi_catalog.py)  
**Primary key:** `kpi_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `kpi_id` | string | no | KPI code |  | SYNTHETIC_IDENTIFIER |
| `kpi_name` | string | no | KPI display name |  | SYNTHETIC_OPERATIONAL |
| `domain` | string | no | Business domain |  | SYNTHETIC_OPERATIONAL |
| `tab` | string | no | Primary dashboard tab |  | SYNTHETIC_OPERATIONAL |
| `definition` | string | no | Business definition |  | SYNTHETIC_OPERATIONAL |
| `formula` | string | no | Calculation formula |  | SYNTHETIC_OPERATIONAL |
| `numerator` | string | yes | Numerator, if a ratio |  | SYNTHETIC_OPERATIONAL |
| `denominator` | string | yes | Denominator, if a ratio |  | SYNTHETIC_OPERATIONAL |
| `source_fact` | string | no | Source table(s) |  | SYNTHETIC_OPERATIONAL |
| `grain` | string | no | Grain of the source data |  | SYNTHETIC_OPERATIONAL |
| `date_field` | string | no | Date basis |  | SYNTHETIC_OPERATIONAL |
| `filters` | string | no | Filters that apply |  | SYNTHETIC_OPERATIONAL |
| `unit` | string | no | Unit of measure |  | SYNTHETIC_OPERATIONAL |
| `null_behavior` | string | no | Zero / null behaviour |  | SYNTHETIC_OPERATIONAL |
| `target_direction` | string | no | Higher or lower is better |  | SYNTHETIC_OPERATIONAL |
| `illustrative_target` | string | no | Illustrative target (not a real BLS target) |  | SYNTHETIC_OPERATIONAL |
| `worked_example` | string | no | Worked example with toy numbers |  | SYNTHETIC_OPERATIONAL |
| `dependencies` | string | no | Other KPIs or tables it depends on |  | SYNTHETIC_OPERATIONAL |

## `dim_roadmap_feature`

**Grain:** One row per illustrative roadmap feature  
**Primary key:** `feature_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `feature_id` | string | no | Feature ID |  | SYNTHETIC_IDENTIFIER |
| `title` | string | no | Feature title |  | SYNTHETIC_OPERATIONAL |
| `description` | string | no | Feature description |  | SYNTHETIC_OPERATIONAL |
| `category` | string | no | Functional area |  | SYNTHETIC_OPERATIONAL |
| `status` | enum | no | Release status (illustrative) | DELIVERED, IN_PROGRESS, PLANNED, UNDER_REVIEW | SYNTHETIC_OPERATIONAL |
| `target_quarter` | string | no | Illustrative target quarter |  | SYNTHETIC_OPERATIONAL |
| `priority` | enum | no | Priority | P1, P2, P3 | SYNTHETIC_OPERATIONAL |
| `seed_votes` | int | no | Illustrative starting votes (fictional) |  | SYNTHETIC_OPERATIONAL |

## `fact_opportunity`

**Grain:** One row per sales opportunity  
**Primary key:** `opportunity_id`  
**Foreign keys:** `owner_id` -> `dim_owner.owner_id`, `client_id` -> `dim_client.client_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `opportunity_id` | string | no | Opportunity ID (OPP-####) |  | SYNTHETIC_IDENTIFIER |
| `prospect_name` | string | no | Fictional prospect or client name |  | SYNTHETIC_OPERATIONAL |
| `opportunity_type` | enum | no | New logo or expansion of an existing client | NEW_LOGO, EXPANSION | SYNTHETIC_OPERATIONAL |
| `vertical` | enum | no | Vertical | HEALTHCARE, GOVERNMENT, LEGAL, LIFE_SCIENCES, FINANCIAL_SERVICES, TECHNOLOGY | SYNTHETIC_OPERATIONAL |
| `territory` | enum | no | Sales territory | NORTH_AMERICA, EMEA, APAC, LATAM | SYNTHETIC_OPERATIONAL |
| `lead_source` | enum | no | Lead source | INBOUND_WEB, REFERRAL, PARTNER, OUTBOUND, EVENT | SYNTHETIC_OPERATIONAL |
| `owner_id` | string | no | Sales owner |  | SYNTHETIC_IDENTIFIER |
| `created_date` | date | no | Date created |  | SYNTHETIC_OPERATIONAL |
| `expected_close_date` | date | no | Expected close date |  | SYNTHETIC_OPERATIONAL |
| `closed_date` | date | yes | Actual close date for won/lost |  | SYNTHETIC_OPERATIONAL |
| `stage_current` | enum | no | Current stage | LEAD, QUALIFIED, PROPOSAL, NEGOTIATION, CLOSED_WON, CLOSED_LOST | SYNTHETIC_OPERATIONAL |
| `value_usd` | money | no | Estimated annual contract value in USD |  | SYNTHETIC_FINANCIAL |
| `probability` | fraction | no | Stage-based win probability (configured demo table) |  | SYNTHETIC_OPERATIONAL |
| `loss_reason` | enum | yes | Reason for loss | PRICE, INCUMBENT_PREFERRED, LANGUAGE_COVERAGE, TURNAROUND, NO_DECISION, QUALITY_CONCERNS | SYNTHETIC_OPERATIONAL |
| `language_count` | int | no | Languages in scope |  | SYNTHETIC_OPERATIONAL |
| `quote_turnaround_hours` | float | yes | Hours from request to quote |  | SYNTHETIC_OPERATIONAL |
| `client_id` | string | yes | Resulting or existing client (won opportunities and expansions) |  | SYNTHETIC_IDENTIFIER |

## `fact_opportunity_stage_event`

**Grain:** One row per opportunity stage entry  
**Primary key:** `event_id`  
**Foreign keys:** `opportunity_id` -> `fact_opportunity.opportunity_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `event_id` | string | no | Event ID |  | SYNTHETIC_IDENTIFIER |
| `opportunity_id` | string | no | Opportunity |  | SYNTHETIC_IDENTIFIER |
| `stage` | enum | no | Stage entered | LEAD, QUALIFIED, PROPOSAL, NEGOTIATION, CLOSED_WON, CLOSED_LOST | SYNTHETIC_OPERATIONAL |
| `entered_date` | date | no | Date stage was entered |  | SYNTHETIC_OPERATIONAL |

## `fact_project`

**Grain:** One row per written-services project (order) for a client  
**Primary key:** `project_id`  
**Foreign keys:** `client_id` -> `dim_client.client_id`, `pm_owner_id` -> `dim_owner.owner_id`, `service_line_id` -> `dim_service_line.service_line_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `project_id` | string | no | Project ID (PRJ-######) |  | SYNTHETIC_IDENTIFIER |
| `project_name` | string | no | Fictional project name |  | SYNTHETIC_OPERATIONAL |
| `client_id` | string | no | Client |  | SYNTHETIC_IDENTIFIER |
| `service_line_id` | enum | no | Written service line (exclusive) | TRANSLATION, LOCALIZATION, ALT_FORMAT, OPI, VRI, ONSITE | SYNTHETIC_IDENTIFIER |
| `domain` | enum | no | Subject domain | MEDICAL, LEGAL, REGULATORY, FINANCIAL, TECHNICAL, MARKETING, GOVERNMENT | SYNTHETIC_OPERATIONAL |
| `pm_owner_id` | string | no | Project manager |  | SYNTHETIC_IDENTIFIER |
| `start_date` | date | no | Project start |  | SYNTHETIC_OPERATIONAL |
| `due_date` | date | no | Latest batch due date |  | SYNTHETIC_OPERATIONAL |
| `delivered_date` | date | yes | Date the last batch was delivered; null if active |  | SYNTHETIC_OPERATIONAL |
| `status` | enum | no | Project status at the as-of date | ACTIVE, COMPLETED | SYNTHETIC_OPERATIONAL |
| `est_pm_hours` | float | no | Estimated project-management hours, spread over start..due for utilisation |  | SYNTHETIC_OPERATIONAL |

## `fact_translation_batch`

**Grain:** One row per production batch (one language pair + one workflow) within a project  
**Primary key:** `batch_id`  
**Foreign keys:** `project_id` -> `fact_project.project_id`, `lp_id` -> `dim_language_pair.lp_id`, `workflow_id` -> `dim_workflow_type.workflow_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `batch_id` | string | no | Batch ID (TRB-######) |  | SYNTHETIC_IDENTIFIER |
| `project_id` | string | no | Project |  | SYNTHETIC_IDENTIFIER |
| `lp_id` | string | no | Language pair |  | SYNTHETIC_IDENTIFIER |
| `workflow_id` | enum | no | Workflow used | HT, MTPE, AIR | SYNTHETIC_IDENTIFIER |
| `cat_tool` | enum | no | Generic CAT tool label | CAT_A, CAT_B, CAT_C, CAT_D | SYNTHETIC_OPERATIONAL |
| `words_total` | int | no | Eligible source words in the batch |  | SYNTHETIC_OPERATIONAL |
| `tm_match_words` | int | no | Words covered by translation-memory matches (<= words_total) |  | SYNTHETIC_OPERATIONAL |
| `start_date` | date | no | Start date |  | SYNTHETIC_OPERATIONAL |
| `due_date` | date | no | Due date (SLA) |  | SYNTHETIC_OPERATIONAL |
| `delivered_date` | date | yes | Delivery date; null if in progress |  | SYNTHETIC_OPERATIONAL |
| `status` | enum | no | Batch status at as-of | IN_PROGRESS, DELIVERED | SYNTHETIC_OPERATIONAL |
| `stage` | enum | no | Current production stage (delivered batches = DELIVERY) | TRANSLATION, EDITING, PROOFREADING, QA, DELIVERY | SYNTHETIC_OPERATIONAL |
| `pct_complete` | fraction | no | Progress 0..1 |  | SYNTHETIC_OPERATIONAL |
| `client_rejected` | bool | no | True if the client rejected the delivery (delivered batches only) |  | SYNTHETIC_OPERATIONAL |

## `fact_resource_assignment`

**Grain:** One row per batch x resource x role; words per role sum to the batch words  
**Primary key:** `assignment_id`  
**Foreign keys:** `batch_id` -> `fact_translation_batch.batch_id`, `resource_id` -> `dim_resource.resource_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `assignment_id` | string | no | Assignment ID |  | SYNTHETIC_IDENTIFIER |
| `batch_id` | string | no | Batch |  | SYNTHETIC_IDENTIFIER |
| `resource_id` | string | no | Assigned linguist |  | SYNTHETIC_IDENTIFIER |
| `role` | enum | no | Role | TRANSLATOR, EDITOR, POST_EDITOR, REVIEWER | SYNTHETIC_OPERATIONAL |
| `words_assigned` | int | no | Words covered by this assignment |  | SYNTHETIC_OPERATIONAL |
| `assigned_date` | date | no | Assignment date |  | SYNTHETIC_OPERATIONAL |

## `fact_ai_workflow_batch`

**Grain:** One row per AI-touched batch (workflow MTPE or AIR); subset of fact_translation_batch  
**Primary key:** `ai_batch_id`  
**Foreign keys:** `batch_id` -> `fact_translation_batch.batch_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `ai_batch_id` | string | no | AI batch ID (AIB-######) |  | SYNTHETIC_IDENTIFIER |
| `batch_id` | string | no | Batch (must be an AI-touched workflow) |  | SYNTHETIC_IDENTIFIER |
| `engine_category` | enum | no | GENERIC engine category (synthetic, not a vendor) | GENERIC_NMT, CUSTOM_NMT, LLM_BASED, HYBRID_NMT_LLM | SYNTHETIC_OPERATIONAL |
| `content_sensitivity` | enum | no | Content sensitivity tier | LOW, MEDIUM, HIGH | SYNTHETIC_OPERATIONAL |
| `mtqe_score` | fraction | no | Mean machine-translation quality-estimation score (QE scale 0..1; not BLEU or COMET) |  | SYNTHETIC_OPERATIONAL |
| `mtqe_accepted_words` | int | no | Words whose segment QE score >= the acceptance threshold |  | SYNTHETIC_OPERATIONAL |
| `edit_distance` | fraction | no | Normalised post-edit distance (0 = no edits, 1 = full rewrite); not a QE score |  | SYNTHETIC_OPERATIONAL |
| `observed_words_per_hour` | float | no | Synthetic observed effective throughput |  | SYNTHETIC_OPERATIONAL |
| `est_hours_saved` | float | no | Estimated hours saved vs baseline (an estimate) | `words/baseline_wph - words/observed_wph` | SYNTHETIC_OPERATIONAL |
| `tooling_cost_usd` | money | no | Synthetic tooling cost |  | SYNTHETIC_FINANCIAL |
| `est_cost_saved_usd` | money | no | Estimated net cost impact (an estimate) | `est_hours_saved * review_hourly_cost - tooling_cost` | SYNTHETIC_FINANCIAL |

## `fact_interpretation_session`

**Grain:** One row per interpretation request/session (OPI, VRI or on-site)  
**Primary key:** `session_id`  
**Foreign keys:** `client_id` -> `dim_client.client_id`, `lp_id` -> `dim_language_pair.lp_id`, `interpreter_id` -> `dim_resource.resource_id`, `service_line_id` -> `dim_service_line.service_line_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `session_id` | string | no | Session ID (INT-######) |  | SYNTHETIC_IDENTIFIER |
| `client_id` | string | no | Client |  | SYNTHETIC_IDENTIFIER |
| `service_line_id` | enum | no | OPI, VRI or ONSITE | TRANSLATION, LOCALIZATION, ALT_FORMAT, OPI, VRI, ONSITE | SYNTHETIC_IDENTIFIER |
| `lp_id` | string | no | Non-English language of the session |  | SYNTHETIC_IDENTIFIER |
| `request_date` | date | no | Request date |  | SYNTHETIC_OPERATIONAL |
| `request_hour` | int | no | Hour of day 0-23 (synthetic local time) |  | SYNTHETIC_OPERATIONAL |
| `request_type` | enum | no | On-demand or scheduled | ON_DEMAND, SCHEDULED | SYNTHETIC_OPERATIONAL |
| `status` | enum | no | Outcome | FULFILLED, UNFULFILLED, CANCELLED_BY_CLIENT, TECH_FAILURE | SYNTHETIC_OPERATIONAL |
| `connect_seconds` | float | yes | Seconds to connect an interpreter (on-demand OPI/VRI); null otherwise |  | SYNTHETIC_OPERATIONAL |
| `duration_min` | float | no | Delivered minutes; 0 unless FULFILLED |  | SYNTHETIC_OPERATIONAL |
| `interpreter_id` | string | yes | Anonymised interpreter; null if not fulfilled |  | SYNTHETIC_IDENTIFIER |
| `rating` | int | yes | Optional client rating 1-5 |  | SYNTHETIC_OPERATIONAL |

## `fact_capacity_period`

**Grain:** One row per language pair x week (written work, words)  
**Primary key:** `capacity_id`  
**Foreign keys:** `lp_id` -> `dim_language_pair.lp_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `capacity_id` | string | no | Capacity row ID |  | SYNTHETIC_IDENTIFIER |
| `lp_id` | string | no | Language pair |  | SYNTHETIC_IDENTIFIER |
| `week_start` | date | no | Monday of the week |  | SYNTHETIC_OPERATIONAL |
| `demand_words` | int | no | Demand in words (actual starts for past weeks, forecast for future weeks) |  | SYNTHETIC_OPERATIONAL |
| `supply_words` | int | no | Qualified supply in words (sum of resource capacity x availability) |  | SYNTHETIC_OPERATIONAL |
| `confirmed_words` | int | no | Words already assigned/confirmed (<= demand) |  | SYNTHETIC_OPERATIONAL |
| `is_forecast` | bool | no | True for weeks after the as-of date |  | SYNTHETIC_OPERATIONAL |

## `fact_quality_evaluation`

**Grain:** One row per evaluated deliverable sample  
**Primary key:** `evaluation_id`  
**Foreign keys:** `batch_id` -> `fact_translation_batch.batch_id`, `resource_id` -> `dim_resource.resource_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `evaluation_id` | string | no | Evaluation ID (QE-#####) |  | SYNTHETIC_IDENTIFIER |
| `batch_id` | string | no | Evaluated batch |  | SYNTHETIC_IDENTIFIER |
| `resource_id` | string | no | Evaluated linguist (anonymised) |  | SYNTHETIC_IDENTIFIER |
| `evaluator_code` | string | no | Anonymised evaluator code |  | SYNTHETIC_IDENTIFIER |
| `eval_date` | date | no | Evaluation date |  | SYNTHETIC_OPERATIONAL |
| `framework` | enum | no | Single illustrative framework | ILLUSTRATIVE_MQM_STYLE | SYNTHETIC_OPERATIONAL |
| `sample_words` | int | no | Words sampled |  | SYNTHETIC_OPERATIONAL |
| `critical_count` | int | no | Critical errors |  | SYNTHETIC_OPERATIONAL |
| `major_count` | int | no | Major errors |  | SYNTHETIC_OPERATIONAL |
| `minor_count` | int | no | Minor errors |  | SYNTHETIC_OPERATIONAL |
| `score` | float | no | Quality score 0-100 | `max(0, 100 - (minor*1 + major*5 + critical*25) * 1000 / sample_words)` | SYNTHETIC_OPERATIONAL |
| `outcome` | enum | no | PASS if score >= 90 and critical = 0 | PASS, FAIL | SYNTHETIC_OPERATIONAL |
| `dispute_status` | enum | no | Dispute state | NONE, OPEN, RESOLVED | SYNTHETIC_OPERATIONAL |
| `corrective_action` | enum | no | Corrective action | COACHING, RETRAINING, TERMINOLOGY_UPDATE, PROCESS_FIX, NONE_REQUIRED | SYNTHETIC_OPERATIONAL |
| `corrective_status` | enum | no | Corrective action state | NA, OPEN, CLOSED | SYNTHETIC_OPERATIONAL |

## `fact_quality_error`

**Grain:** One row per logged error; counts reconcile to the evaluation  
**Primary key:** `error_id`  
**Foreign keys:** `evaluation_id` -> `fact_quality_evaluation.evaluation_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `error_id` | string | no | Error ID |  | SYNTHETIC_IDENTIFIER |
| `evaluation_id` | string | no | Evaluation |  | SYNTHETIC_IDENTIFIER |
| `category` | enum | no | Error category | ACCURACY, FLUENCY, TERMINOLOGY, STYLE, LOCALE_CONVENTION, DESIGN_FORMAT, OMISSION_ADDITION | SYNTHETIC_OPERATIONAL |
| `severity` | enum | no | Severity | MINOR, MAJOR, CRITICAL | SYNTHETIC_OPERATIONAL |

## `fact_revenue_line`

**Grain:** One row per recognised revenue line: one delivered written batch, or one client x month x interpretation modality  
**Primary key:** `revenue_id`  
**Foreign keys:** `client_id` -> `dim_client.client_id`, `project_id` -> `fact_project.project_id`, `batch_id` -> `fact_translation_batch.batch_id`, `month_id` -> `dim_date.month_id`, `service_line_id` -> `dim_service_line.service_line_id`, `lp_id` -> `dim_language_pair.lp_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `revenue_id` | string | no | Revenue line ID (REV-######) |  | SYNTHETIC_IDENTIFIER |
| `client_id` | string | no | Client |  | SYNTHETIC_IDENTIFIER |
| `project_id` | string | yes | Project (written lines) |  | SYNTHETIC_IDENTIFIER |
| `batch_id` | string | yes | Batch (written lines) |  | SYNTHETIC_IDENTIFIER |
| `month_id` | string | no | Recognition month (delivery month for written; service month for interpretation) |  | SYNTHETIC_IDENTIFIER |
| `service_line_id` | enum | no | Exclusive service line | TRANSLATION, LOCALIZATION, ALT_FORMAT, OPI, VRI, ONSITE | SYNTHETIC_IDENTIFIER |
| `lp_id` | string | yes | Language pair (written lines only) |  | SYNTHETIC_IDENTIFIER |
| `workflow_id` | enum | yes | Workflow (written lines only) | HT, MTPE, AIR | SYNTHETIC_IDENTIFIER |
| `units` | int | no | Words (written) or fulfilled minutes (interpretation) |  | SYNTHETIC_OPERATIONAL |
| `unit_type` | enum | no | Unit type | WORD, MINUTE | SYNTHETIC_OPERATIONAL |
| `price_per_unit_original` | float | no | Price per unit in billing currency |  | SYNTHETIC_OPERATIONAL |
| `currency` | enum | no | Billing currency | USD, EUR, GBP | SYNTHETIC_OPERATIONAL |
| `revenue_original` | money | no | Recognised revenue in billing currency |  | SYNTHETIC_FINANCIAL |
| `fx_usd_per_unit` | float | no | Fixed FX rate applied |  | SYNTHETIC_OPERATIONAL |
| `revenue_usd` | money | no | Recognised revenue in USD (canonical) | `round_half_up(revenue_original * fx_usd_per_unit, 2)` | SYNTHETIC_FINANCIAL |

## `fact_cost_line`

**Grain:** One row per cost: direct cost per revenue line and category, or monthly operating expense / D&A  
**Primary key:** `cost_id`  
**Foreign keys:** `month_id` -> `dim_date.month_id`, `revenue_id` -> `fact_revenue_line.revenue_id`, `service_line_id` -> `dim_service_line.service_line_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `cost_id` | string | no | Cost line ID (COST-######) |  | SYNTHETIC_IDENTIFIER |
| `month_id` | string | no | Cost month |  | SYNTHETIC_IDENTIFIER |
| `cost_class` | enum | no | DIRECT, OPEX or DA | DIRECT, OPEX, DA | SYNTHETIC_OPERATIONAL |
| `cost_category` | enum | no | Cost category | VENDOR_LINGUIST, INTERPRETER_PAY, MT_AI_TOOLING, PLATFORM_TELECOM, PM_DISPATCH_LABOR, SALES_MARKETING, TECHNOLOGY_PRODUCT, GENERAL_ADMIN, DEPRECIATION_AMORTIZATION | SYNTHETIC_OPERATIONAL |
| `revenue_id` | string | yes | Revenue line the direct cost is attributed to; null for OPEX/DA |  | SYNTHETIC_IDENTIFIER |
| `service_line_id` | enum | yes | Service line (direct costs) | TRANSLATION, LOCALIZATION, ALT_FORMAT, OPI, VRI, ONSITE | SYNTHETIC_IDENTIFIER |
| `amount_usd` | money | no | Cost in USD (costs are USD-denominated in the demo) |  | SYNTHETIC_FINANCIAL |

## `fact_invoice_line`

**Grain:** One row per invoice line: client x service line x billed revenue month  
**Primary key:** `invoice_line_id`  
**Foreign keys:** `client_id` -> `dim_client.client_id`, `service_line_id` -> `dim_service_line.service_line_id`, `revenue_month_id` -> `dim_date.month_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `invoice_line_id` | string | no | Invoice line ID |  | SYNTHETIC_IDENTIFIER |
| `invoice_id` | string | no | Invoice (one per client per billing date) |  | SYNTHETIC_IDENTIFIER |
| `client_id` | string | no | Client |  | SYNTHETIC_IDENTIFIER |
| `service_line_id` | enum | no | Service line | TRANSLATION, LOCALIZATION, ALT_FORMAT, OPI, VRI, ONSITE | SYNTHETIC_IDENTIFIER |
| `revenue_month_id` | string | no | Revenue month being billed |  | SYNTHETIC_IDENTIFIER |
| `invoice_date` | date | no | Invoice date (billing in arrears, early next month) |  | SYNTHETIC_OPERATIONAL |
| `due_date` | date | no | Payment due date |  | SYNTHETIC_OPERATIONAL |
| `currency` | enum | no | Currency | USD, EUR, GBP | SYNTHETIC_OPERATIONAL |
| `amount_original` | money | no | Invoiced amount in billing currency |  | SYNTHETIC_FINANCIAL |
| `fx_usd_per_unit` | float | no | Fixed FX rate |  | SYNTHETIC_OPERATIONAL |
| `amount_usd` | money | no | Invoiced amount in USD |  | SYNTHETIC_FINANCIAL |
| `adjustment_fraction` | sfraction | no | Invoice adjustment vs recognised revenue (credits/uplifts) |  | SYNTHETIC_OPERATIONAL |

## `fact_payment`

**Grain:** One row per customer cash receipt  
**Primary key:** `payment_id`  
**Foreign keys:** `client_id` -> `dim_client.client_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `payment_id` | string | no | Payment ID |  | SYNTHETIC_IDENTIFIER |
| `client_id` | string | no | Client |  | SYNTHETIC_IDENTIFIER |
| `payment_date` | date | no | Receipt date |  | SYNTHETIC_OPERATIONAL |
| `currency` | enum | no | Currency | USD, EUR, GBP | SYNTHETIC_OPERATIONAL |
| `amount_original` | money | no | Cash received in currency |  | SYNTHETIC_FINANCIAL |
| `amount_usd` | money | no | Cash received in USD |  | SYNTHETIC_FINANCIAL |

## `bridge_payment_invoice`

**Grain:** One row per payment x invoice line allocation  
**Primary key:** `payment_id+invoice_line_id`  
**Foreign keys:** `payment_id` -> `fact_payment.payment_id`, `invoice_line_id` -> `fact_invoice_line.invoice_line_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `payment_id` | string | no | Payment |  | SYNTHETIC_IDENTIFIER |
| `invoice_line_id` | string | no | Invoice line |  | SYNTHETIC_IDENTIFIER |
| `allocated_original` | money | no | Allocated amount in currency |  | SYNTHETIC_FINANCIAL |
| `allocated_usd` | money | no | Allocated amount in USD |  | SYNTHETIC_FINANCIAL |

## `fact_kpi_target_period`

**Grain:** One row per month x KPI illustrative target  
**Primary key:** `target_id`  
**Foreign keys:** `month_id` -> `dim_date.month_id`, `kpi_id` -> `dim_kpi_definition.kpi_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `target_id` | string | no | Target ID |  | SYNTHETIC_IDENTIFIER |
| `month_id` | string | no | Month |  | SYNTHETIC_IDENTIFIER |
| `kpi_id` | string | no | KPI code |  | SYNTHETIC_IDENTIFIER |
| `target_value` | float | no | Illustrative target (USD for revenue, fraction for ratios) |  | SYNTHETIC_OPERATIONAL |

## `fact_client_period_snapshot`

**Grain:** One row per client x quarter-end (and as-of month) health snapshot  
**Primary key:** `snapshot_id`  
**Foreign keys:** `client_id` -> `dim_client.client_id`, `snapshot_month_id` -> `dim_date.month_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `snapshot_id` | string | no | Snapshot ID |  | SYNTHETIC_IDENTIFIER |
| `client_id` | string | no | Client |  | SYNTHETIC_IDENTIFIER |
| `snapshot_month_id` | string | no | Month of snapshot |  | SYNTHETIC_IDENTIFIER |
| `health_score` | fraction | no | Composite health score 0..1 | `0.30*otd_90d + 0.25*quality_norm + 0.20*payment_timeliness + 0.25*revenue_trend_norm (weights renormalised if a component is missing)` | SYNTHETIC_OPERATIONAL |
| `health_band` | enum | no | HEALTHY >= 0.70, WATCH >= 0.50, otherwise AT_RISK | HEALTHY, WATCH, AT_RISK | SYNTHETIC_OPERATIONAL |
| `ttm_revenue_usd` | money | no | Trailing-12-month recognised revenue in USD |  | SYNTHETIC_FINANCIAL |
| `otd_90d` | fraction | yes | Trailing 90-day on-time delivery |  | SYNTHETIC_OPERATIONAL |
| `quality_norm` | fraction | yes | Average quality score mapped (score-80)/20 and clipped to 0..1 |  | SYNTHETIC_OPERATIONAL |
| `payment_timeliness` | fraction | yes | Share of trailing-180-day invoices paid within terms |  | SYNTHETIC_OPERATIONAL |
| `revenue_trend_norm` | fraction | yes | Trailing-3-month vs prior-3-month revenue mapped to 0..1 |  | SYNTHETIC_OPERATIONAL |

## `fact_integration_telemetry`

**Grain:** One row per SIMULATED connector x day  
**Primary key:** `telemetry_id`  
**Foreign keys:** `connector_id` -> `dim_connector.connector_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `telemetry_id` | string | no | Telemetry ID |  | SYNTHETIC_IDENTIFIER |
| `connector_id` | string | no | Connector |  | SYNTHETIC_IDENTIFIER |
| `date` | date | no | Day |  | SYNTHETIC_OPERATIONAL |
| `monitored_minutes` | int | no | Minutes monitored (1440) |  | SYNTHETIC_OPERATIONAL |
| `up_minutes` | int | no | Minutes up (<= monitored) |  | SYNTHETIC_OPERATIONAL |
| `requests` | int | no | Simulated requests |  | SYNTHETIC_OPERATIONAL |
| `errors_4xx` | int | no | Simulated 4xx errors |  | SYNTHETIC_OPERATIONAL |
| `errors_5xx` | int | no | Simulated 5xx errors |  | SYNTHETIC_OPERATIONAL |
| `errors_timeout` | int | no | Simulated timeouts |  | SYNTHETIC_OPERATIONAL |
| `records_ingested` | int | no | Simulated records ingested |  | SYNTHETIC_OPERATIONAL |
| `p50_ms` | float | no | Median latency (ms) |  | SYNTHETIC_OPERATIONAL |
| `p95_ms` | float | no | 95th percentile latency (ms) |  | SYNTHETIC_OPERATIONAL |
| `p99_ms` | float | no | 99th percentile latency (ms) |  | SYNTHETIC_OPERATIONAL |

## `fact_risk_alert`

**Grain:** One row per synthetic alert, produced by documented rules over the generated facts  
**Primary key:** `alert_id`  
**Foreign keys:** `owner_id` -> `dim_owner.owner_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `alert_id` | string | no | Alert ID (ALT-####) |  | SYNTHETIC_IDENTIFIER |
| `raised_date` | date | no | Raised date |  | SYNTHETIC_OPERATIONAL |
| `severity` | enum | no | Severity | CRITICAL, HIGH, MEDIUM, LOW | SYNTHETIC_OPERATIONAL |
| `domain` | enum | no | Domain | DELIVERY, CLIENT, CAPACITY, QUALITY, FINANCE, TECHNOLOGY, COMPLIANCE | SYNTHETIC_OPERATIONAL |
| `rule_id` | string | no | Rule that produced the alert |  | SYNTHETIC_IDENTIFIER |
| `entity_type` | string | no | Entity type |  | SYNTHETIC_OPERATIONAL |
| `entity_id` | string | no | Entity ID |  | SYNTHETIC_IDENTIFIER |
| `description` | string | no | Alert description |  | SYNTHETIC_OPERATIONAL |
| `trigger_text` | string | no | Trigger condition and values |  | SYNTHETIC_OPERATIONAL |
| `likelihood` | int | no | Likelihood 1-5 |  | SYNTHETIC_OPERATIONAL |
| `impact` | int | no | Impact 1-5 |  | SYNTHETIC_OPERATIONAL |
| `exposure_usd` | money | no | Estimated exposure in USD (illustrative) |  | SYNTHETIC_FINANCIAL |
| `recommended_action` | string | no | Recommended action |  | SYNTHETIC_OPERATIONAL |
| `owner_id` | string | no | Owner |  | SYNTHETIC_IDENTIFIER |
| `status` | enum | no | Initial state | OPEN, IN_PROGRESS, RESOLVED | SYNTHETIC_OPERATIONAL |
| `link_path` | string | no | Dashboard route for the action link |  | SYNTHETIC_OPERATIONAL |

## `fact_okr`

**Grain:** One row per key result  
**Primary key:** `okr_id`  
**Foreign keys:** `owner_id` -> `dim_owner.owner_id`, `metric_kpi_id` -> `dim_kpi_definition.kpi_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `okr_id` | string | no | OKR ID |  | SYNTHETIC_IDENTIFIER |
| `pillar` | string | no | Strategic pillar |  | SYNTHETIC_OPERATIONAL |
| `objective` | string | no | Objective |  | SYNTHETIC_OPERATIONAL |
| `key_result` | string | no | Key result |  | SYNTHETIC_OPERATIONAL |
| `owner_id` | string | no | Owner |  | SYNTHETIC_IDENTIFIER |
| `metric_kpi_id` | string | yes | KPI measured |  | SYNTHETIC_IDENTIFIER |
| `baseline_value` | float | no | Baseline value |  | SYNTHETIC_OPERATIONAL |
| `target_value` | float | no | Target value |  | SYNTHETIC_OPERATIONAL |
| `current_value` | float | no | Current value computed from generated facts |  | SYNTHETIC_OPERATIONAL |
| `progress` | fraction | no | Progress toward target 0..1 |  | SYNTHETIC_OPERATIONAL |
| `status` | enum | no | Status | ON_TRACK, AT_RISK, OFF_TRACK, COMPLETE | SYNTHETIC_OPERATIONAL |
| `target_date` | date | no | Target date |  | SYNTHETIC_OPERATIONAL |

## `fact_scenario_assumption_set`

**Grain:** One row per named scenario assumption set  
**Primary key:** `set_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `set_id` | string | no | Set ID |  | SYNTHETIC_IDENTIFIER |
| `set_name` | string | no | Name |  | SYNTHETIC_OPERATIONAL |
| `ai_adoption_delta` | fraction | no | Added AI-touched share of written words (absolute, 0..1) |  | SYNTHETIC_OPERATIONAL |
| `price_adjustment` | sfraction | no | Client pricing adjustment |  | SYNTHETIC_OPERATIONAL |
| `vendor_inflation` | sfraction | no | Vendor-rate inflation |  | SYNTHETIC_OPERATIONAL |
| `volume_growth` | sfraction | no | Volume growth |  | SYNTHETIC_OPERATIONAL |
| `formula_version` | string | no | Scenario formula version |  | SYNTHETIC_OPERATIONAL |
| `description` | string | no | Description |  | SYNTHETIC_OPERATIONAL |

## `fact_scenario_output`

**Grain:** One row per assumption set: reference outputs computed by the Python formula implementation  
**Primary key:** `output_id`  
**Foreign keys:** `set_id` -> `fact_scenario_assumption_set.set_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `output_id` | string | no | Output ID |  | SYNTHETIC_IDENTIFIER |
| `set_id` | string | no | Assumption set |  | SYNTHETIC_IDENTIFIER |
| `formula_version` | string | no | Formula version |  | SYNTHETIC_OPERATIONAL |
| `revenue_usd` | money | no | Scenario revenue (12-month basis) |  | SYNTHETIC_FINANCIAL |
| `gross_profit_usd` | money | no | Scenario gross profit |  | SYNTHETIC_FINANCIAL |
| `gross_margin` | fraction | no | Scenario gross margin |  | SYNTHETIC_OPERATIONAL |
| `ebitda_usd` | money | no | Scenario EBITDA |  | SYNTHETIC_FINANCIAL |
| `ebitda_margin` | sfraction | no | Scenario EBITDA margin |  | SYNTHETIC_OPERATIONAL |
| `ebitda_delta_vs_base_usd` | money | no | EBITDA delta vs baseline (may be negative) |  | SYNTHETIC_FINANCIAL |
| `capacity_gap_words` | float | no | Required less available human words (positive = shortfall) |  | SYNTHETIC_OPERATIONAL |

## `fact_data_quality_check`

**Grain:** One row per validation check executed by the generator  
**Primary key:** `check_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `check_id` | string | no | Check ID |  | SYNTHETIC_IDENTIFIER |
| `entity` | string | no | Entity checked |  | SYNTHETIC_OPERATIONAL |
| `check_name` | string | no | Check name |  | SYNTHETIC_OPERATIONAL |
| `dimension` | enum | no | Quality dimension | COMPLETENESS, UNIQUENESS, VALIDITY, CONSISTENCY, INTEGRITY, RECONCILIATION | SYNTHETIC_OPERATIONAL |
| `rows_checked` | int | no | Rows checked |  | SYNTHETIC_OPERATIONAL |
| `rows_failed` | int | no | Rows failing |  | SYNTHETIC_OPERATIONAL |
| `passed` | bool | no | Check result |  | SYNTHETIC_OPERATIONAL |
| `detail` | string | no | Detail |  | SYNTHETIC_OPERATIONAL |

## `fact_feedback_sample`

**Grain:** One row per seeded fictional feedback example  
**Primary key:** `feedback_id`  

| Field | Type | Null | Description | Enum / formula | Classification |
|---|---|---|---|---|---|
| `feedback_id` | string | no | Feedback ID |  | SYNTHETIC_IDENTIFIER |
| `category` | string | no | Category |  | SYNTHETIC_OPERATIONAL |
| `rating` | int | no | Rating 1-5 |  | SYNTHETIC_OPERATIONAL |
| `comment` | string | no | Fictional comment |  | SYNTHETIC_OPERATIONAL |
| `role_label` | string | no | Fictional role label |  | SYNTHETIC_OPERATIONAL |
| `submitted_date` | date | no | Fictional date |  | SYNTHETIC_OPERATIONAL |

