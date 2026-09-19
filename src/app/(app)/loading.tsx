export default function Loading() {
  return (
    <div role="status" aria-busy="true" className="animate-pulse space-y-6">
      <span className="sr-only">Loading…</span>

      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-border" />
        <div className="h-4 w-72 max-w-full rounded bg-border/60" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-surface p-5">
            <div className="h-3 w-20 rounded bg-border/60" />
            <div className="mt-3 h-6 w-16 rounded bg-border" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="h-4 w-32 rounded bg-border" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-9 w-9 shrink-0 rounded-full bg-border" />
              <div className="h-4 flex-1 rounded bg-border/60" />
              <div className="h-4 w-20 rounded bg-border/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
