"use client"

// Pick Google Classroom courses to import (after connecting,
// /api/google/classroom/*). Each course either goes into a class the teacher
// already has (suggested: imported before, or same period and name), which
// adds the school emails to the students there, or becomes a new class with a
// name, period and subject the teacher can change first.

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { authFetch } from "@/lib/auth-fetch"
import { actionButton, actionButtonPrimary, selectBox } from "@/components/grading/grading-ui"
import { cn } from "@/lib/utils"

interface Course { id: string; name: string; section: string | null; suggestedName: string; suggestedPeriod: string | null; importedClassId: string | null; targetClassId: string | null }
interface ExistingClass { id: string; name: string; period: string | null; subject: string | null; googleCourseId: string | null }
/** Where a course goes: an existing class id, or "new" with these details. */
interface Plan { target: string; name: string; period: string; subject: string }

const NEW = "new"
const fieldBox = "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition hover:border-slate-400 focus:border-blue-500"
const classLabel = (c: { name: string; period: string | null }) => `${c.name}${c.period ? ` · Period ${c.period}` : ""}`

/** Sends the teacher to Google; `next` is the in-app page to come back to. */
export async function connectGoogleClassroom(next?: string): Promise<string | null> {
  const res = await authFetch("/api/google/classroom/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ next: next ?? null }) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.url) return data.error || "Could not connect to Google Classroom"
  window.location.href = data.url
  return null
}

export function GoogleClassroomDialog({ open, onOpenChange, onImported }: { open: boolean; onOpenChange: (open: boolean) => void; onImported: (summary: string) => void }) {
  const [courses, setCourses] = useState<Course[] | null>(null)
  const [classes, setClasses] = useState<ExistingClass[]>([])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [plans, setPlans] = useState<Record<string, Plan>>({})
  const [error, setError] = useState("")
  const [reconnect, setReconnect] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setCourses(null)
    setError("")
    void (async () => {
      const res = await authFetch("/api/google/classroom/courses", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || "Could not load your courses"); setReconnect(!!data.reconnect); setCourses([]); return }
      const list = data.courses as Course[]
      setCourses(list)
      setClasses(data.classes ?? [])
      setPicked(new Set(list.filter((c) => !c.importedClassId).map((c) => c.id)))
      setPlans(Object.fromEntries(list.map((c) => [c.id, { target: c.targetClassId ?? NEW, name: c.suggestedName, period: c.suggestedPeriod ?? "", subject: "" }])))
    })()
  }, [open])

  const setPlan = (courseId: string, patch: Partial<Plan>) => setPlans((p) => ({ ...p, [courseId]: { ...p[courseId], ...patch } }))
  // A class can take one course: two courses pointed at the same class is almost always a slip.
  const targets = [...picked].map((id) => plans[id]?.target).filter((t) => t && t !== NEW)
  const doubled = targets.length !== new Set(targets).size
  const missingName = [...picked].some((id) => plans[id]?.target === NEW && !plans[id].name.trim())

  const doImport = async () => {
    setBusy(true)
    setError("")
    try {
      const items = [...picked].map((courseId) => {
        const p = plans[courseId]
        return p.target === NEW ? { courseId, name: p.name.trim(), period: p.period.trim(), subject: p.subject.trim() } : { courseId, classId: p.target }
      })
      const res = await authFetch("/api/google/classroom/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setReconnect(!!data.reconnect); throw new Error(data.error || "Import failed") }
      const sum = (k: string) => data.classes.reduce((s: number, c: Record<string, number>) => s + (c[k] ?? 0), 0)
      const added = sum("added"), linked = sum("linked"), filled = sum("filled")
      const made = data.classes.filter((c: { created: boolean }) => c.created).length
      onImported([
        `Imported ${data.classes.length} Google Classroom course${data.classes.length === 1 ? "" : "s"}${made ? ` (${made} new class${made === 1 ? "" : "es"})` : ""}: ${added} new student${added === 1 ? "" : "s"} added.`,
        filled ? `Added school emails to ${filled} student${filled === 1 ? "" : "s"} already on your lists.` : "",
        linked ? `${linked} already have accounts and were linked.` : "",
      ].filter(Boolean).join(" "))
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import from Google Classroom</DialogTitle>
          <DialogDescription>Pick the courses to bring in. Add each one to a class you already have (students there get their school email, so nobody is doubled) or make it a new class. Students who sign in with that email are linked to their name automatically.</DialogDescription>
        </DialogHeader>
        {!courses ? (
          <p className="flex items-center gap-2 py-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading your courses…</p>
        ) : (
          <div className="space-y-3">
            {courses.length > 0 && (
              <ul className="space-y-2">
                {courses.map((c) => {
                  const plan = plans[c.id]
                  const on = picked.has(c.id)
                  const inputId = `gc-${c.id}`
                  return (
                    <li key={c.id} className={cn("rounded-2xl border p-3 transition", on ? "border-blue-300 bg-blue-50/40" : "border-slate-200")}>
                      <label className="flex items-center gap-3">
                        <input type="checkbox" checked={on} onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(c.id); else n.delete(c.id); return n })} className="h-5 w-5 rounded border-slate-300" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-slate-900">{c.name}</span>
                          {c.section && <span className="block truncate text-xs text-slate-500">{c.section}</span>}
                        </span>
                        {c.importedClassId && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Imported before</span>}
                      </label>
                      {on && plan && (
                        <div className="mt-3 space-y-2 pl-8">
                          <label htmlFor={`${inputId}-target`} className="block text-xs font-medium text-slate-600">Put these students in</label>
                          <select id={`${inputId}-target`} value={plan.target} onChange={(e) => setPlan(c.id, { target: e.target.value })} className={cn(selectBox, "w-full")}>
                            <option value={NEW}>A new class</option>
                            {classes.filter((k) => !k.googleCourseId || k.googleCourseId === c.id).map((k) => (
                              <option key={k.id} value={k.id}>{classLabel(k)}{k.id === c.targetClassId ? " (suggested)" : ""}</option>
                            ))}
                          </select>
                          {plan.target === NEW ? (
                            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,0.8fr)]">
                              <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Class name</span><input value={plan.name} onChange={(e) => setPlan(c.id, { name: e.target.value })} maxLength={100} className={fieldBox} /></label>
                              <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Period</span><input value={plan.period} onChange={(e) => setPlan(c.id, { period: e.target.value })} maxLength={20} className={fieldBox} /></label>
                              <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Subject (optional)</span><input value={plan.subject} onChange={(e) => setPlan(c.id, { subject: e.target.value })} maxLength={60} className={fieldBox} /></label>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-600">Students already in this class get their school email added. New students are added to the list.</p>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            {doubled && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Two courses are going into the same class. Pick a different class for one of them.</p>}
            {courses.length === 0 && !error && <p className="text-sm text-slate-600">No active courses where you&apos;re a teacher.</p>}
            {error && (
              <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
                {error}{reconnect && <> <button type="button" onClick={() => void connectGoogleClassroom()} className="font-semibold underline">Connect again</button></>}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className={actionButton}>Cancel</Button>
              <Button onClick={doImport} disabled={busy || !picked.size || doubled || missingName} className={cn(actionButtonPrimary, "bg-blue-600 hover:bg-blue-700")}>
                {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing…</> : `Import ${picked.size} course${picked.size === 1 ? "" : "s"}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
