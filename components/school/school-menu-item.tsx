"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { School } from "lucide-react"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth"
import { authFetch } from "@/lib/auth-fetch"

/** Whether the signed-in user is a school admin (asked once per tab session). */
export function useSchoolAdmin(): boolean {
  const { user } = useAuth()
  const [admin, setAdmin] = useState(false)
  useEffect(() => {
    if (!user) { setAdmin(false); return }
    const key = `cs:school-admin:${user.id}`
    const cached = sessionStorage.getItem(key)
    if (cached !== null) { setAdmin(cached === "1"); return }
    void (async () => {
      const res = await authFetch("/api/school/me", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      const yes = res.ok && Array.isArray(data.schools) && data.schools.length > 0
      sessionStorage.setItem(key, yes ? "1" : "0")
      setAdmin(yes)
    })()
  }, [user])
  return admin
}

/** "School overview" in the account menu, for school admins only. */
export function SchoolMenuItem() {
  const admin = useSchoolAdmin()
  if (!admin) return null
  return (
    <DropdownMenuItem asChild className="cursor-pointer">
      <Link href="/school"><School className="h-4 w-4 mr-2 flex-shrink-0" />School overview</Link>
    </DropdownMenuItem>
  )
}
