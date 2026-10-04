// The Premium marker: the Casanova Study logo (small app icon), used on
// Premium-only formats, the Long/Hard options, the builder's AI assistant,
// the plan menu and the Premium dialog.

import { cn } from "@/lib/utils"

/** Just the logo, on a white rounded tile so it reads on blue or white. */
export function PremiumMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/icons/icon-192.png" alt="" aria-hidden className={cn("inline-block h-4 w-4 shrink-0 rounded-[4px] bg-white object-contain", className)} />
  )
}

/** "Premium" pill with the logo. */
export function PremiumBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-white px-1.5 py-0.5 pr-2 text-[0.65rem] font-bold uppercase tracking-wide text-blue-700 shadow-sm ring-1 ring-inset ring-blue-200", className)}>
      <PremiumMark className="h-3.5 w-3.5" /> Premium
    </span>
  )
}
