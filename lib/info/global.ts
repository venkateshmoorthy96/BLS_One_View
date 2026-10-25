// Explanations for the global header controls. Derived from lib/filters.ts and the page code. Pure module.
import type { InfoContent } from "./types";

export const PERIOD_INFO: InfoContent = {
  title: "Reporting period",
  summary: "Chooses the whole calendar months that KPIs, charts and tables on most tabs are calculated over.",
  meaning: "The selected range is stored in the page URL (?range=…), so any view can be shared or bookmarked.",
  calculation: [
    "Year to date: 2026-01 to 2026-09.",
    "Quarter to date and Last 3 months: the latest 3 months (2026-07 to 2026-09).",
    "Trailing 12 months: 2025-10 to 2026-09. Last 6 months: 2026-04 to 2026-09.",
    "Latest month: 2026-09. All data: 2024-01 to 2026-09 (33 months).",
    "Custom: any span of whole months between 2024-01 and 2026-09.",
  ],
  comparison: "KPI cards that show a change compare with the prior period: the same months of 2025 for Year to date, otherwise the equal-length window just before the selection. There is no comparison for All data, or when that window would start before 2024-01.",
  source: "lib/filters.ts (windowMonths, priorMonths). Synthetic demo data ends at the 30 Sep 2026 cut-off.",
  caveats: [
    "Ranges are whole months, not days, so every figure reconciles to monthly revenue and cost.",
    "Ignored by: Capacity & Demand (fixed 26-week window), Technology & Integration (fixed 90 days), Risk & Alerts, Data Governance, and Forecasting & Scenarios (always the trailing 12 months).",
    "Always measured at the cut-off regardless of range: net revenue retention, DSO, open pipeline, active resources, client health bands and the active translation pipeline.",
  ],
  basis: { kind: "code", text: "Derived from lib/filters.ts" },
};

/** Built on the server from dim_fx_rate.csv and passed to the filter bar, so the text always shows the rates in use. */
export function currencyInfo(rates: { currency: string; usdPerUnit: number; version: string }[]): InfoContent {
  const shown = rates.filter((r) => r.currency !== "USD").map((r) => `1 ${r.currency} = ${r.usdPerUnit} USD`).join(" and ");
  return {
  title: "Reporting currency",
  summary: "Changes how money is displayed (USD, EUR or GBP). Underlying amounts are stored in USD.",
  calculation: [
    `Displayed amount = USD total ÷ rate, with ${shown} (rate set ${rates[0]?.version ?? "n/a"}).`,
    "Conversion is applied once to aggregated totals and rounded only for display, to avoid rounding drift.",
  ],
  source: "public/data/dim_fx_rate.csv (synthetic demo data), read by fxRate() in lib/data/store.ts.",
  caveats: [
    "Fixed illustrative rates, not market rates; percentages and ratios are unaffected.",
    "Some values always stay in USD: alert exposure on Risk & Alerts, money values in the OKR table, and resource rates on HR & Workforce.",
  ],
  basis: { kind: "code", text: "Derived from dim_fx_rate.csv" },
  };
}

export const BU_INFO: InfoContent = {
  title: "Business unit",
  summary: "Limits client-based figures to clients assigned to the selected synthetic unit (Alpha, Beta or Gamma).",
  calculation: [
    "Revenue lines, translation batches, interpretation sessions, quality evaluations and receivables are kept when their client's business unit matches.",
    "Operating expenses are company-level; with a unit selected they are allocated to it in proportion to its share of revenue, so EBITDA becomes an allocation.",
  ],
  source: "dim_client.business_unit (synthetic demo data).",
  caveats: [
    "Not applied on Sales & Marketing, HR & Workforce, Capacity & Demand, Technology & Integration, Risk & Alerts, Data Governance or Forecasting & Scenarios.",
    "On Client & Revenue, the client health band chart is not filtered by business unit.",
    "On Executive Strategy, the revenue plan is scaled by the unit's share of revenue, because plans exist only at company level.",
  ],
  basis: { kind: "code", text: "Derived from page and KPI code" },
};

export const RESET_INFO: InfoContent = {
  title: "Reset",
  summary: "Clears every filter in the page URL and returns to Year to date, USD and all business units.",
  caveats: ["Also clears page-specific URL filters such as ?tier=, ?lp= or ?stage=."],
  basis: { kind: "code", text: "Derived from components/FilterBar.tsx" },
};
