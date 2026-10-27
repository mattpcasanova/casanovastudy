"use client"

// "What to focus on": the rule-based suggestions from lib/teacher/progress,
// each a card with one action (make practice, reteach plan, see students...).

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, ArrowRight, ClipboardList, ListChecks, PencilLine, TrendingDown, Users } from "lucide-react"
import { actionButton, actionButtonPrimary, buttonRow } from "@/components/grading/grading-ui"
import { practiceRequest } from "@/components/classes/class-areas"
import { openHomeWithPrefill } from "@/lib/prefill"
import { rememberAssignPreset } from "@/lib/practice/preset"
import type { ClassArea } from "@/lib/classes/areas"
import type { Suggestion } from "@/lib/teacher/progress"
import { cn } from "@/lib/utils"

export interface FocusContext {
  /** The course (or class) name used in practice requests and the arrival banner. */
  name: string
  classes: Array<{ id: string; name: string; period: string | null }>
  areas: ClassArea[]
  /** Where "See students" goes (an anchor on the course page, or the course page itself). */
  studentsHref: string
}

const ICON: Record<Suggestion["kind"], typeof Users> = { area: PencilLine, falling: TrendingDown, "class-behind": AlertTriangle, students: Users, practice: ClipboardList, stale: ClipboardList, "own-studying": ListChecks }
const TONE: Record<Suggestion["kind"], string> = { area: "bg-rose-50 text-rose-700", falling: "bg-amber-50 text-amber-800", "class-behind": "bg-amber-50 text-amber-800", students: "bg-blue-50 text-blue-700", practice: "bg-blue-50 text-blue-700", stale: "bg-slate-100 text-slate-600", "own-studying": "bg-emerald-50 text-emerald-700" }

/** Cards shown before "Show more": a full 2x2 on desktop. */
const FIRST = 4

export function FocusList({ suggestions, ctx, courseLabel }: { suggestions: Array<Suggestion & { courseName?: string }>; ctx: (s: Suggestion & { course?: string }) => FocusContext; courseLabel?: boolean }) {
  const router = useRouter()
  const [showAll, setShowAll] = useState(false)
  if (!suggestions.length) return null
  const shown = showAll ? suggestions : suggestions.slice(0, FIRST)
  const more = suggestions.length - shown.length

  const makePractice = (s: Suggestion, c: FocusContext, area: string, classId: string) => {
    const cls = c.classes.find((x) => x.id === classId)
    const className = cls && c.classes.length > 1 ? `${c.name} (Period ${cls.period ?? "?"})` : c.name
    const found = c.areas.find((a) => a.name.trim().toLowerCase() === area.trim().toLowerCase())
    const studyRequest = found ? practiceRequest(found, className) : `Practice on "${area}" for my ${className} class, from the basics to exam level, with worked explanations.`
    rememberAssignPreset({ classId, rosterIds: [], title: `${area}: practice` })
    router.push(openHomeWithPrefill({ source: "class-area", sourceTitle: className, studyRequest, studyGuideName: `${area}: practice`, format: "practice", detail: area }))
  }
  const makeQuiz = (c: FocusContext, topic: string, subject: string | null) => {
    const classId = c.classes[0]?.id
    if (classId) rememberAssignPreset({ classId, rosterIds: [], title: `${topic}: quiz` })
    router.push(openHomeWithPrefill({
      source: "class-area", sourceTitle: c.name, format: "quiz", detail: topic, subject: subject ?? undefined,
      studyRequest: `A quiz on "${topic}" for my ${c.name} class. Several students keep missing it in their own practice. 10 questions from the basics to exam level, each with a short explanation.`,
      studyGuideName: `${topic}: quiz`,
    }))
  }

  return (
    <>
    <ul className="grid gap-3 md:grid-cols-2">
      {shown.map((s, i) => {
        const c = ctx(s)
        const Icon = ICON[s.kind]
        const a = s.action
        const primary = (label: string, onClick: () => void) => <button type="button" onClick={onClick} className={actionButtonPrimary}><Icon />{label}</button>
        const link = (label: string, href: string, isPrimary = true) => <Link href={href} className={isPrimary ? actionButtonPrimary : actionButton}>{isPrimary ? <Icon /> : null}{label}{isPrimary ? null : <ArrowRight />}</Link>
        return (
          <li key={`${s.id}:${(s as { course?: string }).course ?? ""}`} className={cn("flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm", i === shown.length - 1 && shown.length % 2 === 1 && "md:col-span-2")}>
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", TONE[s.kind])}><Icon className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              {courseLabel && s.courseName && <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{s.courseName}</p>}
              <p className="font-semibold text-slate-900">{s.title}</p>
              <p className="mt-0.5 text-sm text-slate-600">{s.detail}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {a.kind === "practice" && (
                  <>
                    {primary("Make practice", () => makePractice(s, c, a.area, a.classId))}
                    {a.batchId && link("Reteach plan", `/grade-exam/batch/${a.batchId}/reteach`, false)}
                  </>
                )}
                {a.kind === "reteach" && link("Reteach plan", `/grade-exam/batch/${a.batchId}/reteach`)}
                {a.kind === "class" && link("Open the set", a.batchId ? `/grade-exam/batch/${a.batchId}` : `/teacher/classes/${a.classId}`)}
                {a.kind === "students" && link("See students", c.studentsHref)}
                {a.kind === "assignment" && link("Open the practice", `/teacher/practice/${a.id}`)}
                {a.kind === "quiz" && primary("Make a quiz", () => makeQuiz(c, a.topic, a.subject))}
                {a.kind === "grade" && link("Grade a class", c.classes.length === 1 ? `/grade-exam/batch?class=${c.classes[0].id}` : "/grade-exam/batch")}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
    {(more > 0 || showAll) && suggestions.length > FIRST && (
      <div className={cn(buttonRow, "mt-3")}>
        <button type="button" onClick={() => setShowAll((v) => !v)} className={actionButton}>{showAll ? "Show fewer" : `Show ${more} more`}</button>
      </div>
    )}
    </>
  )
}
