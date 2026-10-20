"use client"

import { useEffect } from "react"
import { reportError } from "@/lib/monitoring/report"
import { Home, RotateCcw } from "lucide-react"
import { StatusPage } from "@/components/status-page"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
    // Errors with a digest came from the server and are already in the log (instrumentation.ts).
    if (!error.digest) reportError(error)
  }, [error])

  return (
    <StatusPage
      eyebrow="Something went wrong"
      title="That didn't load"
      message={<p>Something on our side failed while loading this page. Trying again usually fixes it. Your guides and progress are safe.</p>}
      actions={[
        { label: "Try again", icon: RotateCcw, onClick: reset, primary: true },
        { label: "Home", href: "/", icon: Home },
      ]}
      footer={error.digest ? <>If it keeps happening, email <a href="mailto:hello@casanovastudy.com" className="font-semibold text-blue-700 hover:underline">hello@casanovastudy.com</a> with code <span className="font-mono">{error.digest}</span>.</> : undefined}
    />
  )
}
