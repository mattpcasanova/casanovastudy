"use client"

import AuthGate from "@/components/auth-gate"
import DashboardView from "@/components/dashboard-view"
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
  return (
    <AuthGate>
      <DashboardView />
      <Toaster />
    </AuthGate>
  )
}
