"use client"

// Reteach plan for assigned practice, from students' answers (components/grading/reteach-view.tsx).

import { use } from "react"
import AuthGate from "@/components/auth-gate"
import { ReteachView } from "@/components/grading/reteach-view"

export default function PracticeReteachPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <AuthGate>
      <ReteachView source={{ id, kind: "practice" }} />
    </AuthGate>
  )
}
