"use client"

// Account & privacy: who you're signed in as, download everything we hold
// (/api/account/export), and delete your account (/api/account/delete).

import { useState } from "react"
import Link from "next/link"
import { Download, Loader2, ShieldCheck, Trash2 } from "lucide-react"
import NavigationHeader from "@/components/navigation-header"
import AuthGate from "@/components/auth-gate"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import { authFetch } from "@/lib/auth-fetch"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"

export default function AccountPage() {
  return (
    <AuthGate>
      <Account />
    </AuthGate>
  )
}

function Account() {
  const { user, signOut } = useAuth()
  const [downloading, setDownloading] = useState(false)
  const [confirm, setConfirm] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const download = async () => {
    setDownloading(true); setError(null)
    try {
      const res = await authFetch("/api/account/export", { cache: "no-store" })
      if (!res.ok) throw new Error("Could not download your data. Please try again.")
      const blob = await res.blob()
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = `casanova-study-data-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setDownloading(false)
    }
  }

  const remove = async () => {
    setDeleting(true); setError(null)
    try {
      const res = await authFetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not delete your account.")
      await signOut()
      window.location.href = "/?deleted=1"
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
      setDeleting(false)
    }
  }

  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />
      <main className="container mx-auto max-w-3xl space-y-6 px-4 py-10">
        <h1 className={cn(fontDisplay, "text-4xl font-semibold tracking-tight text-slate-900")}>Account &amp; privacy</h1>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-blue-900/5">
          <p className="text-lg font-semibold text-slate-900">{[user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email}</p>
          <p className="text-slate-600">{user?.email}</p>
          <p className="mt-1 text-sm capitalize text-slate-500">{user?.user_type}</p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-blue-900/5">
          <h2 className={cn(fontDisplay, "flex items-center gap-2 text-2xl font-semibold text-slate-900")}><ShieldCheck className="h-5 w-5 text-blue-600" />Your data</h2>
          <p className="mt-2 text-slate-600">Download everything we keep about you: your profile, study guides, answers, progress and gradings. Read how we handle it in our <Link href="/privacy" className="font-semibold text-blue-600 hover:underline">Privacy Policy</Link>.</p>
          <Button onClick={() => void download()} disabled={downloading} variant="outline" className="mt-4">
            {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download my data
          </Button>
        </section>

        <section className="rounded-3xl border border-rose-200 bg-white p-6 shadow-xl shadow-rose-900/5">
          <h2 className={cn(fontDisplay, "flex items-center gap-2 text-2xl font-semibold text-slate-900")}><Trash2 className="h-5 w-5 text-rose-600" />Delete my account</h2>
          <p className="mt-2 text-slate-600">This permanently deletes your account, your study guides (including any you shared), your answers and progress{user?.user_type === "teacher" ? ", and the exams you graded" : ""}. It can&apos;t be undone.</p>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Type <span className="font-mono font-bold">DELETE</span> to confirm
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 w-full max-w-xs rounded-xl border border-slate-200 px-3 py-2 font-mono outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" autoComplete="off" />
          </label>
          <Button onClick={() => void remove()} disabled={confirm !== "DELETE" || deleting} className="mt-3 bg-rose-600 hover:bg-rose-700">
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete my account
          </Button>
        </section>

        {error && <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
        <p className="text-sm text-slate-500">Questions about your data? Email <a href="mailto:privacy@casanovastudy.com" className="font-semibold text-blue-600">privacy@casanovastudy.com</a>.</p>
      </main>
    </div>
  )
}
