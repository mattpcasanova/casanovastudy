"use client"

// A student opening assigned practice from a share link (or a Classroom post).
// Signed out -> sign in and come back. Then: already matched to their name
// (or their sign-in email is on the class list) -> straight to the practice;
// otherwise pick their name from the students it was assigned to, confirming
// with their student ID when the class list has one.

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowRight, CalendarClock, ClipboardCheck, Loader2 } from "lucide-react"
import Link from "next/link"
import NavigationHeader from "@/components/navigation-header"
import { GoogleButton } from "@/components/auth/auth-ui"
import { useAuth } from "@/lib/auth"
import { authFetch } from "@/lib/auth-fetch"
import { signInPath } from "@/lib/sign-in-path"
import { rememberReturnTo, takeReturnTo } from "@/lib/return-to"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"

interface Info { id: string; title: string; guideId: string; dueAt: string | null; className: string | null; teacher: string | null }
type State =
  | { state: "loading" }
  | { state: "signed_out" }
  | { state: "error"; error: string }
  | { state: "ready" | "teacher" | "not_assigned"; assignment: Info }
  | { state: "no_match"; assignment: Info; accountName: string }
  | { state: "other_class"; assignment: Info; other: { className: string; code: string | null } }
  | { state: "pick"; assignment: Info; names: Array<{ rosterId: string; label: string; needsId: boolean }> }

export default function PracticeLinkPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const { user, loading, signInWithGoogle } = useAuth()
  const [s, setS] = useState<State>({ state: "loading" })
  const [picked, setPicked] = useState("")
  const [studentId, setStudentId] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const go = (a: Info) => router.replace(`/study-guide/${a.guideId}?assignment=${a.id}`)

  useEffect(() => {
    if (loading) return
    // Signed out: steer them to their school Google account, which the class list knows by email.
    if (!user) { rememberReturnTo(`/practice/${code}`); setS({ state: "signed_out" }); return }
    void (async () => {
      const res = await authFetch(`/api/practice/${code}`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setS({ state: "error", error: data.error || "This link doesn't work." }); return }
      takeReturnTo() // made it here; nothing left to resume (consent puts it back)
      if (data.state === "ready") { go(data.assignment); return }
      if (data.state === "unverified") { setS({ state: "error", error: data.message }); return }
      // Another period's link: open their own class's copy instead.
      if (data.state === "other_class" && data.other?.code && data.other.code !== code) { router.replace(`/practice/${data.other.code}`); return }
      if (data.state === "consent") { rememberReturnTo(`/practice/${code}`); router.replace("/consent"); return }
      setS(data)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, code])

  const claim = async () => {
    if (s.state !== "pick" || !picked) return
    setBusy(true)
    setError("")
    try {
      const res = await authFetch(`/api/practice/${code}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rosterId: picked, studentId }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || "That didn't work. Try again."); return }
      go(data.assignment)
    } finally {
      setBusy(false)
    }
  }

  const chosen = s.state === "pick" ? s.names.find((n) => n.rosterId === picked) : undefined
  const a = s.state !== "loading" && s.state !== "error" && s.state !== "signed_out" ? s.assignment : null

  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />
      <main className="container mx-auto max-w-lg px-4 py-12">
        {s.state === "loading" ? (
          <p className="flex items-center justify-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Opening your practice…</p>
        ) : s.state === "signed_out" ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><ClipboardCheck className="h-6 w-6" /></span>
            <h1 className={cn(fontDisplay, "mt-4 text-3xl font-semibold tracking-tight text-slate-900")}>Sign in to start your practice</h1>
            <p className="mt-2 text-slate-600">Use your <span className="font-semibold text-slate-900">school Google account</span>. Your teacher&apos;s class list knows your school email, so it opens straight away.</p>
            <div className="mt-6 space-y-3">
              <GoogleButton onClick={() => void signInWithGoogle({ next: `/practice/${code}`, role: "student" })} />
              <Link href={signInPath()} className="block text-center text-sm font-medium text-slate-600 underline-offset-4 hover:text-blue-700 hover:underline">Use an email and password instead</Link>
            </div>
          </section>
        ) : s.state === "error" ? (
          <p className="rounded-2xl bg-rose-50 p-5 text-rose-800">{s.error}</p>
        ) : (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><ClipboardCheck className="h-6 w-6" /></span>
            <h1 className={cn(fontDisplay, "mt-4 text-3xl font-semibold tracking-tight text-slate-900")}>{a!.title}</h1>
            <p className="mt-1 text-slate-600">{[a!.teacher && `From ${a!.teacher}`, a!.className].filter(Boolean).join(" · ")}</p>
            {a!.dueAt && <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-700"><CalendarClock className="h-4 w-4" />Due {new Date(a!.dueAt).toLocaleString([], { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>}

            {s.state === "teacher" && (
              <div className="mt-6 space-y-3">
                <p className="text-slate-700">This is your assignment. Students who open this link sign in and do it; you&apos;ll see their scores on the assignment page.</p>
                <button type="button" onClick={() => go(a!)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700">See what students see<ArrowRight className="h-4 w-4" /></button>
              </div>
            )}
            {s.state === "not_assigned" && (
              <p className="mt-6 rounded-xl bg-amber-50 p-4 text-amber-900">This practice wasn&apos;t assigned to you, or your name is already taken on the class list. If that&apos;s a mistake, ask your teacher.</p>
            )}
            {s.state === "no_match" && (
              <div className="mt-6 space-y-2 rounded-xl bg-amber-50 p-4 text-amber-900">
                <p className="font-medium">We couldn&apos;t find {s.accountName ? <>&ldquo;{s.accountName}&rdquo;</> : "your name"} on this class list.</p>
                <p className="text-sm">You may have another class&apos;s link. If this is your class, ask your teacher to add your email to your name on the class list, then open this link again.</p>
              </div>
            )}
            {s.state === "other_class" && (
              <p className="mt-6 rounded-xl bg-amber-50 p-4 text-amber-900">This link is for another class. You&apos;re in {s.other.className}, so ask your teacher for that class&apos;s link.</p>
            )}
            {s.state === "pick" && (
              <div className="mt-6 space-y-4">
                <p className="font-medium text-slate-900">Which one is you?</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {s.names.map((n) => (
                    <button key={n.rosterId} type="button" onClick={() => { setPicked(n.rosterId); setError("") }} className={cn("h-12 rounded-xl px-4 text-left font-semibold ring-1 transition", picked === n.rosterId ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-slate-800 ring-slate-300 hover:bg-slate-50")}>
                      {n.label}
                    </button>
                  ))}
                </div>
                {chosen?.needsId && (
                  <label className="block text-sm font-medium text-slate-700">
                    Your student ID
                    <input value={studentId} onChange={(e) => setStudentId(e.target.value)} inputMode="numeric" autoFocus className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-base outline-none focus:border-blue-500" placeholder="The number on your school ID" />
                  </label>
                )}
                {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
                <button type="button" disabled={!picked || busy || (chosen?.needsId && !studentId.trim())} onClick={() => void claim()} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Start<ArrowRight className="h-4 w-4" /></>}
                </button>
                <p className="text-xs text-slate-500">You only do this once. Next time it opens straight away. Not on the list? Ask your teacher.</p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
