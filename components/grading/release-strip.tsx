"use client"

import { useState } from "react"
import { Check, Eye, EyeOff, Loader2 } from "lucide-react"
import { actionButton, actionButtonPrimary } from "@/components/grading/grading-ui"
import { authFetch } from "@/lib/auth-fetch"
import { cn } from "@/lib/utils"

export interface ReleaseRow {
  released: boolean
  student_user_id: string | null
  to_mark?: number | boolean
}

const people = (n: number) => `${n} student${n === 1 ? "" : "s"}`

/**
 * Class results: whether students can see their reports, as its own step with
 * one button. Reports start hidden, and in the first two months of class sets
 * 6 of 797 papers were ever released, so the old switch at the bottom of the
 * class panel was going unseen. Only shown for a set that belongs to a class.
 */
export function ReleaseStrip({ batchId, rows, toCheck, onChanged }: {
  batchId: string
  rows: ReleaseRow[]
  /** Answers the grader flagged that the teacher hasn't confirmed yet. */
  toCheck: number
  onChanged: () => void | Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const total = rows.length
  const released = rows.filter((r) => r.released).length
  const withAccount = rows.filter((r) => r.student_user_id).length
  const waiting = rows.filter((r) => r.to_mark).length
  const all = total > 0 && released === total
  const some = released > 0 && !all

  const save = async (value: boolean) => {
    setBusy(true)
    setError("")
    try {
      const res = await authFetch(`/api/grade-batch/${batchId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ released: value }) })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not save")
      await onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save")
    } finally {
      setBusy(false)
    }
  }

  const who = withAccount === 0
    ? "No student on these papers has an account yet. They'll see their report as soon as they join the class."
    : withAccount === total
      ? `All ${people(total)} have an account and will see their own report.`
      : `${withAccount} of ${people(total)} have an account and will see their own report. The others see theirs once they join the class.`

  if (all) {
    return (
      <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-inset ring-emerald-200 sm:flex-row sm:items-center sm:justify-between" role="status">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white"><Check className="h-5 w-5" /></span>
          <div className="min-w-0">
            <p className="font-semibold text-emerald-950">Released to students</p>
            <p className="text-sm text-emerald-900">{who}</p>
            {error && <p className="mt-1 text-sm text-rose-700">{error}</p>}
          </div>
        </div>
        <button type="button" className={cn(actionButton, "w-full sm:w-auto")} disabled={busy} onClick={() => void save(false)}>
          {busy ? <Loader2 className="animate-spin" /> : <EyeOff />}Hide them again
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><EyeOff className="h-5 w-5" /></span>
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">
            {some ? `${people(total - released)} can't see their report yet` : "Students can't see these reports yet"}
          </p>
          <p className="text-sm text-slate-600">
            {waiting > 0
              ? `${waiting} paper${waiting === 1 ? " is" : "s are"} still waiting for your marks. Finish marking, then release.`
              : <>Releasing shows each student their score, the marks per question and the feedback. They never see the scan or anyone else&apos;s report. {who}</>}
          </p>
          {waiting === 0 && toCheck > 0 && (
            <p className="mt-1 text-sm font-medium text-amber-800">{toCheck} answer{toCheck === 1 ? " is" : "s are"} still flagged to check. You can release now and fix a mark later; students see the change.</p>
          )}
          {error && <p className="mt-1 text-sm text-rose-700">{error}</p>}
        </div>
      </div>
      <button type="button" className={cn(actionButtonPrimary, "h-11 w-full px-5 sm:w-auto")} disabled={busy || waiting > 0} onClick={() => void save(true)}>
        {busy ? <Loader2 className="animate-spin" /> : <Eye />}{some ? "Release the rest" : "Release to students"}
      </button>
    </div>
  )
}
