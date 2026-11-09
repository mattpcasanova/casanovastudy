"use client"

// "Copy at an easier reading level": the same guide, question for question with the
// same answers, in simpler words, saved as a new guide (POST /api/study-guides/[id]/reading-level).
// For a teacher with a student who reads below grade level (ELL, ESE, a younger reader).

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BookOpen, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { actionButton, actionButtonPrimary } from "@/components/grading/grading-ui"
import { authFetch } from "@/lib/auth-fetch"
import { usePlan } from "@/components/plan/plan-provider"
import { READING_LEVELS, type ReadingLevel } from "@/lib/study-options"
import { cn } from "@/lib/utils"

export function ReadingLevelDialog({ guide, open, onOpenChange, teacher }: {
  guide: { id: string; title: string; format: string; reading_level?: string | null }
  open: boolean
  onOpenChange: (open: boolean) => void
  teacher?: boolean
}) {
  const router = useRouter()
  const { openPremium } = usePlan()
  const options = READING_LEVELS.filter((l) => l.value !== guide.reading_level)
  const [level, setLevel] = useState<ReadingLevel | null>(null)
  const [busy, setBusy] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!busy) return
    setSeconds(0)
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [busy])

  const go = async () => {
    if (!level || busy) return
    setBusy(true); setError("")
    try {
      const res = await authFetch(`/api/study-guides/${guide.id}/reading-level`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ level }) })
      const data = await res.json().catch(() => ({}))
      if (res.status === 403 && data?.code) { openPremium(data); setBusy(false); return }
      if (!res.ok || !data.studyGuideUrl) throw new Error(data.error || "Could not make the copy. Please try again.")
      onOpenChange(false)
      router.push(data.studyGuideUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not make the copy. Please try again.")
      setBusy(false)
    }
  }

  const items = guide.format === "flashcards" ? "cards" : guide.format === "quiz" || guide.format === "practice" || guide.format === "adaptive" ? "questions and answers" : "content"

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o) }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Copy at an easier reading level</DialogTitle>
          <DialogDescription>
            Makes a new guide with the same {items} as <span className="font-medium text-slate-700">{guide.title}</span>, written in simpler words for a student who reads below grade level. The material stays at the same grade; only the reading gets easier. This one stays as it is.
          </DialogDescription>
        </DialogHeader>

        {busy ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center" role="status">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="font-semibold text-slate-900">Rewriting it at {READING_LEVELS.find((l) => l.value === level)?.label.toLowerCase()}…</p>
            <p className="text-sm text-slate-600">This usually takes 30 to 90 seconds. Keep this tab open. {seconds >= 5 && <span className="tabular-nums">({seconds} s)</span>}</p>
          </div>
        ) : (
          <>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-800">Reading level</legend>
              <div className="grid grid-cols-1 gap-2">
                {options.map((l) => {
                  const on = level === l.value
                  return (
                    <button key={l.value} type="button" aria-pressed={on} onClick={() => setLevel(l.value)}
                      className={cn("rounded-xl border-2 px-3 py-2.5 text-left transition", on ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300")}>
                      <span className="block text-sm font-semibold text-slate-900">{l.label}</span>
                      <span className="block text-sm text-slate-600">{l.note}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
            {teacher && (guide.format === "quiz" || guide.format === "practice" || guide.format === "adaptive") && (
              <p className="text-sm text-slate-600">The copy is its own guide: assign it to the students who need it from its page. Their scores show under that assignment.</p>
            )}
            {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className={actionButton} onClick={() => onOpenChange(false)}>Cancel</button>
              <button type="button" className={cn(actionButtonPrimary, "disabled:opacity-50")} onClick={() => void go()} disabled={!level}><BookOpen />Make the copy</button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
