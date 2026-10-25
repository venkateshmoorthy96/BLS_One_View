# Overview tab - wireframe (as built)

```
+----------------------------------------------------------------------------------------------------------+
| [menu]  BIG logo | BLS OneView                                                                           |
| [DEMO / SYNTHETIC DATA] (i)  Range [Year to date v] (i)  Currency [USD v] (i)  Unit [All v] (i)  [Reset]  [Sign out] |
+-----------+----------------------------------------------------------------------------------------------+
| Core tabs | Overview                                                                                     |
|  Overview | One-screen executive health check ...                       (Period: 2026-01 to 2026-09)     |
|  ...      |                                                                                              |
| Secondary | [Revenue (i)[+]] [Gross margin] [EBITDA margin] [Active clients] [NRR (TTM)]                  |
|  ...      | [Translation OTD] [OPI speed to answer] [AI-touched share] [Quality score] [DSO (days)]        |
| Concept   |   value, ▲/▼ change vs prior period (green = favourable), or "no prior period"               |
|  ...      |                                                                                              |
|           | +--------------------------------------------+ +--------------------------------------------+ |
|           | | Revenue and EBITDA by month (i) [+]        | | Revenue by service line (i) [+]            | |
|           | | bars = revenue, line = EBITDA, 33 months   | | horizontal bars, selected period           | |
|           | +--------------------------------------------+ +--------------------------------------------+ |
|           | +------------------------------------------------------------------------------------------+ |
|           | | Open alerts (rule-derived, top 8 by severity) (i) [+]                                    | |
|           | | table: severity, domain, alert, exposure (USD) - search, sort, page, export CSV          | |
|           | +------------------------------------------------------------------------------------------+ |
|           | Note: all figures are synthetic; money in the selected currency at fixed rates               |
+-----------+----------------------------------------------------------------------------------------------+
(i) = info explanation   [+] = Expand analysis
```

## Behaviour

- **Filters** (range, currency, unit) live in the header and write URL params; every KPI, chart and table on the page recomputes from the same context. The sidebar links keep them when switching tabs. Reset clears all parameters.
- **KPI cards** show the value, the change vs the prior period (relative %, or percentage points for ratios), an "i" explanation and an expand button. NRR and DSO have no comparison because they are measured at the 2026-09-30 cut-off. A zero denominator shows N/A.
- **Expand analysis** on a card opens a full-screen view: selected vs prior period, target vs actual where a target exists, a 33-month trend, breakdowns by business unit, service line, client, tier or vertical (with drill-down), largest movers and generated insight text.
- **Charts:** the monthly chart always shows all 33 months (business-unit filter applies); the service-line chart uses the selected period. Clicking a chart does not filter the page.
- **Alerts table:** the 8 most severe open or in-progress alerts; the full list with rules and recommended actions is on Risk & Alerts. Not filtered by period or business unit.
- **Mobile:** the sidebar collapses into a menu drawer; KPI cards stack; charts resize.
- **Disclosure:** the DEMO / SYNTHETIC DATA badge in the header (with its own explanation), plus the note at the bottom of the page.
