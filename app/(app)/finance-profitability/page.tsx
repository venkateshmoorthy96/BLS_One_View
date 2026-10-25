import { PageHeader, Grid, ChartCard, Note } from "@/components/ui";
import KpiCard from "@/components/KpiCard";
import EChart from "@/components/EChart";
import DataTable from "@/components/DataTable";
import { parseFilters, MONTHS, AS_OF, type SP } from "@/lib/filters";
import { core, dso, receivables, monthlySeries, sum } from "@/lib/kpi/core";
import { groupBy, SL_LABEL } from "@/lib/kpi/agg";
import { getStore, fxRate } from "@/lib/data/store";
import { K, X } from "@/lib/info/registry";

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const OPEX_NOTE = "With a business unit selected, company operating expenses are allocated to it in proportion to its share of revenue.";
  const DSO_INFO = K("DSO", { caveats: ["Always measured at the 30 Sep 2026 cut-off; the dictionary describes the range end, but the app ignores the selected range for DSO.", "Simplified demo formula, not a statutory DSO."], basis: { kind: "mismatch", text: "KPI dictionary DSO · app measures at the cut-off, not the range end" } });
  const f = parseFilters(await searchParams);
  const S = getStore();
  const k = core(f.months, f.bu), p = f.prior ? core(f.prior, f.bu) : null;
  const fx = fxRate(f.cur);
  const d = dso(undefined, f.bu);
  const ms = new Set(f.months);
  const rev = S.revenue.filter((r) => ms.has(r.month_id) && (f.bu === "ALL" || r.bu === f.bu));
  const cat = (c: string) => sum(rev.map((r) => r.cost[c] ?? 0));
  const share = k.OPEX! / Math.max(1, sum(f.months.map((m) => S.opexByMonth.get(m) ?? 0)));
  const oc = (c: string) => sum(f.months.map((m) => S.opexByMonthCat.get(m)?.get(c) ?? 0)) * share;
  const pl = [
    ["Revenue", k.REV!, 1], ["Vendor linguist cost", -cat("VENDOR_LINGUIST"), 0], ["Interpreter pay", -cat("INTERPRETER_PAY"), 0], ["MT / AI tooling", -cat("MT_AI_TOOLING"), 0],
    ["Platform and telecom", -cat("PLATFORM_TELECOM"), 0], ["PM and dispatch labour", -cat("PM_DISPATCH_LABOR"), 0], ["Gross profit", k.GP!, 1],
    ["Sales and marketing", -oc("SALES_MARKETING"), 0], ["Technology and product", -oc("TECHNOLOGY_PRODUCT"), 0], ["General and admin", -oc("GENERAL_ADMIN"), 0], ["EBITDA", k.EBITDA!, 1],
  ].map(([line, v, b]) => ({ line, amount: (v as number) / fx, pct: (v as number) / k.REV!, bold: b }));
  const series = monthlySeries(f.bu);
  const bySl = [...groupBy(rev, (r) => r.service_line_id as string).entries()].map(([sl, rs]) => { const r_ = sum(rs.map((x) => x.revenue_usd)), dc = sum(rs.map((x) => x.direct)); return { sl: SL_LABEL[sl], revenue: r_ / fx, direct: dc / fx, gm: (r_ - dc) / r_ }; }).sort((a, b) => b.revenue - a.revenue);
  const { inv } = receivables(AS_OF, f.bu);
  const open = inv.filter((i) => i.open_usd > 1);
  const bucket = (i: { due_date: string }) => { const dd = (Date.parse(AS_OF) - Date.parse(i.due_date)) / 864e5; return dd <= 0 ? "Not yet due" : dd <= 30 ? "1–30" : dd <= 60 ? "31–60" : dd <= 90 ? "61–90" : "90+"; };
  const order = ["Not yet due", "1–30", "31–60", "61–90", "90+"];
  const aging = order.map((b) => sum(open.filter((i) => bucket(i) === b).map((i) => i.open_usd)) / fx);
  const arClient = [...groupBy(open, (i) => i.client_id).entries()].map(([c, is]) => ({ client: S.clientById.get(c)!.client_name, currency: S.clientById.get(c)!.billing_currency, open: sum(is.map((i) => i.open_usd)) / fx, overdue: sum(is.filter((i) => i.due_date < AS_OF).map((i) => i.open_usd)) / fx })).sort((a, b) => b.open - a.open);
  return (
    <>
      <PageHeader title="Finance & Profitability" sub="From revenue to EBITDA, margin trend by service line, and receivables health." period={f.label} />
      <Grid cols={5}>
        <KpiCard info={K("REV")} expand="REV" label="Revenue" value={k.REV! / fx} prior={p ? p.REV! / fx : undefined} f="money" cur={f.cur} />
        <KpiCard info={K("GP")} expand="GP" label="Gross profit" value={k.GP! / fx} prior={p ? p.GP! / fx : undefined} f="money" cur={f.cur} />
        <KpiCard info={K("GM")} expand="GM" label="Gross margin" value={k.GM} prior={p?.GM} f="pct1" kind="pp" />
        <KpiCard info={K("EBITDA_M", { caveats: [OPEX_NOTE] })} expand="EBITDA_M" label="EBITDA margin" value={k.EBITDA_M} prior={p?.EBITDA_M} f="pct1" kind="pp" />
        <KpiCard info={DSO_INFO} expand="DSO" label="DSO (days)" value={d.DSO} f="dec1" good="down" hint="Open AR ÷ invoiced in last 90 days × 90" />
      </Grid>
      <Grid cols={2}>
        <ChartCard info={X("fi.margin")} expand="GM" title="Margin trend" note="Gross margin and EBITDA margin by month"><EChart label="Margin trend" format="pct1" option={{ xAxis: { type: "category", data: MONTHS }, yAxis: { type: "value" }, series: [{ name: "Gross margin", type: "line", data: series.map((s) => +(s.gp / s.rev).toFixed(4)), symbolSize: 5 }, { name: "EBITDA margin", type: "line", data: series.map((s) => +(s.ebitda / s.rev).toFixed(4)), symbolSize: 5 }] }} /></ChartCard>
        <ChartCard info={X("fi.aging")} expand="DSO" title="Accounts receivable aging" note={`Open balance by days past due, ${f.cur}, as at ${AS_OF}`}><EChart label="AR aging" format="money" cur={f.cur} option={{ legend: { show: false }, xAxis: { type: "category", data: order }, yAxis: { type: "value" }, series: [{ type: "bar", data: aging.map((v) => +v.toFixed(0)), barMaxWidth: 40 }] }} /></ChartCard>
      </Grid>
      <Grid cols={2}>
        <ChartCard info={X("fi.pnl")} expand="EBITDA" title="Profit and loss bridge" note={`${f.cur}; OPEX shown allocated pro-rata to revenue when a business unit is selected`}>
          <DataTable name="pnl" pageSize={25} cols={[{ key: "line", label: "Line" }, { key: "amount", label: f.cur, fmt: "num" }, { key: "pct", label: "% of revenue", fmt: "pct1" }]} rows={pl} />
        </ChartCard>
        <ChartCard info={X("fi.bySl")} expand="GM" title="Margin by service line"><DataTable name="margin-by-service" cols={[{ key: "sl", label: "Service line" }, { key: "revenue", label: `Revenue (${f.cur})`, fmt: "num" }, { key: "direct", label: `Direct cost (${f.cur})`, fmt: "num" }, { key: "gm", label: "Gross margin", fmt: "pct1" }]} rows={bySl} /></ChartCard>
      </Grid>
      <ChartCard info={X("fi.arClient")} expand="DSO" title="Open receivables by client"><DataTable name="ar-by-client" cols={[{ key: "client", label: "Client" }, { key: "currency", label: "Billing currency" }, { key: "open", label: `Open (${f.cur})`, fmt: "num" }, { key: "overdue", label: `Overdue (${f.cur})`, fmt: "num" }]} rows={arClient} /></ChartCard>
      <div className="mt-4"><Note>Revenue, invoices, cash and receivables are separate measures. Amounts are converted once from USD totals at fixed illustrative rates. Costs are recorded in USD only.</Note></div>
    </>
  );
}
