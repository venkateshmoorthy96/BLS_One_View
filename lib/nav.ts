export type NavItem = { slug: string; label: string; group: "Core" | "Secondary" | "Concept" };
export const NAV: NavItem[] = [
  { slug: "overview", label: "Overview", group: "Core" },
  { slug: "executive-strategy", label: "Executive Strategy", group: "Core" },
  { slug: "client-revenue", label: "Client & Revenue", group: "Core" },
  { slug: "translation-ops", label: "Translation Ops", group: "Core" },
  { slug: "interpretation-ops", label: "Interpretation Ops", group: "Core" },
  { slug: "finance-profitability", label: "Finance & Profitability", group: "Core" },
  { slug: "ai-automation", label: "AI & Automation", group: "Core" },
  { slug: "forecasting-scenarios", label: "Forecasting & Scenarios", group: "Core" },
  { slug: "sales-marketing", label: "Sales & Marketing", group: "Secondary" },
  { slug: "quality-compliance", label: "Quality & Compliance", group: "Secondary" },
  { slug: "hr-workforce", label: "HR & Workforce", group: "Secondary" },
  { slug: "capacity-demand", label: "Capacity & Demand", group: "Secondary" },
  { slug: "technology-integration", label: "Technology & Integration", group: "Secondary" },
  { slug: "risk-alerts", label: "Risk & Alerts", group: "Secondary" },
  { slug: "data-governance", label: "Data Governance", group: "Secondary" },
  { slug: "enhancement", label: "Enhancement", group: "Concept" },
  { slug: "coming-soon", label: "Coming Soon", group: "Concept" },
  { slug: "feedback", label: "Feedback", group: "Concept" },
];
export const GLOBAL_PARAMS = ["range", "from", "to", "cur", "bu"];
