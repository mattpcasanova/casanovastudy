"use client"

// "Share with a class": give a guide of any format to a class, no grading.
// Students see it on My Classes and the homepage strip. On quiz/practice/
// adaptive guides it sits beside Assign (which collects scores); on every
// other format it's the bar itself.

import { useEffect, useState } from "react"
import Link from "next/link"
import { BookOpen, Check, Loader2, Share2, X } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { actionButton, actionButtonPrimary, selectBox } from "@/components/grading/grading-ui"
import { authFetch } from "@/lib/auth-fetch"
import { sortClasses } from "@/lib/classes/sort"
import { schoolYearFor } from "@/lib/classes/years"
import { cn } from "@/lib/utils"

export interface GuideShare { id: string; classId: string; className: string; period: string | null; note: string | null; createdAt: string }
interface ClassOption { id: string; name: string; period: string | null; is_archived?: boolean; school_year?: string | null; created_at?: string }

const classLabel = (c: { name?: string; className?: string; period: string | null }) => { const name = c.name ?? c.className ?? ''; return c.period ? `${name} (Period ${c.period})` : name }

export function useGuideShares(guideId: string) {
  const [shares, setShares] = useState<GuideShare[] | null>(null)
  const load = async () => {
    const res = await authFetch(`/api/shared-guides?guideId=${guideId}`, { cache: "no-store" })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setShares(data.shares ?? [])
  }
  useEffect(() => { void load() }, [guideId]) // eslint-disable-line react-hooks/exhaustive-deps
  return { shares, reload: load }
}

export function ShareClassDialog({ open, onOpenChange, guide, shares, onChanged }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  guide: { id: string; title: string }
  shares: GuideShare[]
  onChanged: () => void | Promise<void>
}) {
  const [classes, setClasses] = useState<ClassOption[] | null>(null)
  const [classId, setClassId] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open || classes) return
    void (async () => {
      const res = await authFetch("/api/classes", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      const year = schoolYearFor()
      const list = ((data.classes ?? []) as ClassOption[]).filter((c) => !c.is_archived && (!c.school_year || c.school_year === year))
      const sorted = sortClasses(list.map((c) => ({ ...c, period: c.period ?? null })))
      setClasses(sorted)
      const first = sorted.find((c) => !shares.some((s) => s.classId === c.id))
      if (first && !classId) setClassId(first.id)
    })()
  }, [open, classes, shares, classId])

  const share = async () => {
    if (!classId) return
    setBusy(true); setError("")
    try {
      const res = await authFetch("/api/shared-guides", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classId, studyGuideId: guide.id, note }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not share it")
      await onChanged()
      setNote("")
      const next = classes?.find((c) => c.id !== classId && !shares.some((s) => s.classId === c.id))
      setClassId(next?.id ?? "")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not share it")
    } finally {
      setBusy(false)
    }
  }
  const unshare = async (id: string) => {
    await authFetch("/api/shared-guides", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    await onChanged()
  }

  const left = (classes ?? []).filter((c) => !shares.some((s) => s.classId === c.id))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Share with a class</DialogTitle>
          <DialogDescription>Students in the class see &ldquo;{guide.title}&rdquo; on My Classes and their home page. No grading, nothing due.</DialogDescription>
        </DialogHeader>
        {shares.length > 0 && (
          <ul className="space-y-1.5">
            {shares.map((s) => (
              <li key={s.id} className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                <Check className="h-4 w-4 shrink-0 text-emerald-700" />
                <span className="min-w-0 flex-1 truncate">{classLabel(s)}{s.note ? <span className="text-emerald-800/80"> · {s.note}</span> : null}</span>
                <button type="button" onClick={() => void unshare(s.id)} className="rounded-md p-1 text-emerald-800 hover:bg-emerald-100" aria-label={`Stop sharing with ${classLabel(s)}`}><X className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
        {!classes ? (
          <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading your classes…</p>
        ) : classes.length === 0 ? (
          <p className="text-sm text-slate-600">No classes yet. <Link href="/teacher/classes" className="font-semibold text-blue-700 hover:underline">Add a class</Link> first (import a file or Google Classroom).</p>
        ) : left.length === 0 ? (
          <p className="text-sm text-slate-600">Shared with every class.</p>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-800">Class
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className={cn(selectBox, "mt-1 w-full pr-9")}>
                {left.map((c) => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-800">A note for them <span className="font-normal text-slate-500">(optional)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Use this to review before Friday's test" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            </label>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button type="button" onClick={() => void share()} disabled={busy || !classId} className={cn(actionButtonPrimary, "w-full")}>{busy ? <Loader2 className="animate-spin" /> : <Share2 />}Share with this class</button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** The share button plus "Shared with P2, P5" for a guide; used beside Assign and in ShareBar. */
export function ShareWithClassButton({ guide, primary = false }: { guide: { id: string; title: string }; primary?: boolean }) {
  const { shares, reload } = useGuideShares(guide.id)
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={primary ? actionButtonPrimary : actionButton}>
        <Share2 />{shares?.length ? `Shared with ${shares.length} class${shares.length === 1 ? "" : "es"}` : "Share with a class"}
      </button>
      <ShareClassDialog open={open} onOpenChange={setOpen} guide={guide} shares={shares ?? []} onChanged={reload} />
    </>
  )
}

/** The bar on a teacher's own guide of a format that can't be assigned (outline, cheat sheet, flashcards...). */
export function ShareBar({ guide }: { guide: { id: string; title: string } }) {
  return (
    <div className="mx-auto mb-6 flex max-w-3xl flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm print:hidden">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><BookOpen className="h-5 w-5" /></span>
      <p className="min-w-0 flex-1 text-sm text-slate-700"><span className="font-semibold text-slate-900">Give this to students.</span> Share it with a class and it shows on their My Classes page.</p>
      <ShareWithClassButton guide={guide} primary />
    </div>
  )
}
