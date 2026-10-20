"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { BadgeCheck, Clock, Home, Loader2, MailCheck } from "lucide-react"
import { StatusPage } from "@/components/status-page"

// The confirm link from the school-email message. A button POSTs it, so mail
// scanners opening the link don't confirm anything.
export default function TeacherVerifyPage() {
  return (
    <Suspense>
      <TeacherVerify />
    </Suspense>
  )
}

function TeacherVerify() {
  const params = useSearchParams()
  const [state, setState] = useState<"ask" | "saving" | "approved" | "pending" | "error">("ask")
  const [error, setError] = useState("")

  const confirm = async () => {
    setState("saving")
    try {
      const res = await fetch("/api/teacher/verification/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ u: params.get("u"), e: params.get("e"), x: params.get("x"), t: params.get("t") }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Couldn't confirm your email.")
      setState(data.state === "approved" ? "approved" : "pending")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
      setState("error")
    }
  }

  if (typeof document !== "undefined") document.title = "Verify your teacher account | Casanova Study"

  if (state === "approved") {
    return (
      <StatusPage
        eyebrow="Teacher verification"
        title="You're verified"
        message={<p>Students can now join your classes with the class code and open the practice you assign.</p>}
        actions={[{ label: "Go to my home page", href: "/teach", icon: Home, primary: true }]}
      />
    )
  }
  if (state === "pending") {
    return (
      <StatusPage
        eyebrow="Teacher verification"
        title="Email confirmed"
        message={<p>Thanks. Your school isn&apos;t on our list yet, so we&apos;ll check your account by hand, usually within a day. We&apos;ll email you when it&apos;s done. You can keep grading in the meantime.</p>}
        actions={[{ label: "Go to my home page", href: "/teach", icon: Clock, primary: true }]}
      />
    )
  }
  return (
    <StatusPage
      eyebrow="Teacher verification"
      title="Confirm your school email"
      message={<>
        <p>Confirm <span className="font-semibold">{params.get("e")}</span> as your school email.</p>
        {state === "error" && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      </>}
      actions={[
        { label: state === "saving" ? "Confirming…" : "Confirm my email", icon: state === "saving" ? Loader2 : MailCheck, onClick: () => void confirm(), primary: true },
        { label: "Home", href: "/teach", icon: BadgeCheck },
      ]}
    />
  )
}
