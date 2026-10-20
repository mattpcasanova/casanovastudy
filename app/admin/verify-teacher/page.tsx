"use client"

import { Fragment, Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Check, Loader2, X } from "lucide-react"
import { StatusPage } from "@/components/status-page"

interface Info {
  name: string
  isTeacher: boolean
  loginEmail: string | null
  joined: string | null
  status: "none" | "pending" | "approved" | "rejected"
  schoolEmail: string | null
  schoolName: string | null
  emailConfirmed: boolean
}

// The site owner's review page, opened from the "teacher is waiting" email.
export default function VerifyTeacherPage() {
  return (
    <Suspense>
      <VerifyTeacher />
    </Suspense>
  )
}

function VerifyTeacher() {
  const params = useSearchParams()
  const u = params.get("u") ?? ""
  const t = params.get("t") ?? ""
  const [info, setInfo] = useState<Info | null>(null)
  const [busy, setBusy] = useState<"" | "approve" | "reject">("")
  const [error, setError] = useState("")

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/admin/teacher-verification?u=${encodeURIComponent(u)}&t=${encodeURIComponent(t)}`)
      const data = await res.json().catch(() => ({}))
      if (res.ok) setInfo(data)
      else setError(data.error || "Couldn't load this teacher.")
    })()
  }, [u, t])

  const decide = async (action: "approve" | "reject") => {
    setBusy(action)
    setError("")
    const res = await fetch("/api/admin/teacher-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ u, t, action }) })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setInfo(data)
    else setError(data.error || "Couldn't save that.")
    setBusy("")
  }

  if (typeof document !== "undefined") document.title = "Verify a teacher | Casanova Study"

  const rows: Array<[string, string]> = info ? [
    ["Name", info.name],
    ["Sign-in email", info.loginEmail ?? "Unknown"],
    ["School email", info.schoolEmail ? `${info.schoolEmail}${info.emailConfirmed ? " (confirmed)" : " (not confirmed)"}` : "Not given"],
    ["School", info.schoolName || "Not given"],
    ["Joined", info.joined ? new Date(info.joined).toLocaleDateString() : "Unknown"],
    ["Status", info.status === "none" ? "Not started" : info.status[0].toUpperCase() + info.status.slice(1)],
  ] : []

  return (
    <StatusPage
      eyebrow="Teacher verification"
      title={info ? info.name : error ? "Can't open this" : "Loading…"}
      message={<>
        {info && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-left text-sm">
            {rows.map(([k, v]) => <Fragment key={k}><dt className="font-semibold text-slate-700">{k}</dt><dd className="text-slate-600">{v}</dd></Fragment>)}
          </dl>
        )}
        {info && !info.isTeacher && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">This account isn&apos;t a teacher account.</p>}
        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      </>}
      actions={info ? [
        { label: busy === "approve" ? "Approving…" : info.status === "approved" ? "Approved" : "Approve", icon: busy === "approve" ? Loader2 : Check, onClick: () => void decide("approve"), primary: true },
        { label: busy === "reject" ? "Rejecting…" : info.status === "rejected" ? "Rejected" : "Reject", icon: busy === "reject" ? Loader2 : X, onClick: () => void decide("reject") },
      ] : []}
    />
  )
}
