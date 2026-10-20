"use client"

import { useEffect, useState } from "react"
import { BadgeCheck, Clock, Loader2, MailCheck, ShieldAlert } from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"
import { domainOf, isFreeEmailDomain } from "@/lib/teachers/email-domains"
import { actionButton, actionButtonPrimary } from "@/components/grading/grading-ui"
import { cn } from "@/lib/utils"

interface Verification {
  status: "none" | "pending" | "approved" | "rejected"
  schoolEmail: string | null
  schoolName: string | null
  emailConfirmed: boolean
  loginEmail: string | null
}

const field = "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

/**
 * Asks an unverified teacher to confirm a school email. Shows nothing once
 * they're approved. `compact` is a one-line note for class pages.
 */
export function TeacherVerificationCard({ compact = false, className }: { compact?: boolean; className?: string }) {
  const [v, setV] = useState<Verification | null>(null)
  const [editing, setEditing] = useState(false)
  const [email, setEmail] = useState("")
  const [school, setSchool] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)

  useEffect(() => {
    void (async () => {
      const res = await authFetch("/api/teacher/verification", { cache: "no-store" })
      if (!res.ok) return
      const data: Verification = await res.json()
      setV(data)
      const start = data.schoolEmail ?? (data.loginEmail && !isFreeEmailDomain(domainOf(data.loginEmail)) ? data.loginEmail : "")
      setEmail(start ?? "")
      setSchool(data.schoolName ?? "")
    })()
  }, [])

  if (!v || v.status === "approved") return null

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setBusy(true)
    setError("")
    try {
      const res = await authFetch("/api/teacher/verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schoolEmail: email, schoolName: school }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Couldn't send the email.")
      setV((cur) => ({ ...(cur as Verification), ...data }))
      setSent(data.state === "sent")
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  const waitingForLink = v.status === "pending" && !!v.schoolEmail && !v.emailConfirmed && !editing
  const inReview = v.status === "pending" && v.emailConfirmed && !editing
  const showForm = !waitingForLink && !inReview && v.status !== "rejected"

  if (compact) {
    return (
      <p className={cn("flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900", className)}>
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{inReview ? "Your account is being checked. Students can join once you're verified." : "Verify your teacher account on your home page so students can join with the code."}</span>
      </p>
    )
  }

  return (
    <section className={cn("rounded-3xl border border-amber-200 bg-white p-5 shadow-sm sm:p-6", className)}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          {inReview ? <Clock className="h-5 w-5" /> : v.status === "rejected" ? <ShieldAlert className="h-5 w-5" /> : <BadgeCheck className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-slate-900">
            {inReview ? "We're checking your teacher account" : v.status === "rejected" ? "We couldn't verify your teacher account" : "Verify your teacher account"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {inReview
              ? `${v.schoolEmail} is confirmed. Your school isn't on our list yet, so we're checking by hand, usually within a day. You can keep grading meanwhile.`
              : v.status === "rejected"
                ? "Students can't connect to this account. If you think that's a mistake, email hello@casanovastudy.com from your school address."
                : waitingForLink
                  ? `${sent ? "We sent" : "We've sent"} a link to ${v.schoolEmail}. Click it to confirm. It can take a minute to arrive; check spam too.`
                  : "You can grade and make guides now. To let students join your classes and open practice you assign, confirm your school email. It keeps student data with real teachers."}
          </p>

          {showForm && (
            <form onSubmit={submit} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourschool.org" aria-label="School email" className={field} />
              <input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="School name" aria-label="School name" className={field} />
              <button type="submit" disabled={busy || !email.trim()} className={cn(actionButtonPrimary, "h-11")}>
                {busy ? <Loader2 className="animate-spin" /> : <MailCheck />}Send link
              </button>
              {email && isFreeEmailDomain(domainOf(email)) && <p className="text-xs text-amber-800 sm:col-span-3">That looks like a personal address. A school address is approved faster; a personal one needs a manual check.</p>}
            </form>
          )}
          {waitingForLink && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => void submit()} disabled={busy} className={actionButton}>{busy ? <Loader2 className="animate-spin" /> : <MailCheck />}Send it again</button>
              <button type="button" onClick={() => setEditing(true)} className={actionButton}>Use a different email</button>
            </div>
          )}
          {error && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        </div>
      </div>
    </section>
  )
}
