"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bot, Database, Gauge, Headphones, Languages, LayoutDashboard, Lightbulb, Megaphone, Menu, MessageSquare,
  Plug, Rocket, ShieldCheck, Target, TrendingUp, TriangleAlert, UserCog, Users, Wallet, X, type LucideIcon,
} from "lucide-react";
import { NAV, GLOBAL_PARAMS } from "@/lib/nav";

const ICONS: Record<string, LucideIcon> = {
  overview: LayoutDashboard, "executive-strategy": Target, "client-revenue": Users, "translation-ops": Languages,
  "interpretation-ops": Headphones, "finance-profitability": Wallet, "ai-automation": Bot, "forecasting-scenarios": TrendingUp,
  "sales-marketing": Megaphone, "quality-compliance": ShieldCheck, "hr-workforce": UserCog, "capacity-demand": Gauge,
  "technology-integration": Plug, "risk-alerts": TriangleAlert, "data-governance": Database,
  enhancement: Lightbulb, "coming-soon": Rocket, feedback: MessageSquare,
};
const GROUPS = [["Core", "Core tabs"], ["Secondary", "Secondary tabs"], ["Concept", "Concept tabs"]] as const;

function Brand() {
  return (
    <div className="px-3 pb-4 pt-1">
      <div className="display flex items-center gap-2 text-[1.35rem] leading-tight !text-white">
        <span className="grid grid-cols-2 gap-[2px]" aria-hidden>
          <span className="h-2 w-2 bg-[var(--red)]" /><span className="h-2 w-2 bg-[var(--red)]" />
          <span className="h-2 w-2 bg-[var(--red)]" /><span className="h-2 w-2 bg-[var(--red)] opacity-60" />
        </span>
        BLS OneView
      </div>
      <div className="mt-0.5 text-xs text-[var(--nav-muted)]">Interview demo</div>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const sp = useSearchParams();
  const keep = new URLSearchParams();
  for (const k of GLOBAL_PARAMS) { const v = sp.get(k); if (v) keep.set(k, v); }
  const qs = keep.toString() ? `?${keep}` : "";
  return (
    <>
      {GROUPS.map(([g, title], gi) => (
        <div key={g} className={gi ? "mt-3 border-t border-white/10 pt-3" : ""}>
          <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--nav-muted)]">{title}</div>
          {NAV.filter((n) => n.group === g).map((n) => {
            const active = path === `/${n.slug}`;
            const Icon = ICONS[n.slug] ?? LayoutDashboard;
            return (
              <Link key={n.slug} href={`/${n.slug}${qs}`} onClick={onNavigate} aria-current={active ? "page" : undefined}
                className={`relative my-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition-colors duration-150 ${active ? "bg-[var(--nav-active)] font-semibold text-white shadow-sm" : "text-white/90 hover:bg-[var(--nav-hover)] hover:text-white"}`}>
                {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-[var(--yellow)]" aria-hidden />}
                <Icon size={16} strokeWidth={1.75} aria-hidden className="shrink-0" />
                <span className="truncate">{n.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}

/** Desktop sidebar (md and up). */
export default function Sidebar() {
  return (
    <nav aria-label="Dashboard tabs" className="nav-dark w-60 shrink-0 overflow-y-auto bg-[var(--nav-bg)] px-2 py-4 max-md:hidden">
      <Brand />
      <NavLinks />
    </nav>
  );
}

/** Menu button plus slide-out drawer for small screens, using the same links. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <div className="md:hidden">
      <button type="button" className="btn !px-2" aria-label="Open navigation" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(true)}>
        <Menu size={18} aria-hidden />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <nav id="mobile-nav" aria-label="Dashboard tabs" className="nav-dark relative h-full w-72 max-w-[85vw] overflow-y-auto bg-[var(--nav-bg)] px-2 py-4 shadow-xl">
            <button type="button" className="absolute right-3 top-3 rounded-md p-1 text-white/80 hover:bg-[var(--nav-hover)] hover:text-white" aria-label="Close navigation" onClick={() => setOpen(false)}>
              <X size={18} aria-hidden />
            </button>
            <Brand />
            <NavLinks onNavigate={() => setOpen(false)} />
          </nav>
          <button type="button" className="flex-1 bg-[rgba(32,56,74,.45)]" aria-label="Close navigation" tabIndex={-1} onClick={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
