"use client"

import { Loader2 } from "lucide-react"

/** Shown while a new version of the questions is written for another attempt (~30-90 s, once). */
export function PreparingVersion({ count, what }: { count: number; what: "questions" | "activities" }) {
  return (
    <div role="status" className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-600" />
      <p className="mt-4 text-lg font-semibold text-slate-900">Writing new versions of your {what}</p>
      <p className="mt-1 text-slate-600">
        {count ? `${count} new ${what}` : `New ${what}`} on the same skills, so this try shows what you know, not what you remember. This takes about a minute, once.
      </p>
    </div>
  )
}
