"use client"

// "Study it another way": make a new guide in another format from this one
// (flashcards, then a quiz on the same material). The new guide uses this
// guide's content as its source (sourceGuideId on the generate route), with an
// optional "anything to change?" note. Goes through the homepage prefill path.

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, CreditCard, FileText, HelpCircle, History, List, Puzzle, ScrollText, SlidersHorizontal, Target } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { actionButton, actionButtonPrimary } from "@/components/grading/grading-ui"
import { openHomeWithPrefill } from "@/lib/prefill"
import { normalizeDifficulty } from "@/lib/study-options"
import type { StudyGuideRecord } from "@/lib/supabase"
import { cn } from "@/lib/utils"

export const NEXT_FORMATS = [
  { value: "quiz", label: "Quiz", icon: HelpCircle, desc: "Test yourself" },
  { value: "flashcards", label: "Flashcards", icon: CreditCard, desc: "Flip and memorize" },
  { value: "practice", label: "Practice", icon: Puzzle, desc: "Match, fill in, sort" },
  { value: "adaptive", label: "Adaptive practice", icon: Target, desc: "Adjusts as you go" },
  { value: "outline", label: "Outline", icon: List, desc: "Topics to check off" },
  { value: "summary", label: "Summary", icon: ScrollText, desc: "Read the key ideas" },
  { value: "cheatsheet", label: "Cheat sheet", icon: FileText, desc: "One-page reference" },
  { value: "timeline", label: "Timeline", icon: History, desc: "Events in order" },
] as const

type NextFormat = (typeof NEXT_FORMATS)[number]["value"]

const FORMAT_NAMES: Record<string, string> = {
  quiz: "quiz", flashcards: "flashcards", practice: "practice set", adaptive: "adaptive practice", outline: "outline",
  summary: "summary", cheatsheet: "cheat sheet", timeline: "timeline", custom: "guide", plan: "study plan",
}

/** Plans are roadmaps, not material, so they don't get "another way". */
export function canMakeAnotherFormat(guide: Pick<StudyGuideRecord, "format">): boolean {
  return guide.format !== "plan"
}

export function NextFormatDialog({ guide, open, onOpenChange, initialFormat }: {
  guide: StudyGuideRecord
  open: boolean
  onOpenChange: (open: boolean) => void
  initialFormat?: NextFormat | null
}) {
  const router = useRouter()
  const [format, setFormat] = useState<NextFormat | null>(initialFormat ?? null)
  const [changes, setChanges] = useState("")
  const [opened, setOpened] = useState(open)
  // Re-seed the picked format each time the dialog opens from a different chip.
  if (open !== opened) {
    setOpened(open)
    if (open) setFormat(initialFormat ?? null)
  }

  const options = NEXT_FORMATS.filter((f) => f.value !== guide.format)
  const fromName = FORMAT_NAMES[guide.format] ?? "guide"

  const go = (autoStart: boolean) => {
    if (!format) return
    const label = NEXT_FORMATS.find((f) => f.value === format)!.label
    const difficulty = normalizeDifficulty(guide.difficulty_level ?? undefined)
    router.push(openHomeWithPrefill({
      source: "from-guide",
      sourceTitle: guide.title,
      detail: `${label} from your ${fromName}`,
      studyRequest: guide.topic_focus?.trim() || guide.title,
      // "<title>: Quiz", so it's easy to tell apart from the original in My Guides.
      studyGuideName: guide.title.toLowerCase().endsWith(label.toLowerCase()) ? guide.title : `${guide.title}: ${label}`,
      format,
      subject: guide.subject ?? undefined,
      gradeLevel: guide.grade_level ?? undefined,
      difficultyLevel: difficulty === "easier" || difficulty === "hard" ? difficulty : undefined,
      sourceGuide: { id: guide.id, title: guide.title, format: guide.format },
      additionalInstructions: changes.trim() || undefined,
      language: guide.language ?? "en",
      autoStart,
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Study it another way</DialogTitle>
          <DialogDescription>
            Make a new guide from <span className="font-medium text-slate-700">{guide.title}</span>. It covers the same material in the format you pick.
          </DialogDescription>
        </DialogHeader>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-800">Make it a…</legend>
          <div className="grid grid-cols-2 gap-2">
            {options.map((f) => {
              const on = format === f.value
              return (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFormat(f.value)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition",
                    on ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"
                  )}
                >
                  <f.icon className={cn("h-5 w-5 shrink-0", on ? "text-blue-700" : "text-slate-500")} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-900">{f.label}</span>
                    <span className="block truncate text-xs text-slate-500">{f.desc}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="next-format-changes" className="text-sm font-semibold text-slate-800">
            Anything to change? <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <Textarea
            id="next-format-changes"
            value={changes}
            onChange={(e) => setChanges(e.target.value.slice(0, 1000))}
            rows={3}
            placeholder="e.g. Only the last two topics, make it harder, more word problems"
            className="mt-1.5"
          />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => go(false)} disabled={!format} className={cn(actionButton, "disabled:opacity-50")}>
            <SlidersHorizontal className="h-4 w-4" />More options
          </button>
          <button type="button" onClick={() => go(true)} disabled={!format} className={cn(actionButtonPrimary, "disabled:opacity-50")}>
            Create it<ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
