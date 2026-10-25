"use client";
import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import InfoTip from "@/components/InfoTip";
import { AnalysisModal, ExpandButton } from "@/components/ExpandAnalysis";
import { ExpandedCtx } from "@/components/expand-context";
import type { InfoContent } from "@/lib/info/types";

const noop = () => () => {};

/**
 * Chart/table card with an Expand analysis action.
 * The card body is rendered once into a detached container that is moved between the card and the expanded view,
 * so charts and tables keep their state (sort, search, page) and nothing is duplicated in the page payload.
 */
export default function ChartCardClient({ title, note, info, analysisKey, children }: { title: string; note?: string; info?: InfoContent; analysisKey?: string; children: ReactNode }) {
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  const open = trigger !== null;
  // false while hydrating (matches the server HTML, where the body renders inline), true afterwards
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const [hostEl] = useState(() => (typeof document === "undefined" ? null : document.createElement("div")));
  const host = mounted ? hostEl : null;
  const slot = useRef<HTMLDivElement>(null);

  // After hydration the body lives in `host`, attached to the card slot until it is moved into the expanded view.
  useLayoutEffect(() => {
    if (!host) return;
    if (!open) slot.current?.appendChild(host);
    return () => { if (!open) host.remove(); };
  }, [host, open]);

  const toModal = useCallback((el: HTMLDivElement | null) => {
    if (!host) return;
    if (el) el.appendChild(host);
    else slot.current?.appendChild(host);
  }, [host]);

  const openView = (btn: HTMLElement) => {
    // Keep the card's height while its content is in the expanded view, so the dashboard does not shift underneath.
    if (slot.current) slot.current.style.minHeight = `${slot.current.offsetHeight}px`;
    setTrigger(btn);
  };
  const close = useCallback(() => {
    if (host && slot.current) { slot.current.appendChild(host); slot.current.style.minHeight = ""; }
    setTrigger(null);
  }, [host]);

  return (
    <section className="card min-w-0 p-4">
      <div className="flex items-start gap-2">
        <h2 className="flex min-w-0 flex-1 items-center gap-1 text-[15px] font-semibold text-[var(--ink)]">{title}{info && <InfoTip info={info} />}</h2>
        <ExpandButton label={`Expand analysis: ${title}`} onClick={openView} />
      </div>
      {note ? <p className="mb-2 mt-0.5 text-xs text-[var(--ink-2)]">{note}</p> : <div className="mb-2" />}
      <div ref={slot}>
        {!host && children}
        {open && <p className="py-6 text-center text-xs text-[var(--ink-3)]">Shown in the expanded view</p>}
      </div>
      {host && createPortal(<ExpandedCtx.Provider value={open}>{children}</ExpandedCtx.Provider>, host)}
      {open && <AnalysisModal title={title} sub={note} analysisKey={analysisKey} info={info} slot={toModal} trigger={trigger} onClose={close} />}
    </section>
  );
}
