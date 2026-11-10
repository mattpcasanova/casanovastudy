"use client"

// "Another language for some students": a quiet section at the bottom of the
// teacher's assignment page. Ticked students get the same practice, question
// for question, in the language picked (POST /api/practice-assignments/[id]/language);
// it stays one assignment with one set of scores. Rarely needed, so it is not
// part of the assign dialog or the settings above.

import { useEffect, useState } from "react"
import { Languages, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { actionButton, actionButtonPrimary, selectBox } from "@/components/grading/grading-ui"
import { authFetch } from "@/lib/auth-fetch"
import { usePlan } from "@/components/plan/plan-provider"
import { GUIDE_LANGUAGES, normalizeLanguage, type GuideLanguage } from "@/lib/study-options"
import { cn } from "@/lib/utils"

interface Student { rosterId: string; name: string; language?: string | null }

export const languageChip = (language: string | null | undefined) => (language ? GUIDE_LANGUAGES.find((l) => l.value === language)?.name ?? null : null)

export function AssignmentLanguage({ assignmentId, guideLanguage, students, onChanged }: {
  assignmentId: string
  guideLanguage?: string | null
  students: Student[]
  onChanged: () => void | Promise<void>
}) {
  const { openPremium } = usePlan()
  const from = normalizeLanguage(guideLanguage)
  const options = GUIDE_LANGUAGES.filter((l) => l.value !== from)
  const [open, setOpen] = useState(false)
  const [language, setLanguage] = useState<GuideLanguage>(options[0].value)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState("")
  const using = students.filter((s) => s.language)

  // Opening, or switching language: tick who has that language now.
  useEffect(() => {
    if (open) setPicked(new Set(students.filter((s) => s.language === language).map((s) => s.rosterId)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, language])
  useEffect(() => {
    if (!busy) return
    setSeconds(0)
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [busy])

  const start = () => {
    const first = using[0]?.language
    if (first && options.some((l) => l.value === first)) setLanguage(first as GuideLanguage)
    setError(""); setOpen(true)
  }
  const save = async () => {
    setBusy(true); setError("")
    try {
      const res = await authFetch(`/api/practice-assignments/${assignmentId}/language`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language, rosterIds: [...picked] }) })
      const data = await res.json().catch(() => ({}))
      if (res.status === 403 && data?.code) { openPremium(data); return }
      if (!res.ok) throw new Error(data.error || "Could not save it. Please try again.")
      await onChanged()
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save it. Please try again.")
    } finally {
      setBusy(false)
    }
  }
  const name = GUIDE_LANGUAGES.find((l) => l.value === language)!.name
  const before = new Set(students.filter((s) => s.language === language).map((s) => s.rosterId))
  const changed = picked.size !== before.size || [...picked].some((id) => !before.has(id))

  return (
    <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-100/70 px-4 py-3 text-sm text-slate-700">
      <p className="min-w-[11.5rem] flex-1">
        {using.length
          ? <><span className="font-semibold text-slate-900">{using.length} student{using.length === 1 ? " gets" : "s get"} this in another language.</span> Same questions and the same score column.</>
          : <>A student who reads better in another language can get this same practice in it.</>}
      </p>
      <button type="button" className={actionButton} onClick={start}><Languages />{using.length ? "Change languages" : "Another language"}</button>

      <Dialog open={open} onOpenChange={(o) => { if (!busy) setOpen(o) }}>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Another language for some students</DialogTitle>
            <DialogDescription>They get the same questions with the same answers, written in the language you pick. It stays one assignment: their scores sit with everyone else&apos;s.</DialogDescription>
          </DialogHeader>
          {busy ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center" role="status">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="font-semibold text-slate-900">Saving…</p>
              <p className="text-sm text-slate-600">The first time a language is used the practice is written in it, which can take 30 to 90 seconds. Keep this tab open. {seconds >= 5 && <span className="tabular-nums">({seconds} s)</span>}</p>
            </div>
          ) : (
            <>
              <label className="block text-sm font-semibold text-slate-800">Language
                <select value={language} onChange={(e) => setLanguage(e.target.value as GuideLanguage)} className={cn(selectBox, "mt-1.5 block w-full pr-9")}>
                  {options.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </label>
              {/* A plain div does the scrolling: a <fieldset> ignores flex shrinking, so a long class list
                  ran under the note and the buttons instead of scrolling inside the dialog. */}
              <div role="group" aria-labelledby="language-who" className="flex min-h-0 flex-1 flex-col">
                <p id="language-who" className="mb-1.5 text-sm font-semibold text-slate-800">Who gets it in {name}?</p>
                <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                  {students.map((s) => {
                    const other = s.language && s.language !== language ? languageChip(s.language) : null
                    return (
                      <li key={s.rosterId}>
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50">
                          <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={picked.has(s.rosterId)} onChange={(e) => setPicked((p) => { const n = new Set(p); if (e.target.checked) n.add(s.rosterId); else n.delete(s.rosterId); return n })} />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{s.name}</span>
                          {other && <span className="text-xs text-slate-500">now in {other}</span>}
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </div>
              <p className="text-sm text-slate-600">Best set before a student starts: answers they already saved were in the other language. Untick a student to give them the original again.</p>
              {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" className={actionButton} onClick={() => setOpen(false)}>Cancel</button>
                <button type="button" className={cn(actionButtonPrimary, "disabled:opacity-50")} onClick={() => void save()} disabled={!changed}>Save</button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
