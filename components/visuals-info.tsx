"use client"

// The small "i" next to the Include visuals switch (and on the generating
// screen). Explains what visuals are and that they take a little longer,
// without making the switch itself look like a warning.

import { useState } from "react"
import { Info, LineChart, Atom, Shapes, Timer } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function VisualsInfo({ className, label = "About visuals" }: { className?: string; label?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
        className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-blue-600", className)}
        aria-label={label}
      >
        <Info className="h-4 w-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>About visuals</DialogTitle>
            <DialogDescription>
              When your topic has them, your guide can include visuals the app draws for you.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-3 text-sm text-slate-700">
            <li className="flex gap-3">
              <LineChart className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <span><strong>Graphs and charts:</strong> functions, data displays, geometry figures, number lines.</span>
            </li>
            <li className="flex gap-3">
              <Atom className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
              <span><strong>Science models:</strong> Lewis structures, 3D molecules and shapes, energy diagrams, Punnett squares, pedigrees, free-body diagrams.</span>
            </li>
            <li className="flex gap-3">
              <Shapes className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>They&apos;re drawn from exact numbers, so they always match the questions and answers.</span>
            </li>
            <li className="flex gap-3">
              <Timer className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>Guides with visuals take a little longer to make, usually 20 to 40 seconds more, since each one is worked out to match the answers. You&apos;ll see them appear as your guide is written.</span>
            </li>
          </ul>
          <p className="text-xs text-slate-500">
            Turn visuals off for a text-only guide. Simple flowcharts and tables are always included.
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
