import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base layout/sizing
        "file:text-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow,background-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        // Empty/idle look — subtle muted background + slightly stronger border so
        // it visually reads as "this is a fillable field" rather than text the
        // user already typed. Placeholder is italic + muted.
        "bg-muted/40 dark:bg-input/30 border-input/80",
        "placeholder:text-muted-foreground/70 placeholder:italic",
        // Focus look — white background, ring, brighter border.
        "focus-visible:bg-background focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        // Once the user has typed something the field becomes opaque.
        "[&:not(:placeholder-shown)]:bg-background",
        // Validation
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
