"use client";
import { useState } from "react";
export default function FeedbackClient({ samples }: { samples: { id: string; category: string; rating: number; comment: string; role: string; date: string }[] }) {
  const [items, setItems] = useState<{ category: string; rating: number; comment: string }[]>([]);
  const [cat, setCat] = useState("General"); const [rating, setRating] = useState(5); const [comment, setComment] = useState("");
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form className="card space-y-3 p-4" onSubmit={(e) => { e.preventDefault(); if (!comment.trim()) return; setItems([{ category: cat, rating, comment: comment.trim().slice(0, 500) }, ...items]); setComment(""); }}>
        <p className="rounded-md border border-[var(--warn)] px-3 py-2 text-xs text-[var(--warn)]">Demo only: feedback you type stays in this browser tab. It is not sent or stored anywhere. Do not enter personal or confidential information.</p>
        <label className="block text-sm">Category<select className="input mt-1 w-full" value={cat} onChange={(e) => setCat(e.target.value)}>{["General", "Usability", "Data", "Finance", "Capacity", "AI"].map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="block text-sm">Rating (1–5)<input type="number" min={1} max={5} className="input mt-1 w-full" value={rating} onChange={(e) => setRating(Math.min(5, Math.max(1, Number(e.target.value) || 1)))} /></label>
        <label className="block text-sm">Comment<textarea className="input mt-1 w-full" rows={4} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} /></label>
        <button className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm text-white">Add to local list</button>
      </form>
      <div className="space-y-2">
        {items.map((i, k) => <div key={k} className="card p-4 text-sm"><div className="text-xs text-[var(--ink-2)]">{i.category} · {"★".repeat(i.rating)} · you (local only)</div>{i.comment}</div>)}
        <h3 className="pt-1 text-sm font-semibold">Sample feedback (fictional)</h3>
        {samples.map((s) => <div key={s.id} className="card p-4 text-sm"><div className="text-xs text-[var(--ink-2)]">{s.category} · {"★".repeat(s.rating)} · {s.role} · {s.date}</div>{s.comment}</div>)}
      </div>
    </div>
  );
}
