"use client"

// One student (/teacher/classes/[id]/students/[rosterId]): every graded test
// with the class average beside it, absent/missing marks, their areas next
// to the class, and, only if they joined the class with its code, their
// practice on this teacher's own guides (never their other studying).

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Link2, Loader2, Lock, Mail, TrendingDown, TrendingUp, Users } from "lucide-react"
import NavigationHeader from "@/components/navigation-header"
import AuthGate from "@/components/auth-gate"
import { authFetch } from "@/lib/auth-fetch"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"

interface Work {
  kind: "paper" | "status"
  id?: string
  batchId: string
  title: string
  date: string
  marks?: number
  possible?: number
  pct?: number
  grade?: string
  released?: boolean
  group?: string[] | null
  classAverage?: number | null
  status?: string
}

interface StudentData {
  class: { id: string; name: string; period: string | null; schoolYear: string }
  student: { id: string; firstName: string; lastName: string; studentNumber: string | null; email: string | null; linked: boolean; joined: boolean; left: boolean }
  work: Work[]
  areas: Array<{ name: string; pct: number; classPct: number }>
  practice: null | { answered: number; accuracy: number; lastAt: string | null; guides: Array<{ id: string; title: string; answered: number; pct: number; lastAt: string }> }
}

const tone = (pct: number) => (pct >= 80 ? "text-emerald-700" : pct >= 65 ? "text-blue-700" : pct >= 50 ? "text-amber-700" : "text-rose-700")
const bar = (pct: number) => (pct >= 80 ? "bg-emerald-500" : pct >= 65 ? "bg-blue-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500")
const STATUS: Record<string, string> = { absent: "Absent", missing: "Missing", exempt: "Exempt", late: "Late" }

export default function StudentPage({ params }: { params: Promise<{ id: string; rosterId: string }> }) {
  const { id, rosterId } = use(params)
  return (
    <AuthGate>
      <Student classId={id} rosterId={rosterId} />
    </AuthGate>
  )
}

