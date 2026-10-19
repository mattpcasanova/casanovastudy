"use client"

// "Assign a set you have": pick one of the teacher's own quizzes, practice
// sets or adaptive practice, then the Assign dialog opens with the group.

import { useEffect, useState } from "react"
import { ClipboardCheck, Loader2, Search } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { actionButton } from "@/components/grading/grading-ui"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth"
import { ASSIGNABLE_FORMATS } from "@/lib/practice/assignments"
import type { AssignPreset } from "@/lib/practice/preset"
import { cn } from "@/lib/utils"
import { AssignDialog } from "./assign-dialog"

interface Guide { id: string; title: string; format: string; created_at: string }
const FORMAT_LABEL: Record<string, string> = { quiz: "Quiz", practice: "Practice", adaptive: "Adaptive" }

export function AssignExistingButton({ preset, className, label = "Assign a set you have" }: { preset: Omit<AssignPreset, "at">; className?: string; label?: string }) {
  const { user } = useAuth()
  const [pickOpen, setPickOpen] = useState(false)
  const [guides, setGuides] = useState<Guide[] | null>(null)
  const [query, setQuery] = useState("")
  const [chosen, setChosen] = useState<Guide | null>(null)

  useEffect(() => {
    if (!pickOpen || guides || !user) return
    void (async () => {
      const { data } = await supabase.from("study_guides").select("id, title, format, created_at").eq("user_id", user.id).in("format", [...ASSIGNABLE_FORMATS]).order("created_at", { ascending: false }).limit(60)
      setGuides((data ?? []) as Guide[])
    })()
  }, [pickOpen, guides, user])

  const shown = (guides ?? []).filter((g) => g.title.toLowerCase().includes(query.trim().toLowerCase()))
  return (
    <>
      <button type="button" className={cn(actionButton, className)} onClick={() => setPickOpen(true)}><ClipboardCheck />{label}</button>
      <Dialog open={pickOpen} onOpenChange={setPickOpen}>
        <DialogContent className="flex max-h-[85dvh] flex-col gap-4 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Which practice?</DialogTitle>
            <DialogDescription>Your quizzes, practice sets and adaptive practice, newest first.</DialogDescription>
          </DialogHeader>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title" className="h-11 w-full rounded-xl border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-blue-500" />
          </label>
          <div className="-mx-6 min-h-0 flex-1 overflow-y-auto px-6">
            {!guides ? (
              <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p>
            ) : shown.length === 0 ? (
              <p className="text-sm text-slate-500">{guides.length ? "Nothing matches." : "You haven't made a quiz or practice set yet. Use Make and assign their practice instead."}</p>
            ) : (
              <ul className="space-y-2">
                {shown.map((g) => (
                  <li key={g.id}>
                    <button type="button" onClick={() => { setChosen(g); setPickOpen(false) }} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/40">
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{FORMAT_LABEL[g.format] ?? g.format}</span>
                      <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">{g.title}</span>
                      <span className="text-xs text-slate-500">{new Date(g.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {chosen && (
        <AssignDialog
          key={chosen.id}
          open={!!chosen}
          onOpenChange={(o) => { if (!o) setChosen(null) }}
          guide={chosen}
          preset={{ ...preset, title: chosen.title, at: Date.now() }}
        />
      )}
    </>
  )
}
