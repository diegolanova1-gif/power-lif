export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-8" aria-hidden>
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-40 rounded-lg bg-muted" />
          <div className="h-4 w-64 rounded bg-muted" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="mt-3 h-8 w-12 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="divide-y divide-border overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="h-9 w-9 rounded-full bg-muted" />
              <div className="h-4 w-32 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
