"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

/** Re-reads the CSV files on the server, then re-renders the current page with the new data. */
export default function ReloadDataButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const run = async () => {
    setState("busy");
    try {
      const r = await fetch("/api/data", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      setMsg(j.ok ? `Reloaded ${j.files.length} files: ${j.totals.rows.toLocaleString("en-US")} rows, no problems.` : `Reloaded with ${j.issues.length} problem(s).`);
      setState("done");
      router.refresh();
    } catch (e) {
      setMsg(`Reload failed: ${(e as Error).message}`);
      setState("error");
    }
  };
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" className="btn" onClick={run} disabled={state === "busy"}>
        <RefreshCw size={14} aria-hidden className={state === "busy" ? "animate-spin" : ""} />{state === "busy" ? "Reloading…" : "Reload data"}
      </button>
      <span role="status" className={`text-xs ${state === "error" ? "text-[var(--bad)]" : "text-[var(--ink-2)]"}`}>{msg}</span>
    </span>
  );
}
