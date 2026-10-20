"use client"

// Pick Google Classroom courses to import as classes (after connecting,
// /api/google/classroom/*). Courses imported before are updated, not doubled.

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { authFetch } from "@/lib/auth-fetch"
import { actionButton, actionButtonPrimary } from "@/components/grading/grading-ui"
import { cn } from "@/lib/utils"

interface Course { id: string; name: string; section: string | null; period: string | null; importedClassId: string | null }

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
  const [picked, setPicked] = useState<Set<string>>(new Set())
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
      setCourses(data.courses)
      setPicked(new Set((data.courses as Course[]).filter((c) => !c.importedClassId).map((c) => c.id)))
    })()
  }, [open])

  const doImport = async () => {
    setBusy(true)
    setError("")
    try {
      const res = await authFetch("/api/google/classroom/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseIds: [...picked] }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setReconnect(!!data.reconnect); throw new Error(data.error || "Import failed") }
      const added = data.classes.reduce((s: number, c: { added: number }) => s + c.added, 0)
      const linked = data.classes.reduce((s: number, c: { linked: number }) => s + c.linked, 0)
      onImported(`Imported ${added} student${added === 1 ? "" : "s"} from ${data.classes.length} Google Classroom course${data.classes.length === 1 ? "" : "s"}${linked ? `; ${linked} already have accounts and were linked` : ""}.`)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from Google Classroom</DialogTitle>
          <DialogDescription>Each course becomes a class with its students and their school emails. Students who sign in with that email are linked to their name automatically. Courses you imported before are updated with any new students.</DialogDescription>
        </DialogHeader>
        {!courses ? (
          <p className="flex items-center gap-2 py-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading your courses…</p>
        ) : (
          <div className="space-y-3">
            {courses.length > 0 && (
              <ul className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2 text-sm">
                {courses.map((c) => (
                  <li key={c.id}>
                    <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                      <input type="checkbox" checked={picked.has(c.id)} onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(c.id); else n.delete(c.id); return n })} className="h-4 w-4 rounded border-slate-300" />
                      <span className="min-w-0 flex-1 text-slate-900">{c.name}{c.section ? <span className="text-slate-500"> · {c.section}</span> : null}</span>
                      {c.importedClassId && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Imported</span>}
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {courses.length === 0 && !error && <p className="text-sm text-slate-600">No active courses where you&apos;re a teacher.</p>}
            {error && (
              <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
                {error}{reconnect && <> <button type="button" onClick={() => void connectGoogleClassroom()} className="font-semibold underline">Connect again</button></>}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className={actionButton}>Cancel</Button>
              <Button onClick={doImport} disabled={busy || !picked.size} className={cn(actionButtonPrimary, "bg-blue-600 hover:bg-blue-700")}>
                {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing…</> : `Import ${picked.size} course${picked.size === 1 ? "" : "s"}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
