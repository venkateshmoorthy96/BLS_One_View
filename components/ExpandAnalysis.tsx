"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Lightbulb, Maximize2, OctagonMinus, X } from "lucide-react";
import EChart from "@/components/EChart";
import { BASIS_COLORS, InfoSections } from "@/components/InfoTip";
import { fmt, type Fmt } from "@/lib/format";
import type { Currency } from "@/lib/filters";
import type { AnalysisPayload, Breakdown, Trend } from "@/lib/analysis/types";
import type { InfoContent } from "@/lib/info/types";

type F = Fmt | "pp";
const fv = (v: number | null | undefined, f: F, cur: Currency) =>
  v == null ? "n/a" : f === "pp" ? `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(1)} pp` : fmt(v, f, cur);
const pctS = (v: number | null | undefined) => (v == null ? "–" : `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(1)}%`);

/** Small "expand" icon button used in the top-right corner of KPI and chart cards. */
export function ExpandButton({ label, onClick }: { label: string; onClick: (trigger: HTMLButtonElement) => void }) {
  return (
    <button type="button" onClick={(e) => onClick(e.currentTarget)} aria-label={label} title="Expand analysis" aria-haspopup="dialog"
      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--ink-3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]">
      <Maximize2 size={15} strokeWidth={1.9} aria-hidden />
    </button>
  );
}

