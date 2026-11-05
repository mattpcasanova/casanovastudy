"use client"

// "Copy in another language": the same guide, question for question, in another
// language, saved as a new guide (POST /api/study-guides/[id]/translate). For a
// teacher with a student who reads better in Spanish, Haitian Creole or Portuguese.

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Languages, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { actionButton, actionButtonPrimary } from "@/components/grading/grading-ui"
import { authFetch } from "@/lib/auth-fetch"
import { usePlan } from "@/components/plan/plan-provider"
import { GUIDE_LANGUAGES, normalizeLanguage, type GuideLanguage } from "@/lib/study-options"
import { cn } from "@/lib/utils"

const NOTES: Partial<Record<GuideLanguage, string>> = {
  "en-es": "Stays in plain English, with key terms in Spanish and a short Spanish recap. Questions stay in English.",
}

export function TranslateDialog({ guide, open, onOpenChange, teacher }: {
  guide: { id: string; title: string; format: string; language?: string | null }
  open: boolean
  onOpenChange: (open: boolean) => void
  teacher?: boolean
}) {
  const router = useRouter()
  const { openPremium } = usePlan()
  const from = normalizeLanguage(guide.language)
  const options = GUIDE_LANGUAGES.filter((l) => l.value !== from)
  const [to, setTo] = useState<GuideLanguage | null>(null)
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
    if (!to || busy) return
    setBusy(true); setError("")
    try {
      const res = await authFetch(`/api/study-guides/${guide.id}/translate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: to }) })
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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o) }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Copy in another language</DialogTitle>
          <DialogDescription>
            Makes a new guide with the same {guide.format === "flashcards" ? "cards" : guide.format === "quiz" || guide.format === "practice" || guide.format === "adaptive" ? "questions and answers" : "content"} as <span className="font-medium text-slate-700">{guide.title}</span>, in the language you pick. This one stays as it is.
          </DialogDescription>
        </DialogHeader>

        {busy ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center" role="status">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="font-semibold text-slate-900">Writing it in {GUIDE_LANGUAGES.find((l) => l.value === to)?.name}…</p>
            <p className="text-sm text-slate-600">This usually takes 30 to 90 seconds. Keep this tab open. {seconds >= 5 && <span className="tabular-nums">({seconds} s)</span>}</p>
          </div>
        ) : (
          <>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-800">Language</legend>
              <div className="grid grid-cols-1 gap-2">
                {options.map((l) => {
                  const on = to === l.value
                  return (
                    <button key={l.value} type="button" aria-pressed={on} onClick={() => setTo(l.value)}
                      className={cn("rounded-xl border-2 px-3 py-2.5 text-left transition", on ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300")}>
                      <span className="block text-sm font-semibold text-slate-900">{l.label}</span>
                      {NOTES[l.value] && <span className="block text-sm text-slate-600">{NOTES[l.value]}</span>}
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
              <button type="button" className={cn(actionButtonPrimary, "disabled:opacity-50")} onClick={() => void go()} disabled={!to}><Languages />Make the copy</button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
