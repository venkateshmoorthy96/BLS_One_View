"use client";
import { useState } from "react";
import EChart from "@/components/EChart";
import { scenarioOutputs, type ScnBase, type ScnInputs, type ScnParams } from "@/lib/scenario";
import { fmt } from "@/lib/format";
import type { Currency } from "@/lib/filters";
import InfoTip from "@/components/InfoTip";
import ExpandAnalysis from "@/components/ExpandAnalysis";
import ChartCardClient from "@/components/ChartCardClient";
import type { InfoContent } from "@/lib/info/types";

export type ScenarioInfo = Record<"drivers" | "revenue" | "gm" | "ebitda" | "em" | "ai" | "gap" | "bars" | "traj", InfoContent>;

export type ScenarioSettings = { params: ScnParams; presets: Record<string, ScnInputs>; trajectories: { name: string; rate: number }[] };
const SL: { k: keyof ScnInputs; label: string; min: number; max: number; step: number }[] = [
  { k: "ai_adoption_delta", label: "AI adoption change (pp of words)", min: -0.1, max: 0.3, step: 0.01 },
  { k: "price_adjustment", label: "Price change", min: -0.1, max: 0.1, step: 0.005 },
  { k: "vendor_inflation", label: "Vendor cost inflation", min: 0, max: 0.2, step: 0.005 },
  { k: "volume_growth", label: "Volume growth", min: -0.2, max: 0.3, step: 0.01 },
];

/** Presets, elasticities, growth rates and the FX rate all arrive from the server, read from the CSV dataset. */
export default function ScenarioClient({ base, cur, fx, settings, monthlyRev, info }: { base: ScnBase; cur: Currency; fx: number; settings: ScenarioSettings; monthlyRev: { month: string; rev: number }[]; info: ScenarioInfo }) {
  const PRESETS = settings.presets;
  const [inp, setInp] = useState<ScnInputs>(PRESETS.BASELINE);
  const [preset, setPreset] = useState("BASELINE");
  const b0 = scenarioOutputs(base, PRESETS.BASELINE, settings.params);
  const o = scenarioOutputs(base, inp, settings.params);
  const avg = monthlyRev.reduce((a, r) => a + r.rev, 0) / monthlyRev.length;
  const months = Array.from({ length: 12 }, (_, i) => `+${i + 1}`);
  const traj = (cagr: number) => months.map((_, i) => +((avg * Math.pow(1 + cagr, (i + 1) / 12)) / fx).toFixed(0));
  // Live baseline-vs-scenario breakdown shown in each card's expanded view (same SCN-F1.0 outputs as the cards).
  const detail = (
    <ScenarioDetail b0={b0} o={o} inp={inp} preset={preset} fx={fx} cur={cur} baseAi={base.a0} />
  );
  const card = (label: string, v: string, d: string | undefined, tip: InfoContent) => (
    <div className="card p-4"><div className="flex items-start justify-between gap-1"><div className="text-xs text-[var(--ink-2)]">{label}<InfoTip info={tip} className="-my-1 ml-0.5" /></div><ExpandAnalysis title={label} info={tip} content={detail} sub="Scenario vs baseline (trailing 12 months)" /></div><div className="num mt-1 text-xl font-semibold">{v}</div>{d ? <div className="num text-xs text-[var(--ink-2)]">{d}</div> : null}</div>
  );
  return (
    <div>
      <p className="mb-3 rounded-md border border-[var(--warn)] px-3 py-2 text-xs text-[var(--warn)]">What-if calculations run in your browser only. Nothing is saved or sent to a server. Results are illustrative scenario ranges, not statistical forecasts or confidence intervals.</p>
      <div className="mb-4 grid gap-3 lg:grid-cols-[320px_1fr]">
        <div className="card space-y-3 p-3">
          <h2 className="flex items-center gap-1 text-[15px] font-semibold">Scenario drivers<InfoTip info={info.drivers} /></h2>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Presets">
            {Object.keys(PRESETS).map((p) => <button key={p} className="btn" aria-pressed={preset === p} style={preset === p ? { background: "var(--brand)", color: "white" } : undefined} onClick={() => { setPreset(p); setInp(PRESETS[p]); }}>{p[0] + p.slice(1).toLowerCase()}</button>)}
          </div>
          {SL.map((s) => (
            <label key={s.k} className="block text-sm">
              <span className="flex justify-between"><span>{s.label}</span><span className="num font-medium">{(inp[s.k] * 100).toFixed(1)}%</span></span>
              <input type="range" className="w-full" min={s.min} max={s.max} step={s.step} value={inp[s.k]} onChange={(e) => { setPreset("CUSTOM"); setInp({ ...inp, [s.k]: Number(e.target.value) }); }} />
            </label>))}
          <button className="btn" onClick={() => { setPreset("BASELINE"); setInp(PRESETS.BASELINE); }}>Reset</button>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {card("Revenue (12 months)", fmt(o.revenue / fx, "money", cur), `${((o.revenue / b0.revenue - 1) * 100).toFixed(1)}% vs baseline`, info.revenue)}
          {card("Gross margin", fmt(o.gm, "pct1"), `${((o.gm - b0.gm) * 100).toFixed(1)} pp vs baseline`, info.gm)}
          {card("EBITDA", fmt(o.ebitda / fx, "money", cur), `${o.ebitda - b0.ebitda >= 0 ? "+" : ""}${fmt((o.ebitda - b0.ebitda) / fx, "money", cur)} vs baseline`, info.ebitda)}
          {card("EBITDA margin", fmt(o.em, "pct1"), `${((o.em - b0.em) * 100).toFixed(1)} pp vs baseline`, info.em)}
          {card("AI-touched word share", fmt(o.a, "pct1"), `baseline ${fmt(base.a0, "pct1")}`, info.ai)}
          {card("Capacity gap (words/yr)", (o.gap >= 0 ? "+" : "") + Math.round(o.gap).toLocaleString("en-US"), o.gap > 0 ? "demand exceeds supply" : "supply covers demand", info.gap)}
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCardClient title="Baseline vs scenario" info={info.bars}>
          <EChart label="Baseline versus scenario" format="money" cur={cur} option={{ xAxis: { type: "category", data: ["Revenue", "Direct costs", "Gross profit", "OPEX", "EBITDA"] }, yAxis: { type: "value" }, series: [
            { name: "Baseline", type: "bar", data: [b0.revenue, b0.revenue - b0.gp, b0.gp, b0.opex, b0.ebitda].map((v) => +(v / fx).toFixed(0)), barMaxWidth: 22 },
            { name: "Scenario", type: "bar", data: [o.revenue, o.revenue - o.gp, o.gp, o.opex, o.ebitda].map((v) => +(v / fx).toFixed(0)), barMaxWidth: 22 }] }} />
        </ChartCardClient>
        <ChartCardClient title="Revenue trajectory ranges (next 12 months)" info={info.traj} note={`Monthly revenue if the trailing-12-month average grows at ${settings.trajectories.map((t) => `${(t.rate * 100).toFixed(0)}%`).join(" / ")} a year. Illustrative ranges, not predictions.`}>
          <EChart label="Revenue trajectory ranges" format="money" cur={cur} option={{ xAxis: { type: "category", data: months }, yAxis: { type: "value", min: (v: { min: number }) => Math.floor(v.min * 0.9) }, series: settings.trajectories.map((t) => ({ name: `${t.name} ${(t.rate * 100).toFixed(0)}%`, type: "line" as const, data: traj(t.rate) })) }} />
        </ChartCardClient>
      </div>
    </div>
  );
}

