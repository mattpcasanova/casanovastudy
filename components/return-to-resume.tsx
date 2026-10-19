"use client"

// Sends a signed-in user back to the page they were heading to (lib/return-to)
// once they reach a landing page after signing up and finishing consent.

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { useConsentStep } from "@/lib/use-consent"
import { hasReturnTo, takeReturnTo } from "@/lib/return-to"

const LANDING = ["/", "/teach", "/progress"]

export function ReturnToResume() {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const step = useConsentStep(user)
  useEffect(() => {
    if (loading || !user || step !== "ok" || !pathname || !LANDING.includes(pathname) || !hasReturnTo()) return
    const path = takeReturnTo()
    if (path && path !== pathname) router.replace(path)
  }, [loading, user, step, pathname, router])
  return null
}
