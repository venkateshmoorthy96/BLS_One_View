"use client";
import { useState } from "react";
export type Feature = { id: string; title: string; description: string; category: string; status: string; quarter: string; priority: string; votes: number };
export default function RoadmapClient({ features }: { features: Feature[] }) {
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [cat, setCat] = useState("");
  const cats = [...new Set(features.map((f) => f.category))];
  const view = features.filter((f) => !cat || f.category === cat).sort((a, b) => b.votes + (voted.has(b.id) ? 1 : 0) - (a.votes + (voted.has(a.id) ? 1 : 0)));
  return (
    <div>
      <p className="mb-3 rounded-md border border-[var(--warn)] px-3 py-2 text-xs text-[var(--warn)]">Concept tab. Votes are local to this browser tab and are not saved or shared. Vote counts shown are seeded sample values.</p>
      <select className="input mb-3" aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {view.map((f) => (
          <article key={f.id} className="card p-4">
            <div className="flex justify-between text-xs text-[var(--ink-2)]"><span>{f.category}</span><span>{f.status.replace("_", " ")} · {f.quarter}</span></div>
            <h3 className="mt-1 font-semibold">{f.title}</h3><p className="text-sm text-[var(--ink-2)]">{f.description}</p>
            <div className="mt-2 flex items-center justify-between"><span className="text-xs">Priority {f.priority}</span>
              <button className="btn" aria-pressed={voted.has(f.id)} onClick={() => setVoted((s) => { const n = new Set(s); if (n.has(f.id)) n.delete(f.id); else n.add(f.id); return n; })}>▲ {f.votes + (voted.has(f.id) ? 1 : 0)}</button></div>
          </article>))}
      </div>
    </div>
  );
}
