"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";
import { SECTION_LABELS, type InfoContent } from "@/lib/info/types";

type Mode = "closed" | "peek" | "open";
const GAP = 6, EDGE = 8;

const BASIS_STYLE: Record<NonNullable<InfoContent["basis"]>["kind"], [string, string]> = {
  dictionary: ["var(--good)", "var(--good-bg)"],
  code: ["var(--ink-2)", "var(--surface-2)"],
  mismatch: ["var(--warn)", "var(--warn-bg)"],
  unverified: ["var(--warn)", "var(--warn-bg)"],
};

/** The definition sections of an InfoContent (shared by the info popover and the Expand analysis view). */
export function InfoSections({ info, className = "mt-2" }: { info: InfoContent; className?: string }) {
  return (
    <dl className={`space-y-2.5 ${className}`}>
      {SECTION_LABELS.map(([k, label]) => {
        const v = info[k];
        if (!v || (Array.isArray(v) && !v.length) || k === "title" || k === "summary" || k === "basis") return null;
        return (
          <div key={k}>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)]">{label}</dt>
            <dd className="mt-0.5 text-[13px] leading-snug">
              {Array.isArray(v) ? <ul className="list-disc space-y-0.5 pl-4">{(v as string[]).map((x, i) => <li key={i}>{x}</li>)}</ul> : String(v)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export const BASIS_COLORS = BASIS_STYLE;

/**
 * Small "i" button with contextual help.
 * Hover (mouse) or keyboard focus shows a short tooltip; click, tap, Enter or Space opens the full explanation.
 * Closes on Escape, outside click, or activating the button again. The panel is portalled and kept inside the viewport.
 */
export default function InfoTip({ info, className = "" }: { info: InfoContent; className?: string }) {
  const [mode, setMode] = useState<Mode>("closed");
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const uid = useId();
  const descId = `${uid}-desc`, popId = `${uid}-pop`;
  const hasDetails = SECTION_LABELS.some(([k]) => info[k] && (!Array.isArray(info[k]) || (info[k] as string[]).length));

  // Position the floating panel next to the button, flipping above when there is more room, clamped to the viewport.
  useLayoutEffect(() => {
    if (mode === "closed") return;
    const place = () => {
      const b = btn.current, p = pop.current;
      if (!b || !p) return;
      const r = b.getBoundingClientRect();
      const vw = document.documentElement.clientWidth, vh = window.innerHeight;
      const width = Math.min(mode === "open" ? 380 : 280, vw - EDGE * 2);
      p.style.width = `${width}px`;
      p.style.maxHeight = "none";
      const natural = p.scrollHeight;
      const below = vh - r.bottom - GAP - EDGE, above = r.top - GAP - EDGE;
      const useBelow = natural <= below || below >= above;
      const room = Math.max(120, useBelow ? below : above);
      const h = Math.min(natural, room);
      p.style.maxHeight = `${room}px`;
      p.style.left = `${Math.min(Math.max(EDGE, r.left + r.width / 2 - width / 2), vw - width - EDGE)}px`;
      p.style.top = `${useBelow ? r.bottom + GAP : Math.max(EDGE, r.top - GAP - h)}px`;
      p.style.visibility = "visible";
    };
    place();
    // Move focus into the full panel so screen readers announce it; Escape or Tab returns focus to the button.
    if (mode === "open") pop.current?.focus({ preventScroll: true });
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [mode]);

  // Escape closes (and returns focus); a pointer press outside closes the full panel.
  useEffect(() => {
    if (mode === "closed") return;
    // Capture phase + preventDefault so an enclosing dialog (Expand analysis) does not also close on the same Escape.
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setMode("closed"); if (mode === "open") btn.current?.focus(); } };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (mode === "open" && !btn.current?.contains(t) && !pop.current?.contains(t)) setMode("closed");
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey, true); document.removeEventListener("pointerdown", onDown); };
  }, [mode]);

  const panel = mode === "closed" ? null : createPortal(
    <div
      ref={pop}
      id={popId}
      role={mode === "open" ? "dialog" : "tooltip"}
      aria-label={mode === "open" ? info.title : undefined}
      aria-hidden={mode === "peek" ? true : undefined}
      tabIndex={mode === "open" ? -1 : undefined}
      onKeyDown={(e) => {
        // Tab from the panel goes to its Close button; tabbing past it (either way) closes the panel and returns to the "i" button.
        if (e.key !== "Tab" || (e.target === pop.current && !e.shiftKey)) return;
        e.preventDefault(); setMode("closed"); btn.current?.focus();
      }}
      className={`fixed z-[70] overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] text-left text-[var(--ink)] shadow-[0_10px_30px_rgba(32,56,74,.18)] ${mode === "peek" ? "pointer-events-none px-3 py-2" : "p-4"}`}
      style={{ visibility: "hidden", top: 0, left: 0 }}
    >
      {mode === "peek" ? (
        <>
          <div className="text-xs font-semibold">{info.title}</div>
          <p className="mt-0.5 text-xs leading-snug text-[var(--ink-2)]">{info.summary}</p>
          {hasDetails && <p className="mt-1 text-[11px] text-[var(--ink-3)]">Click or press Enter for details</p>}
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold leading-snug">{info.title}</h3>
            <button type="button" className="-m-1 rounded-md p-1 text-[var(--ink-3)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]" aria-label="Close" onClick={() => { setMode("closed"); btn.current?.focus(); }}>
              <X size={14} aria-hidden />
            </button>
          </div>
          <p className="mt-1 text-[13px] leading-snug text-[var(--ink-2)]">{info.summary}</p>
          {info.basis && (
            <p className="mt-2 inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ color: BASIS_STYLE[info.basis.kind][0], background: BASIS_STYLE[info.basis.kind][1] }}>
              {info.basis.text}
            </p>
          )}
          <InfoSections info={info} />
        </>
      )}
    </div>,
    document.body,
  );

  return (
    <>
      <button
        ref={btn}
        type="button"
        className={`inline-grid h-5 w-5 shrink-0 place-items-center rounded-full align-middle text-[var(--ink-3)] transition-colors hover:text-[var(--ink)] aria-expanded:text-[var(--ink)] ${className}`}
        aria-label={`About ${info.title}`}
        aria-describedby={descId}
        aria-expanded={mode === "open"}
        aria-controls={mode === "open" ? popId : undefined}
        onPointerEnter={(e) => { if (e.pointerType === "mouse" && mode === "closed") setMode("peek"); }}
        onPointerLeave={(e) => { if (e.pointerType === "mouse" && mode === "peek") setMode("closed"); }}
        onFocus={() => { if (mode === "closed") setMode("peek"); }}
        onBlur={() => { if (mode === "peek") setMode("closed"); }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMode((m) => (m === "open" ? "closed" : "open")); }}
        // Keep Enter/Space from also triggering a parent control (for example a sortable table header).
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") e.stopPropagation(); }}
      >
        <Info size={14} strokeWidth={2} aria-hidden />
      </button>
      <span id={descId} className="sr-only">{info.summary}</span>
      {panel}
    </>
  );
}
