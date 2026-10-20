"use client"

import { useEffect } from "react"
import { reportError } from "@/lib/monitoring/report"

/** Sends uncaught browser errors and rejected promises to our error log (root layout). */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => reportError(e.error ?? e.message)
    const onRejection = (e: PromiseRejectionEvent) => reportError(e.reason)
    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onRejection)
    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onRejection)
    }
  }, [])
  return null
}
