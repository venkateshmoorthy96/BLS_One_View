import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import Sidebar, { MobileNav } from "@/components/Sidebar";
import FilterBar from "@/components/FilterBar";
import BrandLogo from "@/components/BrandLogo";
import InfoTip from "@/components/InfoTip";
import { demoInfo } from "@/lib/info/registry";
import { currencyInfo } from "@/lib/info/global";
import { dataStatus, table } from "@/lib/data/store";
import DataUnavailable from "@/components/DataUnavailable";
import { logout } from "@/lib/auth/actions";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await verifySession((await cookies()).get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET);
  if (!s) redirect("/login");
  // Validate the CSV dataset first; if it fails, show the problems instead of calculating from bad or partial data.
  const report = dataStatus();
  const fxInfo = report.ok ? currencyInfo(table("dim_fx_rate").map((r) => ({ currency: r.currency_code, usdPerUnit: r.usd_per_unit, version: r.rate_version }))) : undefined;
  return (
    <div className="flex h-screen">
      <Suspense fallback={<div className="w-60 bg-[var(--nav-bg)] max-md:hidden" />}><Sidebar /></Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-[var(--line)] bg-[var(--bg)]">
          <div className="flex items-center gap-3 border-b-2 border-[var(--red)] px-4 py-1 md:gap-5 md:px-6">
            <Suspense fallback={null}><MobileNav /></Suspense>
            <BrandLogo />
            <span className="h-9 w-px shrink-0 bg-[var(--line-strong)] md:h-11" aria-hidden />
            <div className="display min-w-0 truncate text-xl leading-tight md:text-[1.9rem]">BLS OneView</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 md:px-6">
            <span className="rounded-md bg-[var(--yellow)] px-2.5 py-1 text-xs font-bold tracking-wide text-[var(--ink)]" title="All records are fictional">DEMO / SYNTHETIC DATA</span>
            {report.ok && <InfoTip info={demoInfo()} className="-ml-1" />}
            {fxInfo && <Suspense fallback={null}><FilterBar currencyInfo={fxInfo} /></Suspense>}
            <form action={logout} className="ml-auto">
              <button className="btn" type="submit"><LogOut size={14} aria-hidden />Sign out</button>
            </form>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-5 md:px-6">{report.ok ? children : <DataUnavailable report={report} />}</main>
      </div>
    </div>
  );
}
