"use client"

// All practice: every quiz, practice set and adaptive practice the teacher
// assigned. Open work (students can still do it for a grade) first, then
// everything finished or past due. The home page card links here.

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronDown, ChevronRight, ListChecks, Search } from "lucide-react"
import NavigationHeader from "@/components/navigation-header"
import AuthGate from "@/components/auth-gate"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth"
import { authFetch } from "@/lib/auth-fetch"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"
import { actionButton, actionButtonPrimary, backLink, selectBox } from "@/components/grading/grading-ui"
import { dueLabel } from "@/lib/student/classwork-rules"
import { sortYears } from "@/lib/classes/years"
import { sortClasses } from "@/lib/classes/sort"
import { matchesSearch, splitPractice, type PracticeListItem } from "@/lib/practice/list"

const PAST_STEP = 20
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })

export default function AllPracticePage() {
  return (
    <AuthGate>
      <AllPractice />
    </AuthGate>
  )
}

function AllPractice() {
  const { user } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<PracticeListItem[] | null>(null)
  const [error, setError] = useState("")
  const [thisYear, setThisYear] = useState("")
  const [year, setYear] = useState("")
  const [classId, setClassId] = useState("")
  const [query, setQuery] = useState("")
  const [pastShown, setPastShown] = useState(PAST_STEP)

  useEffect(() => {
    if (user && user.user_type !== "teacher") router.replace("/")
  }, [user, router])

  useEffect(() => {
    void (async () => {
      const res = await authFetch("/api/practice-assignments/all", { cache: "no-store" })
      if (!res.ok) { setError("Could not load your assigned practice. Try again."); return }
      const data = await res.json()
      setItems(data.items ?? [])
      setThisYear(data.year ?? "")
    })()
  }, [])

  // The year select only shows with work in two or more school years; it starts on this year when there is any.
  const years = useMemo(() => sortYears([...new Set((items ?? []).map((p) => p.schoolYear).filter((y): y is string => !!y))]), [items])
  useEffect(() => {
    if (years.length < 2) { setYear(""); return }
    setYear((y) => (y && years.includes(y) ? y : years.includes(thisYear) ? thisYear : years[0]))
  }, [years, thisYear])

  const inYear = useMemo(() => (items ?? []).filter((p) => !year || p.schoolYear === year), [items, year])
  const classes = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; period: string | null; created_at: string }>()
    for (const p of inYear) if (!seen.has(p.classId)) seen.set(p.classId, { id: p.classId, name: p.className ?? "Class", period: p.period, created_at: p.createdAt })
    return sortClasses([...seen.values()])
  }, [inYear])
  useEffect(() => { if (classId && !classes.some((c) => c.id === classId)) setClassId("") }, [classes, classId])
  useEffect(() => { setPastShown(PAST_STEP) }, [year, classId, query])

  const shown = useMemo(() => inYear.filter((p) => (!classId || p.classId === classId) && matchesSearch(p, query)), [inYear, classId, query])
  const { open, past } = useMemo(() => splitPractice(shown), [shown])
  const filtered = !!classId || !!query.trim()

  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />
      <main className="container mx-auto max-w-4xl px-4 py-10">
        <Link href="/teach" className={backLink}><ArrowLeft />Home</Link>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className={cn(fontDisplay, "text-4xl font-semibold tracking-tight text-slate-900")}>Assigned practice</h1>
            <p className="mt-1 max-w-xl text-slate-600">Every quiz, practice set and adaptive practice you gave your classes. What students can still do for a grade comes first.</p>
          </div>
          <Link href="/my-guides" className={cn(actionButtonPrimary, "h-11 w-full px-5 sm:w-auto")}><ListChecks />Assign from My Guides</Link>
        </div>

        {error && <p role="alert" className="mt-6 rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-800">{error}</p>}

        {!items && !error && (
          <div className="mt-6 space-y-3" role="status" aria-label="Loading your assigned practice">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/2 rounded-full" /><Skeleton className="h-3 w-1/3 rounded-full" /></div>
              </div>
            ))}
          </div>
        )}

        {items && items.length === 0 && (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-8 text-center">
            <ListChecks className="mx-auto mb-3 h-8 w-8 text-violet-700" />
            <h2 className="font-semibold text-slate-900">Nothing assigned yet</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">Open one of your quizzes, practice sets or adaptive practice in My Guides and press Assign. It shows up here with who has turned it in and how they did.</p>
          </div>
        )}

        {items && items.length > 0 && (
          <>
            <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-white p-2 ring-1 ring-slate-200 sm:flex-row sm:items-center">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Search assigned practice</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title or class" className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 hover:border-slate-400 focus:border-blue-500" />
              </label>
              {classes.length > 1 && (
                <select aria-label="Class" value={classId} onChange={(e) => setClassId(e.target.value)} className={cn(selectBox, "w-full sm:w-56")}>
                  <option value="">All classes</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.period ? ` · P${c.period}` : ""}</option>)}
                </select>
              )}
              {years.length > 1 && (
                <select aria-label="School year" value={year} onChange={(e) => setYear(e.target.value)} className={cn(selectBox, "w-full sm:w-36")}>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              )}
            </div>

            <section className="mt-8" aria-labelledby="open-heading">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 id="open-heading" className="text-lg font-semibold text-slate-900">Open now</h2>
                <span className="text-sm text-slate-600">{open.length} assignment{open.length === 1 ? "" : "s"}</span>
              </div>
              {open.length === 0 ? (
                <p className="rounded-2xl bg-white p-5 text-sm text-slate-600 ring-1 ring-slate-200">{filtered ? "Nothing open matches." : "Nothing is open right now."}</p>
              ) : (
                <ul className="space-y-3">{open.map((p) => <PracticeRow key={p.id} p={p} open />)}</ul>
              )}
            </section>

            {past.length > 0 && (
              <section className="mt-10" aria-labelledby="past-heading">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h2 id="past-heading" className="text-lg font-semibold text-slate-900">Finished or past due</h2>
                  <span className="text-sm text-slate-600">{past.length} assignment{past.length === 1 ? "" : "s"}</span>
                </div>
                <ul className="space-y-3">{past.slice(0, pastShown).map((p) => <PracticeRow key={p.id} p={p} />)}</ul>
                {past.length > pastShown && (
                  <button type="button" onClick={() => setPastShown((n) => n + PAST_STEP)} className={cn(actionButton, "mt-4 w-full sm:w-auto")}>
                    <ChevronDown />Show {Math.min(PAST_STEP, past.length - pastShown)} more
                  </button>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function PracticeRow({ p, open }: { p: PracticeListItem; open?: boolean }) {
  const pct = Math.round((p.done / Math.max(1, p.assigned)) * 100)
  const avg = p.average == null ? null : Math.round(p.average)
  const when = open ? dueLabel(p.dueAt) : p.dueAt ? `Was due ${shortDate(p.dueAt)}` : `Assigned ${shortDate(p.createdAt)}`
  const tile = avg == null ? "bg-violet-50 text-violet-700" : avg >= 80 ? "bg-emerald-50 text-emerald-700" : avg >= 65 ? "bg-blue-50 text-blue-700" : avg >= 50 ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-700"
  return (
    <li>
      <Link href={`/teacher/practice/${p.id}`} className={cn("group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md", !open && "bg-slate-50/60 shadow-none")}>
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold", tile)}>
          {avg == null ? <ListChecks className="h-5 w-5" aria-label="No scores yet" /> : <span aria-label={`Average ${avg} percent`}>{avg}%</span>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-slate-900 group-hover:text-blue-700">{p.title}</span>
          <span className="block text-sm text-slate-600">
            {[p.className, p.period && `P${p.period}`, when].filter(Boolean).join(" · ")}
            <span className="sm:hidden"> · {p.done} of {p.assigned} done</span>
          </span>
        </span>
        <span className="hidden w-32 shrink-0 text-right sm:block">
          <span className="block text-xs font-medium tabular-nums text-slate-700">{p.done} of {p.assigned} done</span>
          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><span className={cn("block h-full rounded-full", pct === 100 ? "bg-emerald-500" : "bg-violet-500")} style={{ width: `${pct}%` }} /></span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-blue-600" />
      </Link>
    </li>
  )
}
