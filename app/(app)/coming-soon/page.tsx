import { PageHeader } from "@/components/ui";
const ITEMS = [
  ["Live data connectors", "Replace synthetic data with feeds from the translation management, telephony, CRM and finance systems."],
  ["Statistical forecasting", "Seasonality-aware demand forecasts with backtested error measures and proper prediction intervals."],
  ["Role-based views", "Executive, sales and operations dashboards with permissions per role."],
  ["Narrative summaries", "Auto-written monthly commentary that explains the movements behind each KPI."],
  ["Alert delivery", "Email and chat notifications with acknowledgement and ownership saved centrally."],
  ["Client-facing reporting", "Branded quality and delivery reports shared with clients."],
];
export default function Page() {
  return (<>
    <PageHeader title="Coming Soon" sub="Concept: capabilities that are intentionally not built in this demo." />
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {ITEMS.map(([t, d]) => <article key={t} className="card p-4"><div className="mb-1 inline-block rounded border border-[var(--line-strong)] px-1.5 text-[11px] text-[var(--ink-2)]">Not built</div><h3 className="font-semibold">{t}</h3><p className="text-sm text-[var(--ink-2)]">{d}</p></article>)}
    </div>
  </>);
}
