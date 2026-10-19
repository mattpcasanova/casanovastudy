"use client"

// Assign one of the teacher's practice sets (quiz, practice, adaptive) to some
// students of a class: pick the class and students, optional due date, and
// attempts (quiz/practice). Then share the link (copy or QR code).

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import QRCode from "qrcode"
import { Check, Copy, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { actionButton, actionButtonPrimary } from "@/components/grading/grading-ui"
import { authFetch } from "@/lib/auth-fetch"
import { ClassroomPracticePanel } from "./classroom-practice-panel"
import { sortClasses } from "@/lib/classes/sort"
import type { AssignPreset } from "@/lib/practice/preset"
import { cn } from "@/lib/utils"

interface ClassOption { id: string; name: string; period: string | null; school_year?: string; is_archived?: boolean; created_at?: string }
interface RosterRow { id: string; firstName: string; lastName: string; linked: boolean; left: boolean; email: string | null; studentNumber: string | null }
export interface CreatedAssignment { id: string; code: string; url: string; title: string }

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const inDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d) }
/** Next Friday (or a week on Friday when it's Friday). */
const friday = () => { const d = new Date(); d.setDate(d.getDate() + (((5 - d.getDay() + 7) % 7) || 7)); return ymd(d) }
const TIMES = [["08:00", "8:00 AM"], ["12:00", "12:00 PM"], ["15:00", "3:00 PM"], ["17:00", "5:00 PM"], ["20:00", "8:00 PM"], ["23:59", "11:59 PM"]] as const
const chip = (on: boolean) => cn("h-10 rounded-xl px-3.5 text-sm font-semibold ring-1 transition", on ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50")

export function AssignDialog({ open, onOpenChange, guide, preset, onCreated }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  guide: { id: string; title: string; format: string }
  preset?: AssignPreset | null
  onCreated?: (a: CreatedAssignment) => void
}) {
  const [classes, setClasses] = useState<ClassOption[] | null>(null)
  const [classId, setClassId] = useState(preset?.classId ?? "")
  const [roster, setRoster] = useState<RosterRow[] | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set(preset?.rosterIds ?? []))
  const [title, setTitle] = useState(preset?.title ?? guide.title)
  const [dueOn, setDueOn] = useState(false)
  const [dueDay, setDueDay] = useState(() => inDays(2))
  const [dueTime, setDueTime] = useState("23:59")
  const [attempts, setAttempts] = useState("1")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [created, setCreated] = useState<CreatedAssignment | null>(null)
  const [qr, setQr] = useState("")
  const [copied, setCopied] = useState(false)
  const mastery = guide.format === "adaptive"

  useEffect(() => {
    if (!open || classes) return
    void (async () => {
      const res = await authFetch("/api/classes", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      const list = ((data.classes ?? []) as ClassOption[]).filter((c) => !c.is_archived)
      setClasses(sortClasses(list.map((c) => ({ ...c, period: c.period ?? null }))))
    })()
  }, [open, classes])

  useEffect(() => {
    if (!classId) { setRoster(null); return }
    void (async () => {
      setRoster(null)
      const res = await authFetch(`/api/classes/${classId}/roster`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      setRoster(((data.roster ?? []) as RosterRow[]).filter((r) => !r.left).sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)))
    })()
  }, [classId])

  useEffect(() => {
    if (!created) return
    void QRCode.toDataURL(created.url, { margin: 1, width: 360 }).then(setQr).catch(() => setQr(""))
  }, [created])

  const chosen = useMemo(() => (roster ?? []).filter((r) => picked.has(r.id)), [roster, picked])
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const submit = async () => {
    setBusy(true)
    setError("")
    try {
      const res = await authFetch("/api/practice-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideId: guide.id,
          classId,
          rosterIds: chosen.map((r) => r.id),
          title,
          dueAt: dueOn ? new Date(`${dueDay}T${dueTime}`).toISOString() : null,
          maxAttempts: mastery || attempts === "any" ? null : Number(attempts),
          source: preset?.source,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || "Could not assign it"); return }
      const a = { id: data.assignment.id, code: data.assignment.code, url: data.assignment.url, title: data.assignment.title }
      setCreated(a)
      onCreated?.(a)
    } finally {
      setBusy(false)
    }
  }

  const close = (o: boolean) => {
    onOpenChange(o)
    if (!o) { setCreated(null); setQr(""); setCopied(false) }
  }

  const ready = chosen.filter((r) => r.linked).length
  const withWay = chosen.filter((r) => !r.linked && (r.email || r.studentNumber)).length

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-4 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{created ? "Assigned. Share the link" : "Assign to students"}</DialogTitle>
          <DialogDescription>
            {created
              ? "Post the link where your students will see it (Google Classroom, Canvas, Schoology, email) or project the QR code. Each student signs in and does it; their scores show on the assignment page."
              : mastery ? "Adaptive practice is graded on how many topics each student masters." : "Graded on % right. Their best attempt counts."}
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <div className="-mx-6 min-h-0 flex-1 space-y-4 overflow-y-auto px-6">
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-xl bg-slate-100 px-3 py-2.5 text-sm text-slate-900">{created.url}</code>
              <button type="button" className={actionButtonPrimary} onClick={async () => { await navigator.clipboard.writeText(created.url); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>
                {copied ? <><Check />Copied</> : <><Copy />Copy link</>}
              </button>
            </div>
            {qr && <img src={qr} alt={`QR code for ${created.url}`} className="mx-auto h-56 w-56 rounded-xl ring-1 ring-slate-200" />}
            <ClassroomPracticePanel assignmentId={created.id} students={chosen.length} compact />
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-inset ring-slate-200">
              {chosen.length} student{chosen.length === 1 ? "" : "s"}: {ready} already have a linked account.
              {chosen.length - ready > 0 && <> The other {chosen.length - ready} pick their name when they open the link{withWay ? ", matched by their school email or confirmed with their student ID" : ""}.</>}
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className={actionButton} onClick={() => close(false)}>Done</button>
              <Link href={`/teacher/practice/${created.id}`} className={actionButtonPrimary}>Open the assignment page</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="-mx-6 min-h-0 flex-1 space-y-4 overflow-y-auto px-6">
              <label className="block text-sm font-medium text-slate-700">
                Title students see
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-500" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Class
                <select value={classId} onChange={(e) => { setClassId(e.target.value); setPicked(new Set()) }} className="mt-1 h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white bg-[length:18px] bg-[right_0.85rem_center] bg-no-repeat pl-3 pr-10 text-sm" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}>
                  <option value="">{classes ? "Pick a class" : "Loading classes…"}</option>
                  {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.period ? ` (P${c.period})` : ""}{c.school_year ? ` · ${c.school_year}` : ""}</option>)}
                </select>
              </label>
              {classes && classes.length === 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">You don&apos;t have any classes yet. <Link href="/teacher/classes" className="font-semibold underline">Add one</Link> (import your class list), then assign.</p>}
              {classId && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">Students ({chosen.length} picked)</span>
                    {roster && <span className="flex gap-2">
                      <button type="button" className="font-semibold text-blue-700 hover:underline" onClick={() => setPicked(new Set(roster.map((r) => r.id)))}>Whole class</button>
                      <button type="button" className="font-semibold text-slate-600 hover:underline" onClick={() => setPicked(new Set())}>None</button>
                    </span>}
                  </div>
                  {!roster ? (
                    <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading the class list…</p>
                  ) : roster.length === 0 ? (
                    <p className="text-sm text-slate-500">This class has no names yet.</p>
                  ) : (
                    <ul className="grid max-h-64 gap-1.5 overflow-y-auto rounded-xl bg-slate-50 p-2 ring-1 ring-inset ring-slate-200 sm:grid-cols-2">
                      {roster.map((r) => (
                        <li key={r.id}>
                          <label className={cn("flex h-10 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-sm", picked.has(r.id) ? "bg-blue-50 text-blue-900 ring-1 ring-blue-200" : "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50")}>
                            <input type="checkbox" checked={picked.has(r.id)} onChange={() => toggle(r.id)} className="h-4 w-4 rounded border-slate-300" />
                            <span className="min-w-0 flex-1 truncate">{r.lastName}{r.lastName && r.firstName ? ", " : ""}{r.firstName}</span>
                            {r.linked && <span className="text-xs text-emerald-700" title="Has a linked account">●</span>}
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div>
                <p className="mb-1.5 text-sm font-medium text-slate-700">Due</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={chip(!dueOn)} onClick={() => setDueOn(false)}>No due date</button>
                  {([["Tomorrow", inDays(1)], ["Friday", friday()], ["In a week", inDays(7)]] as const).map(([label, day]) => (
                    <button key={label} type="button" className={chip(dueOn && dueDay === day)} onClick={() => { setDueOn(true); setDueDay(day) }}>{label}</button>
                  ))}
                  <button type="button" className={chip(dueOn && ![inDays(1), friday(), inDays(7)].includes(dueDay))} onClick={() => setDueOn(true)}>Pick a date</button>
                </div>
                {dueOn && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-700">
                    <input type="date" value={dueDay} min={inDays(0)} onChange={(e) => setDueDay(e.target.value)} aria-label="Due date" className="h-10 rounded-xl border border-slate-300 bg-white px-3" />
                    <span>at</span>
                    <select value={dueTime} onChange={(e) => setDueTime(e.target.value)} aria-label="Due time" className="h-10 appearance-none rounded-xl border border-slate-300 bg-white bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pl-3 pr-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}>
                      {TIMES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                    </select>
                    <span className="text-slate-500">{new Date(`${dueDay}T${dueTime}`).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}</span>
                  </div>
                )}
              </div>
              {!mastery && (
                <div>
                  <p className="mb-1.5 text-sm font-medium text-slate-700">Attempts <span className="font-normal text-slate-500">(their best one counts)</span></p>
                  <div className="flex flex-wrap gap-2">
                    {([["1", "1"], ["2", "2"], ["3", "3"], ["any", "Unlimited"]] as const).map(([v, label]) => (
                      <button key={v} type="button" className={cn(chip(attempts === v), "min-w-[3rem]")} onClick={() => setAttempts(v)}>{label}</button>
                    ))}
                  </div>
                </div>
              )}
              {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" className={actionButton} onClick={() => close(false)}>Cancel</button>
              <button type="button" className={actionButtonPrimary} disabled={busy || !classId || !chosen.length || !title.trim()} onClick={() => void submit()}>
                {busy ? <Loader2 className="animate-spin" /> : null}Assign to {chosen.length || ""} student{chosen.length === 1 ? "" : "s"}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
