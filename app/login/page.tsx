"use client";
import { useActionState } from "react";
import { login, type LoginState } from "@/lib/auth/actions";
import BrandLogo from "@/components/BrandLogo";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form action={action} className="card w-full max-w-sm space-y-4 p-6" style={{ borderTop: "4px solid var(--red)" }}>
        <div>
          <BrandLogo className="bls-company-logo -ml-3 mb-1 !w-[170px]" />
          <h1>BLS OneView</h1>
          <p className="text-sm text-[var(--ink-2)]">Interview demonstration. Synthetic data only.</p>
        </div>
        <label className="block text-sm">Username
          <input name="username" autoComplete="username" required defaultValue={state.username ?? ""} key={state.username ?? "u"} className="input mt-1 w-full" />
        </label>
        <label className="block text-sm">Password
          <input name="password" type="password" autoComplete="current-password" required className="input mt-1 w-full" />
        </label>
        {state.error && <p role="alert" className="text-sm text-[var(--bad)]">{state.error}</p>}
        <button disabled={pending} className="btn btn-primary w-full justify-center py-2 text-sm">{pending ? "Signing in…" : "Sign in"}</button>
        <p className="text-center text-[11px] text-[var(--ink-3)]">DEMO / SYNTHETIC DATA. Not affiliated with real company systems or clients.</p>
      </form>
    </main>
  );
}
