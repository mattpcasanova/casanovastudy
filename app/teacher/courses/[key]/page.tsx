"use client"

// The course view moved to /teacher/progress/[key] (2026-10-26); old links land there.

import { use, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function CoursePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params)
  const router = useRouter()
  useEffect(() => { router.replace(`/teacher/progress/${key}`) }, [key, router])
  return null
}