// ---------- lazy data, cached per URL for the session
const cache = new Map<string, Promise<AnalysisPayload>>();
function loadAnalysis(key: string, drill: string | null): Promise<AnalysisPayload> {
  const qs = new URLSearchParams(window.location.search);
  qs.set("key", key);
  if (drill) qs.set("drill", drill); else qs.delete("drill");
  const url = `/api/analysis?${qs}`;
  let p = cache.get(url);
  if (!p) {
    p = fetch(url, { credentials: "same-origin" }).then(async (r) => {
      if (!r.ok || !(r.headers.get("content-type") ?? "").includes("json")) throw new Error(r.status === 401 || r.redirected ? "Your session has expired. Sign in again to load the analysis." : `The analysis could not be loaded (HTTP ${r.status}).`);
      return r.json();
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

type ModalProps = {
  title: string; sub?: string; analysisKey?: string; info?: InfoContent;
  /** Callback ref for a slot that receives the original chart/table (moved, not re-created). */
  slot?: (el: HTMLDivElement | null) => void;
  content?: ReactNode; onClose: () => void;
  /** The button that opened the view; focus returns to it on close (some browsers do not focus buttons on click). */
  trigger?: HTMLElement | null;
};

export function AnalysisModal({ title, sub, analysisKey, info, slot, content, onClose, trigger }: ModalProps) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const [drill, setDrill] = useState<string | null>(null);
  const [state, setState] = useState<{ key: string; data?: AnalysisPayload; error?: string } | null>(null);
  const [cur] = useState<Currency>(() => { const c = new URLSearchParams(window.location.search).get("cur"); return c === "EUR" || c === "GBP" ? c : "USD"; });
  const reqKey = `${analysisKey}|${drill ?? ""}`;

  useEffect(() => {
    if (!analysisKey) return;
    let live = true;
    loadAnalysis(analysisKey, drill).then((data) => live && setState({ key: reqKey, data }), (e: Error) => live && setState({ key: reqKey, error: e.message }));
    return () => { live = false; };
  }, [analysisKey, drill, reqKey]);
  const loading = !!analysisKey && state?.key !== reqKey;
  const data = !loading ? state?.data : undefined;

  // Focus management: focus Close on open, trap Tab inside, Escape closes, focus returns to the trigger on close.
  useEffect(() => {
    const prev = trigger ?? (document.activeElement as HTMLElement | null);
    panel.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === "Escape") { e.preventDefault(); closeRef.current(); return; }
      if (e.key !== "Tab" || !panel.current) return;
      const f = [...panel.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panel.current.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !panel.current.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; prev?.focus({ preventScroll: true }); };
  }, [trigger]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex justify-center bg-[rgba(32,56,74,.55)] md:items-center md:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={loading}
        className="flex h-full w-full max-w-6xl flex-col overflow-hidden bg-[var(--bg)] shadow-2xl md:h-[92vh] md:rounded-2xl">
        <header className="flex items-start gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3 md:px-6" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-3)]">Expanded analysis{data?.subtitle ? ` · ${data.subtitle}` : ""}</div>
            <h2 id={titleId} className="display truncate text-xl md:text-2xl">{data?.title && drill ? data.title : title}</h2>
            {data?.headline ? (
              <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2"><span className="num text-2xl font-semibold text-[var(--ink)]">{fv(data.headline.v, data.headline.fmt, cur)}</span><span className="text-xs text-[var(--ink-2)]">{data.headline.label}</span></p>
            ) : sub ? <p className="text-xs text-[var(--ink-2)]">{sub}</p> : null}
          </div>
          <span className="hidden rounded-md bg-[var(--yellow)] px-2 py-0.5 text-[11px] font-bold text-[var(--ink)] sm:inline">SYNTHETIC DATA</span>
          <button type="button" data-autofocus className="btn !px-2" aria-label="Close expanded analysis" onClick={onClose}><X size={16} aria-hidden /></button>
        </header>
        {data?.context && (
          <div className="flex flex-wrap gap-1.5 border-b border-[var(--line)] bg-[var(--surface)] px-4 pb-2.5 md:px-6" aria-label="Filters applied to this analysis">
            {data.context.map((c) => (
              <span key={c.label} className={`rounded-full border px-2 py-0.5 text-[11px] ${c.applied ? "border-[var(--line-strong)] bg-[var(--surface-2)] text-[var(--ink)]" : "border-dashed border-[var(--line-strong)] text-[var(--ink-3)]"}`}>
                <b className="font-semibold">{c.label}:</b> {c.value}
              </span>
            ))}
          </div>
        )}
        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 md:px-6">
          {drill && (
            <button type="button" className="btn" onClick={() => setDrill(null)}><ChevronLeft size={14} aria-hidden />Back to all segments</button>
          )}
          {slot && !drill && (
            <section className="card p-4" aria-label="Enlarged view">
              <h3 className="mb-2 text-[15px] font-semibold">{title}{sub ? <span className="ml-2 text-xs font-normal text-[var(--ink-2)]">{sub}</span> : null}</h3>
              <div ref={slot} />
            </section>
          )}
          {content}
          {analysisKey && (loading ? <Skeleton /> : state?.error ? (
            <p role="alert" className="card border-l-4 border-l-[var(--bad)] p-4 text-sm text-[var(--bad)]">{state.error}</p>
          ) : data ? <Body data={data} cur={cur} onDrill={setDrill} /> : null)}
          {!analysisKey && !content && <Unavailable items={["No further breakdown is defined for this component. The enlarged view and its data table are shown above."]} />}
          {info && (
            <section className="card p-4">
              <h3 className="text-[15px] font-semibold">Definition and methodology</h3>
              <p className="mt-1 text-[13px] text-[var(--ink-2)]">{info.summary}</p>
              {info.basis && <p className="mt-2 inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ color: BASIS_COLORS[info.basis.kind][0], background: BASIS_COLORS[info.basis.kind][1] }}>{info.basis.text}</p>}
              <InfoSections info={info} className="mt-3" />
            </section>
          )}
          <p className="pb-2 text-center text-[11px] text-[var(--ink-3)]">Synthetic demo data · Press Esc or Close to return to the dashboard</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Skeleton() {
  return (
    <div className="space-y-4" aria-label="Loading analysis">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="card h-20 animate-pulse bg-[var(--surface-2)]" />)}</div>
      <div className="card h-72 animate-pulse bg-[var(--surface-2)]" />
      <p className="text-center text-xs text-[var(--ink-3)]">Loading analysis…</p>
    </div>
  );
}

function Unavailable({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <section className="card border-l-4 border-l-[var(--line-strong)] p-4">
      <h3 className="flex items-center gap-1.5 text-[15px] font-semibold"><OctagonMinus size={15} aria-hidden className="text-[var(--ink-3)]" />Not available in this dataset</h3>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[13px] text-[var(--ink-2)]">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </section>
  );
}

function Body({ data, cur, onDrill }: { data: AnalysisPayload; cur: Currency; onDrill: (d: string) => void }) {
  const tone = { good: "var(--good)", bad: "var(--bad)", mute: "var(--ink)" };
  return (
    <>
      {!!data.stats?.length && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {data.stats.map((s) => (
            <div key={s.label} className="card p-3">
              <div className="text-xs text-[var(--ink-2)]">{s.label}</div>
              <div className="num mt-1 text-xl font-semibold" style={{ color: tone[s.tone ?? "mute"] }}>{s.fmt === "pct1" && (s.label.includes("change") || s.label === "Relative change") ? pctS(s.v) : fv(s.v, s.fmt, cur)}</div>
              {s.note && <div className="num text-[11px] text-[var(--ink-3)]">{s.note}</div>}
            </div>
          ))}
        </div>
      )}
      {!!data.insights?.length && (
        <section className="card border-l-4 border-l-[var(--yellow)] p-4">
          <h3 className="flex items-center gap-1.5 text-[15px] font-semibold"><Lightbulb size={15} aria-hidden className="text-[var(--warn)]" />What the data shows</h3>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px]">{data.insights.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </section>
      )}
      {data.trends?.map((t) => <TrendView key={t.title} t={t} cur={cur} />)}
      {data.movers && (data.movers.up.length || data.movers.down.length) ? (
        <section className="card p-4">
          <h3 className="text-[15px] font-semibold">{data.movers.title}</h3>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            {([["Increases", data.movers.up, ArrowUpRight], ["Decreases", data.movers.down, ArrowDownRight]] as const).map(([h, list, Icon]) => (
              <div key={h}>
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-3)]">{h}</div>
                {list.length ? <ul className="mt-1 divide-y divide-[var(--line)]">{list.map((m) => (
                  <li key={m.name} className="flex items-center justify-between gap-2 py-1.5 text-sm"><span className="flex min-w-0 items-center gap-1.5"><Icon size={14} aria-hidden className="shrink-0 text-[var(--ink-3)]" /><span className="truncate">{m.name}</span></span><span className="num font-medium">{m.delta >= 0 ? "+" : "−"}{fmt(Math.abs(m.delta), data.movers!.fmt, cur)}</span></li>
                ))}</ul> : <p className="mt-1 text-xs text-[var(--ink-3)]">None in this period.</p>}
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {!!data.breakdowns?.length && <div className="grid gap-4 lg:grid-cols-2">{data.breakdowns.map((b) => <BreakdownView key={b.title} b={b} cur={cur} onDrill={onDrill} />)}</div>}
      <Unavailable items={data.unavailable ?? []} />
    </>
  );
}

function TrendView({ t, cur }: { t: Trend; cur: Currency }) {
  const two = t.series.some((s) => s.axis === 1);
  const bandColor = { current: "rgba(41,175,199,0.12)", prior: "rgba(97,113,132,0.10)" };
  const option = {
    legend: { show: t.series.length > 1 },
    xAxis: { type: "category", data: t.x },
    yAxis: two ? [{ type: "value" }, { type: "value", splitLine: { show: false }, axisLabel: { formatter: (v: number) => fv(v, t.fmt2 ?? "num", cur) } }] : { type: "value" },
    series: t.series.map((s, i) => ({
      name: s.name, type: s.type ?? "line", data: s.data, yAxisIndex: s.axis ?? 0, symbolSize: 4, barMaxWidth: 16, connectNulls: false,
      ...(s.dashed ? { lineStyle: { type: "dashed" } } : {}),
      ...(s.axis === 1 ? { tooltip: { valueFormatter: (v: unknown) => (typeof v === "number" ? fv(v, t.fmt2 ?? "num", cur) : String(v)) } } : {}),
      ...(i === 0 && t.bands?.length ? { markArea: { silent: true, label: { color: "#617184", fontSize: 10, position: "insideTop" }, data: t.bands.map((b) => [{ xAxis: b.from, name: b.label, itemStyle: { color: bandColor[b.tone] } }, { xAxis: b.to }]) } } : {}),
    })),
  };
  return (
    <section className="card p-4">
      <h3 className="text-[15px] font-semibold">{t.title}</h3>
      {t.note && <p className="text-xs text-[var(--ink-2)]">{t.note}</p>}
      <EChart label={t.title} option={option as never} format={t.fmt} cur={cur} height={320} />
    </section>
  );
}

function BreakdownView({ b, cur, onDrill }: { b: Breakdown; cur: Currency; onDrill: (d: string) => void }) {
  const rows = b.rows;
  const has = (k: "prior" | "change" | "share" | "weight") => rows.some((r) => r[k] != null);
  const chartRows = rows.filter((r) => r.value != null).slice(0, 12);
  const changeText = (v: number | null | undefined) => (v == null ? "–" : b.changeKind === "pp" ? fv(v, "pp", cur) : pctS(v));
  const option = {
    legend: { show: false }, grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: "value", axisLabel: { formatter: (v: number) => fv(v, b.fmt, cur) } },
    yAxis: { type: "category", data: chartRows.map((r) => r.name).reverse(), axisLabel: { width: 130, overflow: "truncate" } },
    series: [{ type: "bar", barMaxWidth: 14, data: chartRows.map((r) => ({ value: r.value, itemStyle: r.highlight ? { color: "#E9232B" } : undefined })).reverse() }],
  };
  return (
    <section className="card min-w-0 p-4">
      <h3 className="text-[15px] font-semibold">{b.title}</h3>
      {b.note && <p className="text-xs text-[var(--ink-2)]">{b.note}</p>}
      {chartRows.length > 1 && <EChart label={b.title} option={option as never} format={b.fmt} cur={cur} height={Math.max(140, chartRows.length * 24 + 40)} />}
      <div className="mt-2 max-h-80 overflow-auto rounded-lg border border-[var(--line)]">
        <table className="w-full text-sm">
          <caption className="sr-only">{b.title}</caption>
          <thead className="sticky top-0 bg-[var(--surface-2)] text-left text-xs text-[var(--ink-2)]">
            <tr>
              <th className="px-3 py-2 font-semibold">Segment</th><th className="px-3 py-2 text-right font-semibold">Value</th>
              {has("prior") && <th className="px-3 py-2 text-right font-semibold">Prior</th>}
              {has("change") && <th className="px-3 py-2 text-right font-semibold">Change</th>}
              {b.showShare && has("share") && <th className="px-3 py-2 text-right font-semibold">Share</th>}
              {has("weight") && b.weightLabel && <th className="px-3 py-2 text-right font-semibold">{b.weightLabel}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className={`border-t border-[var(--line)] ${r.highlight ? "bg-[var(--bad-bg)]" : ""}`}>
                <td className="px-3 py-1.5">{r.drill ? (
                  <button type="button" className="group inline-flex items-center gap-1 text-left text-[var(--ink)] underline decoration-[var(--line-strong)] underline-offset-2 hover:decoration-[var(--ink)]" onClick={() => onDrill(r.drill!)} aria-label={`Drill into ${r.name}`}>
                    {r.name}<ChevronRight size={13} aria-hidden className="text-[var(--ink-3)] group-hover:text-[var(--ink)]" />
                  </button>
                ) : r.name}{r.highlight && <span className="sr-only"> (selected)</span>}</td>
                <td className="num px-3 py-1.5 text-right font-medium">{fv(r.value, b.fmt, cur)}</td>
                {has("prior") && <td className="num px-3 py-1.5 text-right text-[var(--ink-2)]">{fv(r.prior, b.fmt, cur)}</td>}
                {has("change") && <td className="num px-3 py-1.5 text-right">{changeText(r.change)}</td>}
                {b.showShare && has("share") && <td className="num px-3 py-1.5 text-right">{r.share == null ? "–" : `${(r.share * 100).toFixed(1)}%`}</td>}
                {has("weight") && b.weightLabel && <td className="num px-3 py-1.5 text-right text-[var(--ink-2)]">{fv(r.weight, b.weightFmt ?? "num", cur)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.some((r) => r.drill) && <p className="mt-1 text-[11px] text-[var(--ink-3)]">Select a segment to drill into it.</p>}
    </section>
  );
}

/** Expand button + analysis modal (for KPI cards and other components whose content is not moved). */
export default function ExpandAnalysis({ title, analysisKey, info, content, sub }: { title: string; analysisKey?: string; info?: InfoContent; content?: ReactNode; sub?: string }) {
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  return (
    <>
      <ExpandButton label={`Expand analysis: ${title}`} onClick={setTrigger} />
      {trigger && <AnalysisModal title={title} sub={sub} analysisKey={analysisKey} info={info} content={content} trigger={trigger} onClose={() => setTrigger(null)} />}
    </>
  );
}
