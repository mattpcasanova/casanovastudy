"use client"

// The student's consent step (COPPA): confirm a birth date if we don't have
// one, and if they're under 13, ask a parent or guardian to approve by email.
// AuthGate sends students here until /api/consent says they're done.

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays, Hourglass, MailCheck } from "lucide-react"
import AuthGate from "@/components/auth-gate"
import { AuthHeading, AuthShell, Field, FormError, PrimaryButton, StatusCard } from "@/components/auth/auth-ui"
import { useAuth } from "@/lib/auth"
import { authFetch } from "@/lib/auth-fetch"
import { setConsentStep, useConsentStep } from "@/lib/use-consent"
import type { ConsentStep } from "@/lib/consent-rules"

export default function ConsentPage() {
  return (
    <AuthGate>
      <Consent />
    </AuthGate>
  )
}

function Consent() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const initial = useConsentStep(user)
  const [step, setStep] = useState<ConsentStep | null>(initial)
  const [birthDate, setBirthDate] = useState("")
  const [parentEmail, setParentEmail] = useState("")
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { if (initial) setStep(initial) }, [initial])
  useEffect(() => { if (step === "ok") router.replace("/") }, [step, router])

  // While waiting, check now and then whether the parent has approved.
  useEffect(() => {
    if (step !== "pending" || !user) return
    const load = async () => {
      const res = await authFetch("/api/consent", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (data.parentEmail) setSentTo(data.parentEmail)
      if (data.step && data.step !== "pending") { setConsentStep(user.id, data.step); setStep(data.step) }
    }
    void load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [step, user])

  const post = async (body: Record<string, string>) => {
    setBusy(true); setError("")
    try {
      const res = await authFetch("/api/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.")
      if (user) setConsentStep(user.id, data.step)
      if (data.parentEmail) setSentTo(data.parentEmail)
      setEditing(false)
      setStep(data.step)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  if (!step || step === "ok") return <AuthShell><p className="text-center text-slate-500">One moment…</p></AuthShell>

  if (step === "birthdate") {
    return (
      <AuthShell>
        <AuthHeading title="When's your birthday?" subtitle="We ask everyone once. Students under 13 need a parent's OK before using Casanova Study." />
        <FormError>{error}</FormError>
        <form onSubmit={(e) => { e.preventDefault(); void post({ action: "birthdate", birthDate }) }} className="space-y-5">
          <Field label="Birth date" type="date" autoComplete="bday" required value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBirthDate(e.target.value)} disabled={busy} />
          <PrimaryButton type="submit" loading={busy} loadingText="Saving…"><CalendarDays className="mr-2 h-4 w-4" />Continue</PrimaryButton>
        </form>
        <SignOutNote onSignOut={signOut} />
      </AuthShell>
    )
  }

  if (step === "parent" || editing) {
    return (
      <AuthShell>
        <AuthHeading
          title="Ask a parent to approve"
          subtitle="Because you're under 13, a parent or guardian needs to say it's OK before you can use Casanova Study. We'll email them a link to approve."
        />
        <FormError>{error}</FormError>
        <form onSubmit={(e) => { e.preventDefault(); void post({ action: "request", parentEmail }) }} className="space-y-5">
          <Field label="Parent or guardian's email" type="email" inputMode="email" autoComplete="off" required value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} disabled={busy} />
          <PrimaryButton type="submit" loading={busy} loadingText="Sending…">Email my parent</PrimaryButton>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">See what we collect and why in our <Link href="/privacy" className="font-semibold text-blue-600 hover:underline">Privacy Policy</Link>.</p>
        <SignOutNote onSignOut={signOut} />
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <StatusCard
        icon={sentTo ? <MailCheck className="h-8 w-8" /> : <Hourglass className="h-8 w-8" />}
        title="Waiting for your parent"
        actions={
          <div className="space-y-3">
            {sentTo && <PrimaryButton type="button" loading={busy} loadingText="Sending…" onClick={() => void post({ action: "request", parentEmail: sentTo })}>Send the email again</PrimaryButton>}
            <button type="button" onClick={() => { setParentEmail(sentTo ?? ""); setEditing(true) }} className="w-full text-sm font-semibold text-blue-600 hover:underline">Use a different email</button>
          </div>
        }
      >
        <p className="text-slate-600">
          We emailed {sentTo ? <strong>{sentTo}</strong> : "your parent"} a link to approve your account. As soon as they do, you can start studying. This page updates on its own.
        </p>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </StatusCard>
      <SignOutNote onSignOut={signOut} />
    </AuthShell>
  )
}

function SignOutNote({ onSignOut }: { onSignOut: () => Promise<void> }) {
  return (
    <p className="mt-8 text-center text-sm text-slate-500">
      Not your account? <button type="button" onClick={() => void onSignOut()} className="font-semibold text-blue-600 hover:underline">Sign out</button>
    </p>
  )
}
