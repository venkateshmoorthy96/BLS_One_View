"use client";
import { Fragment, useState } from "react";
import InfoTip from "@/components/InfoTip";
import type { InfoContent } from "@/lib/info/types";

export type AlertRow = { id: string; severity: string; domain: string; rule: string; description: string; trigger: string; likelihood: number; impact: number; exposure: number; action: string; owner: string; status: string; raised: string; link: string };
const TONE: Record<string, string> = { CRITICAL: "var(--bad)", HIGH: "var(--bad)", MEDIUM: "var(--warn)", LOW: "var(--ink-3)" };

export default function AlertsClient({ rows, initialSev, info }: { rows: AlertRow[]; initialSev: string; info?: InfoContent }) {
  const [sev, setSev] = useState(initialSev);
  const [ack, setAck] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const view = rows.filter((r) => !sev || r.severity === sev);
  return (
    <div className="card p-4">
      <h2 className="mb-1 flex items-center gap-1 text-[15px] font-semibold text-[var(--ink)]">Alert list{info && <InfoTip info={info} />}</h2>
      <p className="mb-2 text-xs text-[var(--warn)]">Acknowledgements are kept in this browser tab only. They are not saved to any server and are lost on refresh.</p>
      <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label="Severity filter">
        {["", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => <button key={s} className="btn" aria-pressed={sev === s} style={sev === s ? { background: "var(--brand)", color: "white" } : undefined} onClick={() => setSev(s)}>{s || "All"}</button>)}
        <span className="num ml-auto text-xs text-[var(--ink-2)]">{view.length} alerts · {ack.size} acknowledged locally</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--line)]">
        <table className="w-full text-sm text-[var(--ink)]">
          <thead><tr className="border-b border-[var(--line)] bg-[var(--surface-2)] text-left text-xs text-[var(--ink-2)] [&>th]:px-3 [&>th]:py-2 [&>th]:font-semibold"><th>Severity</th><th>Domain</th><th>Alert</th><th className="text-right">Exposure (USD)</th><th>Owner</th><th>Status</th><th>Ack</th></tr></thead>
          <tbody>
            {view.map((r) => (<Fragment key={r.id}>
              <tr className="cursor-pointer border-b border-[var(--line)] transition-colors hover:bg-[var(--hover)] [&>td]:px-3 [&>td]:py-2" onClick={() => setOpen(open === r.id ? null : r.id)} style={{ opacity: ack.has(r.id) ? 0.5 : 1 }}>
                <td className="font-semibold" style={{ color: TONE[r.severity] }}>{r.severity}</td><td>{r.domain}</td><td>{r.description}</td>
                <td className="num text-right">{Math.round(r.exposure).toLocaleString("en-US")}</td><td>{r.owner}</td><td>{r.status}</td>
                <td onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Acknowledge ${r.id}`} checked={ack.has(r.id)} onChange={() => setAck((a) => { const n = new Set(a); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} /></td>
              </tr>
              {open === r.id && <tr className="bg-[var(--surface-2)]"><td colSpan={7} className="px-3 py-2 text-xs">
                <div><b>Rule {r.rule}:</b> {r.trigger}</div><div><b>Likelihood × impact:</b> {r.likelihood} × {r.impact} (1–5 scale, illustrative) · <b>Raised:</b> {r.raised}</div><div><b>Recommended action:</b> {r.action}</div>
              </td></tr>}
            </Fragment>))}
            {!view.length && <tr><td colSpan={7} className="py-6 text-center text-[var(--ink-2)]">No alerts for this severity.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
