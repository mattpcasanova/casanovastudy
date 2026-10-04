"use client"

// The parent's page from the consent email (/parent-consent?token=...): the
// COPPA notice (what we collect, why, who processes it, their rights) and an
// Approve / Decline choice. Declining deletes the child's account and data.

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, ShieldCheck, Trash2 } from "lucide-react"
import { AuthHeading, AuthShell, FormError, PrimaryButton, StatusCard } from "@/components/auth/auth-ui"

export default function ParentConsentPage() {
  return (
    <Suspense fallback={<AuthShell panel={false}><p className="text-center text-slate-500">Loading…</p></AuthShell>}>
      <ParentConsent />
    </Suspense>
  )
}

const COLLECTED = [
  ["Account details", "Your child's name, email address, birth date and a password (stored encrypted)."],
  ["What they study", "Topics they type, notes or photos they upload, and the study guides made from them."],
  ["How they answer", "Their quiz, practice and review answers, used to show their progress and weak spots and to focus new practice."],
  ["Questions to the AI tutor", "Messages they send to the Explain helper, used only to answer them."],
] as const

function ParentConsent() {
  const token = useSearchParams().get("token")
  const [info, setInfo] = useState<{ childName: string; childEmail: string; status: string } | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null)
  const [confirmDecline, setConfirmDecline] = useState(false)
  const [done, setDone] = useState<"granted" | "deleted" | null>(null)

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/consent/decide?token=${encodeURIComponent(token ?? "")}`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) setError(data.error || "This link is no longer valid.")
      else setInfo(data)
    })()
  }, [token])

  const decide = async (decision: "approve" | "decline") => {
    setBusy(decision); setError("")
    try {
      const res = await fetch("/api/consent/decide", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, decision }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Something went wrong.")
      setDone(data.status)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(null)
    }
  }

  if (done === "granted") {
    return (
      <AuthShell panel={false}>
        <StatusCard icon={<CheckCircle2 className="h-8 w-8" />} tone="green" title="Thank you">
          <p className="text-slate-600">{info?.childName ?? "Your child"} can start using Casanova Study now. You can ask us to see or delete their information at any time by emailing <a href="mailto:privacy@casanovastudy.com" className="font-semibold text-blue-600">privacy@casanovastudy.com</a>.</p>
        </StatusCard>
      </AuthShell>
    )
  }
  if (done === "deleted") {
    return (
      <AuthShell panel={false}>
        <StatusCard icon={<Trash2 className="h-8 w-8" />} tone="red" title="Account deleted">
          <p className="text-slate-600">We deleted {info?.childName ?? "the"} account and everything in it. Nothing else is needed from you.</p>
        </StatusCard>
      </AuthShell>
    )
  }

  if (!info) {
    return (
      <AuthShell panel={false}>
        {error ? <StatusCard icon={<ShieldCheck className="h-8 w-8" />} tone="red" title="Link not valid"><p className="text-slate-600">{error}</p></StatusCard> : <p className="text-center text-slate-500">Loading…</p>}
      </AuthShell>
    )
  }

  return (
    <AuthShell panel={false}>
      <AuthHeading
        title={`${info.childName} wants to use Casanova Study`}
        subtitle={<>{info.childName} ({info.childEmail}) is under 13, so they need a parent or guardian&apos;s permission. Here is what that means.</>}
      />
      <div className="space-y-4 text-sm text-slate-700">
        <p>Casanova Study turns class notes and topics into study guides, quizzes and practice, and has an AI tutor that explains answers.</p>
        <div>
          <p className="font-semibold text-slate-900">What we collect</p>
          <ul className="mt-2 space-y-2">
            {COLLECTED.map(([what, detail]) => <li key={what}><span className="font-medium text-slate-900">{what}:</span> {detail}</li>)}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-slate-900">What we never do</p>
          <p className="mt-1">No ads, no selling or renting personal information, no public profiles. We don&apos;t ask for more than the app needs.</p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Who processes it</p>
          <p className="mt-1">Only the services that run the app for us: hosting and database, file storage, email, and an AI provider that writes the guides and answers questions (it does not use this data to train its models). They may use it only to provide those services.</p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Your choices</p>
          <p className="mt-1">You can ask to see, change or delete your child&apos;s information, or withdraw permission, any time at <a href="mailto:privacy@casanovastudy.com" className="font-semibold text-blue-600">privacy@casanovastudy.com</a>. Full details are in our <Link href="/privacy" className="font-semibold text-blue-600 hover:underline">Privacy Policy</Link>.</p>
        </div>
      </div>

      <FormError>{error}</FormError>
      {info.status === "granted" ? (
        <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">You already approved this account.</p>
      ) : confirmDecline ? (
        <div className="mt-6 space-y-3 rounded-xl bg-rose-50 p-4">
          <p className="text-sm text-rose-900">Declining deletes {info.childName}&apos;s account and everything in it. This can&apos;t be undone.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => void decide("decline")} disabled={!!busy} className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{busy === "decline" ? "Deleting…" : "Yes, decline and delete"}</button>
            <button type="button" onClick={() => setConfirmDecline(false)} className="flex-1 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">Go back</button>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <PrimaryButton type="button" loading={busy === "approve"} loadingText="Approving…" onClick={() => void decide("approve")}>I&apos;m their parent or guardian, and I approve</PrimaryButton>
          <button type="button" onClick={() => setConfirmDecline(true)} className="w-full text-sm font-semibold text-slate-500 hover:text-rose-600">Decline</button>
        </div>
      )}
    </AuthShell>
  )
}
