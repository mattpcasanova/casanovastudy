import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Base layout/sizing
        "flex field-sizing-content min-h-16 w-full rounded-md border px-3 py-2 text-base shadow-xs transition-[color,box-shadow,background-color] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        // Empty/idle look — same treatment as Input so the user can tell at a
        // glance which areas are fillable.
        "bg-muted/40 dark:bg-input/30 border-input/80",
        "placeholder:text-muted-foreground/70 placeholder:italic",
        // Focus / typed states
        "focus-visible:bg-background focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "[&:not(:placeholder-shown)]:bg-background",
        // Validation
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
