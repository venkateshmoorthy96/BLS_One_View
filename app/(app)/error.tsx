"use client";
// Catches unexpected errors while rendering a dashboard page (for example, data files changed mid-request).
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section role="alert" className="card mx-auto max-w-2xl border-l-4 border-l-[var(--bad)] p-6">
      <h1 className="text-2xl">This page could not be loaded</h1>
      <p className="mt-2 text-sm text-[var(--ink-2)]">
        {error.name === "DataUnavailableError" ? "The dataset failed validation. Reload the page to see the list of problems." : "An unexpected error occurred while preparing the data for this page."}
      </p>
      {error.digest && <p className="mt-1 text-xs text-[var(--ink-3)]">Reference: {error.digest}</p>}
      <button type="button" className="btn mt-4" onClick={reset}>Try again</button>
    </section>
  );
}
