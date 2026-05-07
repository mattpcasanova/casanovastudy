"use client"

import { useState } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Check, Palette } from "lucide-react"
import {
  CLASS_COLOR_TOKENS,
  COLOR_DOT,
  type ClassColorToken,
  isClassColorToken,
} from "@/lib/class-colors"

interface Props {
  value: ClassColorToken | null
  onChange: (token: ClassColorToken | null) => Promise<void> | void
  // The other party's color (teacher color when student is picking, etc.) so
  // "Reset" reads as "use default" rather than "clear to nothing."
  fallbackColor?: ClassColorToken | null
  buttonLabel?: string
  size?: "sm" | "default"
}

export default function ClassColorPicker({
  value,
  onChange,
  fallbackColor,
  buttonLabel = "Color",
  size = "default",
}: Props) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const display = value ?? fallbackColor ?? null
  const dotClass = display && isClassColorToken(display) ? COLOR_DOT[display] : "bg-muted-foreground"

  const handle = async (next: ClassColorToken | null) => {
    setSaving(true)
    try {
      await onChange(next)
    } finally {
      setSaving(false)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size={size} disabled={saving}>
          <span className={`inline-block w-3 h-3 rounded-full mr-2 ${dotClass}`} />
          <Palette className="h-4 w-4 mr-1.5" />
          {buttonLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="grid grid-cols-8 gap-1.5">
          {CLASS_COLOR_TOKENS.map(token => {
            const selected = value === token
            return (
              <button
                key={token}
                type="button"
                onClick={() => handle(token)}
                aria-label={token}
                className={`relative w-7 h-7 rounded-full ${COLOR_DOT[token]} hover:scale-110 transition-transform ring-offset-background focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring ${
                  selected ? "ring-2 ring-offset-2 ring-foreground" : ""
                }`}
              >
                {selected && <Check className="h-4 w-4 text-white absolute inset-0 m-auto" strokeWidth={3} />}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => handle(null)}
          className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground py-1.5 rounded hover:bg-muted/50 transition-colors"
        >
          {fallbackColor ? `Use teacher's color` : "Reset to default"}
        </button>
      </PopoverContent>
    </Popover>
  )
}
