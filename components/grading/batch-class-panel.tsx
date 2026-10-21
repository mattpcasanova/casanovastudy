"use client"

// The class a graded set belongs to (class results page): save the names as a
// new class, attach the set to an existing class (each paper is matched to a
// roster name), and release the reports to students who joined.

import { actionButton, actionButtonPrimary } from "@/components/grading/grading-ui"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { authFetch } from "@/lib/auth-fetch"
import { cn } from "@/lib/utils"
import { dayCount } from "@/lib/practice/assignments"

export interface BatchClassRow {
  id: string
  student_name: string
  class_id: string | null
  class_name: string | null
  class_period: string | null
  roster_id: string | null
  student_user_id: string | null
  released: boolean
}

interface ClassOption { id: string; name: string; period: string | null }

export interface BatchRosterEntry {
  rosterId: string
  name: string
  firstName: string
  lastName: string
  email: string | null
  studentNumber: string | null
  status: "absent" | "missing" | "exempt" | "late" | null
  hasPaper: boolean
  /** Late papers: days after the set was first graded (0 = same day). */
  daysLate?: number
}

const STATUSES = [["absent", "Absent"], ["missing", "Missing"], ["exempt", "Exempt"]] as const

export function BatchClassPanel({ batchId, rows, roster, examTitle, onChanged }: {
  batchId: string
  rows: BatchClassRow[]
  roster: BatchRosterEntry[]
  examTitle: string | null
  onChanged: () => void
}) {
  const [classes, setClasses] = useState<ClassOption[] | null>(null)
  const [picked, setPicked] = useState("")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")

  const classId = rows.find((r) => r.class_id)?.class_id ?? null
  const className = rows.find((r) => r.class_id)?.class_name ?? null
  const matched = rows.filter((r) => r.roster_id).length
  const linked = rows.filter((r) => r.student_user_id).length
  const released = rows.length > 0 && rows.every((r) => r.released)
  const unmatched = rows.filter((r) => !r.roster_id)

  useEffect(() => {
    if (classId) return
    void (async () => {
      const res = await fetch("/api/classes")
      const data = await res.json().catch(() => ({}))
      setClasses(res.ok ? data.classes ?? [] : [])
    })()
  }, [classId])

  const patch = async (body: Record<string, unknown>) => {
    const res = await authFetch(`/api/grade-batch/${batchId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || "Could not save")
    return data
  }

  const attach = async (id: string) => {
    setBusy(true)
    setNotice("")
    try {
      const data = await patch({ classId: id })
      setNotice(`Matched ${data.matched} of ${data.total} papers to names on the roster.`)
      onChanged()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not save")
    } finally {
      setBusy(false)
    }
  }

  const saveAsClass = async () => {
    setBusy(true)
    setNotice("")
    try {
      const first = rows[0]
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: first?.class_name || examTitle || "My class", period: first?.class_period || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.class?.id) throw new Error(data.error || "Could not create the class")
      const add = await authFetch(`/api/classes/${data.class.id}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rows.map((r) => r.student_name).join("\n") }),
      })
      if (!add.ok) throw new Error((await add.json().catch(() => ({}))).error || "Could not add the names")
      await attach(data.class.id)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not save")
      setBusy(false)
    }
  }

  const noPaper = roster.filter((e) => !e.hasPaper)
  const late = roster.filter((e) => e.hasPaper && e.status === "late")
  const [statuses, setStatuses] = useState<Record<string, BatchRosterEntry["status"]>>({})
  const statusOf = (e: BatchRosterEntry) => (e.rosterId in statuses ? statuses[e.rosterId] : e.status)

  const setStatus = async (rosterIds: string[], status: BatchRosterEntry["status"]) => {
    setStatuses((m) => ({ ...m, ...Object.fromEntries(rosterIds.map((r) => [r, status])) }))
    try {
      await patch({ statuses: rosterIds.map((rosterId) => ({ rosterId, status })) })
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not save")
    }
  }

  const setReleased = async (value: boolean) => {
    setBusy(true)
    try {
      await patch({ released: value })
      onChanged()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not save")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Users className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          {classId ? (
            <>
              <p className="font-semibold text-slate-900">
                Class: <Link href={`/teacher/classes/${classId}`} className="text-blue-700 hover:underline">{className || "Open class"}</Link>
              </p>
              <p className="text-sm text-slate-600">
                {matched} of {rows.length} papers matched to a name on the roster
                {unmatched.length > 0 && <> (check: {unmatched.slice(0, 4).map((r) => r.student_name).join(", ")}{unmatched.length > 4 ? "…" : ""})</>}.
              </p>
              {noPaper.length > 0 && (
                <div className="mt-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">No paper for {noPaper.length} student{noPaper.length === 1 ? "" : "s"}</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void setStatus(noPaper.filter((e) => !statusOf(e)).map((e) => e.rosterId), "missing")} className={actionButton}>Mark the rest missing</button>
                      <Link href={`/grade-exam/batch?batch=${batchId}&class=${classId}`} className={actionButtonPrimary}>Grade late papers</Link>
                    </div>
                  </div>
                  <ul className="divide-y divide-slate-200/70">
                    {noPaper.map((e) => (
                      <li key={e.rosterId} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                        <span className="min-w-0 flex-1 text-slate-800">{e.name}{e.studentNumber && <span className="ml-1.5 text-xs text-slate-400">#{e.studentNumber}</span>}</span>
                        <span className="flex gap-1" role="group" aria-label={`Status for ${e.name}`}>
                          {STATUSES.map(([value, text]) => (
                            <button
                              key={value}
                              type="button"
                              aria-pressed={statusOf(e) === value}
                              onClick={() => void setStatus([e.rosterId], statusOf(e) === value ? null : value)}
                              className={statusOf(e) === value ? "rounded-full bg-slate-800 px-3.5 py-1.5 text-sm font-semibold text-white" : "rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-100"}
                            >
                              {text}
                            </button>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-slate-500">Statuses go into the CSV. Exempt students are left out; a paper graded later for a missing student is marked late.</p>
                </div>
              )}
              {late.length > 0 && <p className="mt-2 text-sm text-slate-700">Late: {late.map((e) => `${e.name}${e.daysLate ? ` (${dayCount(e.daysLate)})` : ""}`).join(", ")}</p>}
              <label className="mt-3 flex items-center gap-3">
                <Switch checked={released} onCheckedChange={(v) => void setReleased(v)} disabled={busy} />
                <span className="text-sm text-slate-800">
                  Release reports to students
                  <span className="block text-xs text-slate-500">
                    {linked === 0
                      ? "No student on these papers has joined the class yet. Share the class code and they'll see their report once it's released."
                      : `${linked} student${linked === 1 ? "" : "s"} with an account will see their own report.`}
                  </span>
                </span>
              </label>
            </>
          ) : (
            <>
              <p className="font-semibold text-slate-900">Save these names as a class</p>
              <p className="text-sm text-slate-600">Next time, grading matches each paper to a name on the class list, and students who join can see the reports you release.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button onClick={saveAsClass} disabled={busy} className={cn(actionButtonPrimary, "bg-blue-600 hover:bg-blue-700")}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save as a new class</Button>
                {classes && classes.length > 0 && (
                  <>
                    <span className="text-sm text-slate-500">or add to</span>
                    <select value={picked} onChange={(e) => setPicked(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm" aria-label="Existing class">
                      <option value="">Pick a class…</option>
                      {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.period ? ` (P${c.period})` : ""}</option>)}
                    </select>
                    <Button variant="ghost" disabled={!picked || busy} onClick={() => void attach(picked)} className={actionButton}>Add</Button>
                  </>
                )}
              </div>
            </>
          )}
          {notice && <p className="mt-2 text-sm text-slate-600" aria-live="polite">{notice}</p>}
        </div>
      </div>
    </section>
  )
}
