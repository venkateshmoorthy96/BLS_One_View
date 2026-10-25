import { PageHeader, Grid, ChartCard, Note } from "@/components/ui";
import KpiCard from "@/components/KpiCard";
import EChart from "@/components/EChart";
import DataTable from "@/components/DataTable";
import { parseFilters, MONTHS, pick, type SP } from "@/lib/filters";
import { core } from "@/lib/kpi/core";
import { groupBy, SL_LABEL } from "@/lib/kpi/agg";
import { getStore } from "@/lib/data/store";
import { K, X } from "@/lib/info/registry";

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const f = parseFilters(sp);
  const modF = pick(sp, "mod");
  const S = getStore();
  const k = core(f.months, f.bu), p = f.prior ? core(f.prior, f.bu) : null;
  const ms = new Set(f.months);
  const okBu = (c: string) => f.bu === "ALL" || S.clientById.get(c)!.business_unit === f.bu;
  const all = S.sessions.filter((s) => okBu(s.client_id) && (!modF || s.service_line_id === modF));
  const sel = all.filter((s) => ms.has(s.month));
  const mods = ["OPI", "VRI", "ONSITE"];
  const monthly = MONTHS.map((m) => ({ m, ...Object.fromEntries(mods.map((x) => [x, all.filter((s) => s.month === m && s.service_line_id === x && s.status === "FULFILLED").reduce((a, s) => a + s.duration_min, 0)])) }));
  const hours = Array.from({ length: 24 }, (_, h) => sel.filter((s) => s.request_hour === h).length);
  const byLp = [...groupBy(sel, (s) => s.lp_id).entries()].map(([lp, ss]) => {
    const f_ = ss.filter((s) => s.status === "FULFILLED"), u = ss.filter((s) => s.status === "UNFULFILLED");
    const od = f_.filter((s) => s.request_type === "ON_DEMAND" && s.service_line_id === "OPI");
    return { pair: S.lpById.get(lp)!.pair_label, requests: ss.length, minutes: f_.reduce((a, s) => a + s.duration_min, 0), fill: f_.length / Math.max(1, f_.length + u.length), asa: od.length ? od.reduce((a, s) => a + s.connect_seconds, 0) / od.length : null };
  }).sort((a, b) => b.minutes - a.minutes);
  const recent = sel.slice(-1000).reverse().map((s) => ({ id: s.session_id, date: s.request_date, hour: s.request_hour, modality: SL_LABEL[s.service_line_id], pair: S.lpById.get(s.lp_id)!.pair_label, type: s.request_type, status: s.status, connect: s.connect_seconds, minutes: s.duration_min }));
  return (
    <>
      <PageHeader title="Interpretation Ops" sub="Demand, speed to answer and fulfilment across phone, video and on-site interpreting." period={f.label} />
      <Grid cols={5}>
        <KpiCard info={K("INT_MIN")} expand="INT_MIN" label="Interpreted minutes" value={k.INT_MIN} prior={p?.INT_MIN} f="words" />
        <KpiCard info={K("OPI_ASA")} expand="OPI_ASA" label="OPI speed to answer" value={k.OPI_ASA} prior={p?.OPI_ASA} f="sec" good="down" />
        <KpiCard info={K("FILL_ON_DEMAND")} expand="FILL_ON_DEMAND" label="On-demand fill rate" value={k.FILL_ON_DEMAND} prior={p?.FILL_ON_DEMAND} f="pct1" kind="pp" />
        <KpiCard info={K("VRI_CONN")} expand="VRI_CONN" label="VRI connection success" value={k.VRI_CONN} prior={p?.VRI_CONN} f="pct1" kind="pp" />
        <KpiCard info={K("INT_AVG_DUR")} expand="INT_AVG_DUR" label="Avg session length (min)" value={k.INT_AVG_DUR} prior={p?.INT_AVG_DUR} f="dec1" />
      </Grid>
      <Grid cols={2}>
        <ChartCard info={X("in.modality")} expand="INT_MIN" title="Fulfilled minutes by modality"><EChart label="Minutes by modality" format="words" option={{ xAxis: { type: "category", data: MONTHS }, yAxis: { type: "value" }, series: mods.map((x) => ({ name: SL_LABEL[x], type: "bar", stack: "m", data: monthly.map((r) => (r as Record<string, number | string>)[x] as number), barMaxWidth: 16 })) }} /></ChartCard>
        <ChartCard info={X("in.hour")} title="Requests by hour of day" note="Selected period; hour of request (0–23, synthetic local time)"><EChart label="Requests by hour" format="num" option={{ legend: { show: false }, xAxis: { type: "category", data: hours.map((_, h) => String(h)) }, yAxis: { type: "value" }, series: [{ type: "bar", data: hours, barMaxWidth: 14 }] }} /></ChartCard>
      </Grid>
      <div className="mb-4"><ChartCard info={X("in.byPair")} expand="FILL_ON_DEMAND" title="Language-pair performance" note="Fill rate = fulfilled ÷ (fulfilled + unfulfilled). Filter by modality with ?mod=OPI|VRI|ONSITE">
        <DataTable name="interpretation-by-pair" cols={[{ key: "pair", label: "Language pair" }, { key: "requests", label: "Requests", fmt: "num" }, { key: "minutes", label: "Minutes", fmt: "num" }, { key: "fill", label: "Fill rate", fmt: "pct1" }, { key: "asa", label: "OPI ASA (s)", fmt: "dec1" }]} rows={byLp} />
      </ChartCard></div>
      <ChartCard info={X("in.recent")} title="Recent sessions" note="Latest 1,000 sessions in the selected period (table capped; search and export apply to these)">
        <DataTable name="sessions" cols={[{ key: "id", label: "Session" }, { key: "date", label: "Date" }, { key: "hour", label: "Hour", fmt: "num" }, { key: "modality", label: "Modality" }, { key: "pair", label: "Pair" }, { key: "type", label: "Type" }, { key: "status", label: "Status" }, { key: "connect", label: "Connect (s)", fmt: "num" }, { key: "minutes", label: "Minutes", fmt: "dec1" }]} rows={recent} />
      </ChartCard>
      <div className="mt-4"><Note>Speed to answer covers fulfilled on-demand phone sessions only. Sessions, interpreters and clients are synthetic.</Note></div>
    </>
  );
}
