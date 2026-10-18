export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-8" aria-hidden>
      <div className="space-y-2">
        <div className="h-8 w-32 rounded-lg bg-muted" />
        <div className="h-4 w-56 rounded bg-muted" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <div className="h-9 w-20 rounded bg-muted" />
          <div className="h-4 w-16 rounded bg-muted" />
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="divide-y divide-border overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-36 rounded bg-muted" />
                <div className="h-3 w-48 rounded bg-muted" />
              </div>
              <div className="h-4 w-4 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
      <div className="h-11 w-full rounded-xl bg-muted" />
    </div>
  )
}