type ScnOut = ReturnType<typeof scenarioOutputs>;
function ScenarioDetail({ b0, o, inp, preset, fx, cur, baseAi }: { b0: ScnOut; o: ScnOut; inp: ScnInputs; preset: string; fx: number; cur: Currency; baseAi: number }) {
  const m = (v: number) => fmt(v / fx, "money_full", cur);
  const lines: [string, number, number, "money" | "pct" | "words"][] = [
    ["Revenue", b0.revenue, o.revenue, "money"], ["Vendor linguist cost", b0.vendor, o.vendor, "money"], ["MT / AI tooling", b0.tooling, o.tooling, "money"],
    ["Interpreter pay", b0.ipay, o.ipay, "money"], ["Platform and telecom", b0.plat, o.plat, "money"], ["PM and dispatch labour", b0.labour, o.labour, "money"],
    ["Gross profit", b0.gp, o.gp, "money"], ["Gross margin", b0.gm, o.gm, "pct"], ["Operating expenses", b0.opex, o.opex, "money"],
    ["EBITDA", b0.ebitda, o.ebitda, "money"], ["EBITDA margin", b0.em, o.em, "pct"], ["AI-touched word share", baseAi, o.a, "pct"], ["Capacity gap (words/yr)", b0.gap, o.gap, "words"],
  ];
  const show = (v: number, k: string) => (k === "money" ? m(v) : k === "pct" ? fmt(v, "pct1") : Math.round(v).toLocaleString("en-US"));
  const diff = (a: number, b: number, k: string) => (k === "pct" ? `${b - a >= 0 ? "+" : "−"}${Math.abs((b - a) * 100).toFixed(1)} pp` : `${b - a >= 0 ? "+" : "−"}${k === "money" ? fmt(Math.abs(b - a) / fx, "money_full", cur) : Math.round(Math.abs(b - a)).toLocaleString("en-US")}`);
  return (
    <section className="card p-4">
      <h3 className="text-[15px] font-semibold">Scenario vs baseline, line by line</h3>
      <p className="text-xs text-[var(--ink-2)]">Preset: {preset.toLowerCase()} · AI adoption {(inp.ai_adoption_delta * 100).toFixed(1)} pp · price {(inp.price_adjustment * 100).toFixed(1)}% · vendor inflation {(inp.vendor_inflation * 100).toFixed(1)}% · volume {(inp.volume_growth * 100).toFixed(1)}%. Calculated in your browser with formula version SCN-F1.0.</p>
      <div className="mt-2 overflow-x-auto rounded-lg border border-[var(--line)]">
        <table className="w-full text-sm">
          <caption className="sr-only">Scenario versus baseline</caption>
          <thead className="bg-[var(--surface-2)] text-left text-xs text-[var(--ink-2)]"><tr><th className="px-3 py-2 font-semibold">Line</th><th className="px-3 py-2 text-right font-semibold">Baseline</th><th className="px-3 py-2 text-right font-semibold">Scenario</th><th className="px-3 py-2 text-right font-semibold">Difference</th></tr></thead>
          <tbody>{lines.map(([n, a, b, k]) => (
            <tr key={n} className={`border-t border-[var(--line)] ${["Gross profit", "EBITDA"].includes(n) ? "font-semibold" : ""}`}><td className="px-3 py-1.5">{n}</td><td className="num px-3 py-1.5 text-right">{show(a, k)}</td><td className="num px-3 py-1.5 text-right">{show(b, k)}</td><td className="num px-3 py-1.5 text-right">{diff(a, b, k)}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-[var(--ink-2)]">Baseline = trailing 12 months to 2026-09, all business units. Not available: statistical forecasts or confidence intervals; these are illustrative what-if results.</p>
    </section>
  );
}
