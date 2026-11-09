import { cn } from "@/lib/utils"

/**
 * The site's waiting mark: a small page whose lines write themselves in. Sized
 * in em, so `text-*` sets its size and its color (`text-blue-600` by default).
 */
export function WritingMark({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("cs-writing text-blue-600", className)}>
      <span />
      <span />
      <span />
      <span />
    </span>
  )
}

/**
 * A whole page or panel waiting on its data. `fill` centers it in the screen
 * (minus the header); otherwise it sits in a roomy block where the content will be.
 */
export function PageLoader({ label, hint, fill, className }: { label?: string; hint?: string; fill?: boolean; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center justify-center gap-4 px-4 text-center", fill ? "min-h-[70vh]" : "py-16", className)}>
      <WritingMark className="text-[2.75rem]" />
      {label ? <p className="text-sm font-medium text-slate-600">{label}</p> : <span className="sr-only">Loading…</span>}
      {hint && <p className="-mt-2 max-w-sm text-sm text-slate-500">{hint}</p>}
    </div>
  )
}

/**
 * A bar for work that is under way (sorting pages, grading, uploading): the
 * fill carries a slow sheen while `active`, so a long step never looks stuck.
 * Scores and other fixed amounts keep their plain bars.
 */
export function WorkBar({ value, active = true, className, label }: { value: number; active?: boolean; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label ?? "Progress"}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-blue-100", className)}
    >
      <div
        className={cn("cs-workbar h-full rounded-full bg-gradient-to-r from-blue-700 to-cyan-500 transition-[width] duration-500 ease-out", active && pct < 100 && "cs-workbar-active")}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
