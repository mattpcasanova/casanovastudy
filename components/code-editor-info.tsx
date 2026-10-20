"use client"

// The "i" next to the Include code editor switch: what the exercises are and
// where they show up.

import { useState } from "react"
import { CheckCircle2, Info, Play, ShieldCheck, Terminal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function CodeEditorInfo({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
        className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-orange-600", className)}
        aria-label="About the code editor"
      >
        <Info className="h-4 w-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>About the code editor</DialogTitle>
            <DialogDescription>
              Your guide gets &ldquo;write the code&rdquo; exercises you solve right on the page.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-3 text-sm text-slate-700">
            <li className="flex gap-3">
              <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
              <span><strong>Write real code:</strong> each exercise gives you a task and starter code in Python or JavaScript.</span>
            </li>
            <li className="flex gap-3">
              <Play className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <span><strong>Run it</strong> as often as you like to see what it prints.</span>
            </li>
            <li className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span><strong>Check it:</strong> tests show which cases pass, what your code returned and what was expected. Stuck? Ask for a hint or see a solution.</span>
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <span>Code runs in your browser, walled off from your account. Python takes a few seconds to start the first time.</span>
            </li>
          </ul>
          <p className="text-xs text-slate-500">
            Exercises appear in Practice, Outline and Summary guides. Turn this off for reading and multiple-choice code questions only.
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
