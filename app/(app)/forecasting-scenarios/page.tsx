import { PageHeader, Note } from "@/components/ui";
import ScenarioClient from "./ScenarioClient";
import { parseFilters, MONTHS, type SP } from "@/lib/filters";
import { scenarioBaseline, scenarioSettings, monthlySeries } from "@/lib/kpi/core";
import { fxRate } from "@/lib/data/store";
import { X } from "@/lib/info/registry";

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const f = parseFilters(await searchParams);
  const base = scenarioBaseline();
  const settings = scenarioSettings();
  const monthlyRev = monthlySeries("ALL", MONTHS.slice(-12)).map((m) => ({ month: m.month, rev: m.rev }));
  return (
    <>
      <PageHeader title="Forecasting & Scenarios" sub="Adjust four drivers and see the effect on revenue, margin, EBITDA and capacity. Baseline is the trailing 12 months." />
      <ScenarioClient base={base} cur={f.cur} fx={fxRate(f.cur)} settings={settings} monthlyRev={monthlyRev} info={{ drivers: X("sc.drivers"), revenue: X("sc.revenue"), gm: X("sc.gm"), ebitda: X("sc.ebitda"), em: X("sc.em"), ai: X("sc.ai"), gap: X("sc.gap"), bars: X("sc.bars"), traj: X("sc.traj") }} />
      <div className="mt-4"><Note>Formula version SCN-F1.0 (see docs/architecture.md). The baseline preset reproduces trailing-12-month EBITDA exactly. This tab always uses all business units and the trailing 12 months, regardless of the global range.</Note></div>
    </>
  );
}
