"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { BUS, MONTHS, RANGES } from "@/lib/filters";
import InfoTip from "@/components/InfoTip";
import { BU_INFO, PERIOD_INFO, RESET_INFO } from "@/lib/info/global";
import type { InfoContent } from "@/lib/info/types";

export default function FilterBar({ currencyInfo }: { currencyInfo: InfoContent }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp.toString());
    if (v) n.set(k, v); else n.delete(k);
    if (k === "range" && v !== "custom") { n.delete("from"); n.delete("to"); }
    router.push(`${path}?${n}`);
  };
  const range = sp.get("range") ?? "ytd";
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Global filters">
      <select className="input" aria-label="Date range" value={range} onChange={(e) => set("range", e.target.value)}>
        {RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      {range !== "custom" && <InfoTip info={PERIOD_INFO} className="-ml-1" />}
      {range === "custom" && (<>
        <select className="input" aria-label="From month" value={sp.get("from") ?? MONTHS[0]} onChange={(e) => set("from", e.target.value)}>{MONTHS.map((m) => <option key={m}>{m}</option>)}</select>
        <select className="input" aria-label="To month" value={sp.get("to") ?? MONTHS[MONTHS.length - 1]} onChange={(e) => set("to", e.target.value)}>{MONTHS.map((m) => <option key={m}>{m}</option>)}</select>
        <InfoTip info={PERIOD_INFO} className="-ml-1" />
      </>)}
      <select className="input" aria-label="Reporting currency" value={sp.get("cur") ?? "USD"} onChange={(e) => set("cur", e.target.value)}>
        {["USD", "EUR", "GBP"].map((c) => <option key={c}>{c}</option>)}
      </select>
      <InfoTip info={currencyInfo} className="-ml-1" />
      <select className="input" aria-label="Business unit" value={sp.get("bu") ?? "ALL"} onChange={(e) => set("bu", e.target.value)}>
        {BUS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
      </select>
      <InfoTip info={BU_INFO} className="-ml-1" />
      <button className="btn" onClick={() => router.push(path)}><RotateCcw size={14} aria-hidden />Reset</button>
      <InfoTip info={RESET_INFO} className="-ml-1" />
    </div>
  );
}