function Student({ classId, rosterId }: { classId: string; rosterId: string }) {
  const [data, setData] = useState<StudentData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const res = await authFetch(`/api/classes/${classId}/students/${rosterId}`, { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setError(json.error || "Could not load this student")
      else setData(json)
    })()
  }, [classId, rosterId])

  const papers = data?.work.filter((w) => w.kind === "paper") ?? []
  const average = papers.length ? papers.reduce((s, p) => s + (p.pct ?? 0), 0) / papers.length : null
  const classAvg = papers.filter((p) => p.classAverage != null)
  const vsClass = classAvg.length ? classAvg.reduce((s, p) => s + (p.pct ?? 0) - (p.classAverage ?? 0), 0) / classAvg.length : null
  // Trend: the latest test against the ones before it.
  const ordered = [...papers].sort((a, b) => a.date.localeCompare(b.date))
  const trend = ordered.length > 1 ? (ordered[ordered.length - 1].pct ?? 0) - ordered.slice(0, -1).reduce((s, p) => s + (p.pct ?? 0), 0) / (ordered.length - 1) : null

  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />
      <main className="container mx-auto max-w-5xl px-4 py-10">
        <Link href={`/teacher/classes/${classId}`} className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"><ArrowLeft className="h-4 w-4" />{data?.class.name ?? "Class"}</Link>
        {error ? (
          <p className="mt-6 rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p>
        ) : !data ? (
          <p className="mt-10 flex items-center justify-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading…</p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className={cn(fontDisplay, "text-4xl font-semibold tracking-tight text-slate-900")}>{`${data.student.firstName} ${data.student.lastName}`.trim()}</h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                  <span>{[data.class.name, data.class.period && `Period ${data.class.period}`, data.class.schoolYear].filter(Boolean).join(" · ")}</span>
                  {data.student.studentNumber && <span>ID {data.student.studentNumber}</span>}
                  {data.student.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{data.student.email}</span>}
                  {data.student.linked
                    ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"><Link2 className="h-3 w-3" />{data.student.joined ? "Joined the class" : "Account linked by email"}</span>
                    : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">No account linked yet</span>}
                  {data.student.left && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Left the class</span>}
                </p>
              </div>
              <div className="flex gap-3">
                <Stat label="Average" value={average == null ? "-" : `${Math.round(average)}%`} className={average == null ? "" : tone(average)} />
                <Stat label="vs class" value={vsClass == null ? "-" : `${vsClass >= 0 ? "+" : ""}${Math.round(vsClass)}`} className={vsClass == null ? "" : vsClass >= 0 ? "text-emerald-700" : "text-rose-700"} />
                <Stat label="Latest trend" value={trend == null ? "-" : `${trend >= 0 ? "+" : ""}${Math.round(trend)}`} icon={trend == null ? null : trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />} className={trend == null ? "" : trend >= 0 ? "text-emerald-700" : "text-rose-700"} />
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-slate-900">Graded work</h2>
                {data.work.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">Nothing graded for this student in this class yet.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-slate-100">
                    {data.work.map((w, i) => (
                      <li key={`${w.batchId}-${i}`} className="flex flex-wrap items-center gap-3 py-3">
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-slate-900">{w.title}</span>
                          <span className="block text-xs text-slate-500">
                            {new Date(w.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                            {w.classAverage != null && <> · class average {Math.round(w.classAverage)}%</>}
                            {w.group && <> · <Users className="inline h-3 w-3" /> group with {w.group.filter((n) => n !== `${data.student.firstName} ${data.student.lastName}`.trim()).join(", ")}</>}
                            {w.kind === "paper" && !w.released && data.student.linked && <> · not released to the student</>}
                          </span>
                        </span>
                        {w.kind === "paper" ? (
                          <>
                            <span className={cn("text-right text-sm font-semibold tabular-nums", tone(w.pct ?? 0))}>{w.marks}/{w.possible} · {Math.round(w.pct ?? 0)}%{w.grade ? ` · ${w.grade}` : ""}</span>
                            <Link href={`/grade-report/${w.id}`} className="inline-flex h-9 items-center rounded-xl px-3.5 text-sm font-semibold text-blue-700 ring-1 ring-slate-300 hover:bg-blue-50">Report</Link>
                          </>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">{STATUS[w.status ?? ""] ?? w.status}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div className="space-y-6">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="font-semibold text-slate-900">By area</h2>
                  <p className="text-xs text-slate-500">Across every graded test, next to the class (the grey tick).</p>
                  {data.areas.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">Shows once graded sets have class reports.</p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {data.areas.map((a) => (
                        <li key={a.name}>
                          <div className="flex items-baseline justify-between gap-2 text-sm">
                            <span className="truncate text-slate-800">{a.name}</span>
                            <span className={cn("font-semibold tabular-nums", tone(a.pct))}>{Math.round(a.pct)}%</span>
                          </div>
                          <div className="relative mt-1 h-2 rounded-full bg-slate-100">
                            <div className={cn("h-full rounded-full", bar(a.pct))} style={{ width: `${Math.max(2, Math.min(100, a.pct))}%` }} />
                            <div className="absolute -top-0.5 h-3 w-0.5 rounded bg-slate-500" style={{ left: `${Math.min(100, a.classPct)}%` }} title={`Class ${Math.round(a.classPct)}%`} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="font-semibold text-slate-900">Practice on your material</h2>
                  <p className="text-xs text-slate-500">Only questions they answered in guides you made (practice sets, reteach practice, guides you shared). Nothing from their other studying.</p>
                  {!data.practice ? (
                    <p className="mt-2 flex items-start gap-2 text-sm text-slate-500">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                      Shows once they join this class with its code.
                    </p>
                  ) : data.practice.answered === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">No practice on your guides yet.</p>
                  ) : (
                    <div className="mt-3 space-y-3 text-sm">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span><span className="font-semibold text-slate-900">{data.practice.answered}</span> questions</span>
                        <span><span className={cn("font-semibold", tone(data.practice.accuracy * 100))}>{Math.round(data.practice.accuracy * 100)}%</span> right</span>
                        {data.practice.lastAt && <span className="text-slate-500">last {new Date(data.practice.lastAt).toLocaleDateString([], { month: "short", day: "numeric" })}</span>}
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {data.practice.guides.map((g) => (
                          <li key={g.id} className="flex items-center gap-2 py-1.5">
                            <Link href={`/study-guide/${g.id}`} className="min-w-0 flex-1 truncate text-slate-800 hover:text-blue-700 hover:underline">{g.title}</Link>
                            <span className="shrink-0 text-xs text-slate-500">{g.answered} · </span>
                            <span className={cn("shrink-0 text-xs font-semibold tabular-nums", tone(g.pct))}>{g.pct}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function Stat({ label, value, className, icon }: { label: string; value: string; className?: string; icon?: React.ReactNode }) {
  return (
    <div className="min-w-[6.5rem] rounded-2xl bg-white px-4 py-3 text-center shadow-sm ring-1 ring-slate-200">
      <p className={cn("flex items-center justify-center gap-1 text-2xl font-semibold tabular-nums text-slate-900", className)}>{icon}{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}
