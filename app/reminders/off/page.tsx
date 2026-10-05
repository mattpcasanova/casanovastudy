"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { BellOff, Check, Home, Loader2, Settings } from "lucide-react"
import { StatusPage } from "@/components/status-page"

export default function RemindersOffPage() {
  return (
    <Suspense>
      <RemindersOff />
    </Suspense>
  )
}

function RemindersOff() {
  const params = useSearchParams()
  const [state, setState] = useState<"ask" | "saving" | "done" | "error">("ask")
  const [error, setError] = useState("")

  const turnOff = async () => {
    setState("saving")
    try {
      const res = await fetch(`/api/reminders/unsubscribe?u=${encodeURIComponent(params.get("u") ?? "")}&t=${encodeURIComponent(params.get("t") ?? "")}`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not update your settings.")
      setState("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
      setState("error")
    }
  }

  if (typeof document !== "undefined") document.title = "Study reminders | Casanova Study"

  if (state === "done") {
    return (
      <StatusPage
        eyebrow="Study reminders"
        title="Reminders are off"
        message={<p>We won&apos;t email you about reviews anymore. You can turn them back on any time from your Account page.</p>}
        actions={[
          { label: "Home", href: "/", icon: Home, primary: true },
          { label: "Account settings", href: "/account", icon: Settings },
        ]}
      />
    )
  }

  return (
    <StatusPage
      eyebrow="Study reminders"
      title="Turn off reminders?"
      message={<>
        <p>We email you when cards are ready for review or a weak spot needs practice, and never more than once a day.</p>
        {state === "error" && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      </>}
      actions={[
        { label: state === "saving" ? "Turning off…" : "Turn off reminders", icon: state === "saving" ? Loader2 : BellOff, onClick: () => void turnOff(), primary: true },
        { label: "Keep them on", href: "/", icon: Check },
      ]}
    />
  )
}
