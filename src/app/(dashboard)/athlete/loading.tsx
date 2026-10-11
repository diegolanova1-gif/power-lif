export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-8" aria-hidden>
      <div className="space-y-2">
        <div className="h-8 w-40 rounded-lg bg-muted" />
        <div className="h-4 w-64 rounded bg-muted" />
      </div>
      <div className="h-24 rounded-xl bg-muted" />
      <div className="h-64 rounded-xl bg-muted" />
    </div>
  )
}
