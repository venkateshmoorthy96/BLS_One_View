// Shown while a dashboard page loads its data on the server.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <div className="mb-5 h-9 w-64 animate-pulse rounded-lg bg-[var(--surface-2)]" />
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <div key={i} className="card h-28 animate-pulse bg-[var(--surface-2)]" />)}</div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{[0, 1].map((i) => <div key={i} className="card h-72 animate-pulse bg-[var(--surface-2)]" />)}</div>
      <p className="mt-4 text-center text-xs text-[var(--ink-3)]">Loading data…</p>
    </div>
  );
}
