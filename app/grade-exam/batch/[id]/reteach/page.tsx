"use client"

// Reteach plan for a graded set; the page itself is components/grading/reteach-view.tsx.

import { use } from "react"
import AuthGate from "@/components/auth-gate"
import { ReteachView } from "@/components/grading/reteach-view"

export default function ReteachPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <AuthGate>
      <ReteachView source={{ id, kind: "test" }} />
    </AuthGate>
  )
}
