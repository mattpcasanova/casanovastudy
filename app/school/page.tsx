"use client"

// School overview (2026-10-20, migration 064) for a principal or department
// head: how the school's teachers use Casanova Study this school year. Counts
// per teacher only, never student names. Admins are set with scripts/teachers.ts.

import { useEffect, useState } from "react"
import { BadgeCheck, ClipboardCheck, FileCheck, Loader2, NotebookPen, School, Target, Users } from "lucide-react"
import NavigationHeader from "@/components/navigation-header"
import AuthGate from "@/components/auth-gate"
import { authFetch } from "@/lib/auth-fetch"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"
import { selectBox } from "@/components/grading/grading-ui"
import type { SchoolOverview, TeacherStats } from "@/lib/school/overview"
import { share, type Agreement } from "@/lib/grading/agreement"

interface Data extends SchoolOverview {
  school: { domain: string; schoolName: string | null }
  schools: Array<{ domain: string; schoolName: string | null }>
  year: string
  agreement: { overall: Agreement; byTeacher: Record<string, Agreement> }
}

export default function SchoolPage() {
  return (
    <AuthGate>
      <SchoolOverviewPage />
    </AuthGate>
  )
}

const n = (x: number) => x.toLocaleString()
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–")

function ago(iso: string | null): string {
  if (!iso) return "Not yet"
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86400000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 60) return `${Math.floor(days / 7)} week${days < 14 ? "" : "s"} ago`
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" })
}

function SchoolOverviewPage() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState("")
  const [domain, setDomain] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setData(null)
      const res = await authFetch(`/api/school/overview${domain ? `?domain=${encodeURIComponent(domain)}` : ""}`, { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (res.ok) setData(json)
      else setError(json.error || "Couldn't load the school overview.")
    })()
  }, [domain])

  const name = data?.school.schoolName || data?.school.domain || "Your school"

  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 pb-36 pt-14 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 right-[8%] h-96 w-96 rounded-full bg-cyan-300/30 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />
        </div>
        <div className="container relative mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">School overview{data ? ` · ${data.year}` : ""}</p>
            <h1 className={cn(fontDisplay, "mt-2 text-4xl font-semibold tracking-tight sm:text-5xl")}>{name}</h1>
            <p className="mt-2 max-w-2xl text-blue-50">How your teachers are using Casanova Study this school year. Teacher totals only; student names stay with their teachers.</p>
          </div>
          {data && data.schools.length > 1 && (
            <select value={data.school.domain} onChange={(e) => setDomain(e.target.value)} aria-label="School" className={cn(selectBox, "w-64 text-slate-800")}>
              {data.schools.map((s) => <option key={s.domain} value={s.domain}>{s.schoolName || s.domain}</option>)}
            </select>
          )}
        </div>
      </section>

      <main className="container relative mx-auto -mt-24 max-w-6xl space-y-6 px-4 pb-20">
        {error ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
            <School className="mx-auto h-8 w-8 text-blue-600" />
            <p className="mt-3 font-semibold text-slate-900">{error}</p>
            <p className="mt-1 text-sm text-slate-600">School overviews are set up for principals and department heads. Email hello@casanovastudy.com to add one for your school.</p>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white p-10 text-slate-600 shadow-xl"><Loader2 className="h-5 w-5 animate-spin" />Loading…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={Users} label="Teachers using it" value={`${data.totals.activeTeachers} of ${data.totals.teachers}`} note="active in the last 30 days" />
              <Stat icon={FileCheck} label="Papers graded" value={n(data.totals.papers)} note={`${n(data.totals.sets)} class set${data.totals.sets === 1 ? "" : "s"} this year`} />
              <Stat icon={Target} label="Practice assigned" value={n(data.totals.practiceAssigned)} note={data.totals.practiceStudents ? `${pct(data.totals.practiceFinished, data.totals.practiceStudents)} of students finished` : "none yet"} />
              <Stat icon={ClipboardCheck} label="Students on class lists" value={n(data.totals.students)} note={`${n(data.totals.classes)} class${data.totals.classes === 1 ? "" : "es"} this year`} />
            </div>

            <WeeklyChart weeks={data.weeks} />

            <AgreementCard a={data.agreement.overall} />

            <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-900">Teachers</h2>
                <p className="text-sm text-slate-500">Approved teachers with a school email at {data.school.domain}</p>
              </div>
              {data.teachers.length === 0 ? (
                <p className="p-8 text-center text-sm text-slate-600">No verified teachers from {data.school.domain} yet. Teachers are added when they confirm their school email.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead>
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th scope="col" className="px-5 py-3">Teacher</th>
                        <th scope="col" className="px-3 py-3 text-right">Papers graded</th>
                        <th scope="col" className="px-3 py-3 text-right">Last 30 days</th>
                        <th scope="col" className="px-3 py-3 text-right">Class sets</th>
                        <th scope="col" className="px-3 py-3 text-right">Classes</th>
                        <th scope="col" className="px-3 py-3 text-right">Practice assigned</th>
                        <th scope="col" className="px-3 py-3 text-right">Finished</th>
                        <th scope="col" className="px-3 py-3 text-right">Guides made</th>
                        <th scope="col" className="px-3 py-3 text-right">AI marks kept</th>
                        <th scope="col" className="px-5 py-3 text-right">Last active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.teachers.map((t) => <TeacherRow key={t.id} t={t} agreement={data.agreement.byTeacher[t.id]} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

/** How often teachers kept the AI's marks on reports they checked. */
function AgreementCard({ a }: { a: Agreement }) {
  const kept = share(a.questionsKept, a.questions)
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><BadgeCheck className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-slate-900">How often teachers keep the AI&apos;s marks</h2>
          {!a.questions ? (
            <p className="mt-1 text-sm text-slate-600">Shows once teachers check reports graded from October 20, 2026 on. A report counts as checked when the teacher edits it or opens Edit and presses Done.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-slate-600">On {n(a.papers)} report{a.papers === 1 ? "" : "s"} teachers checked ({n(a.questions)} question marks).</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Figure value={`${kept}%`} label="question marks kept exactly" />
                <Figure value={`${share(a.questionsWithin1, a.questions)}%`} label="within 1 mark of the teacher" />
                <Figure value={`${a.meanTotalShift.toFixed(1)} pts`} label={`average change to a paper's score (${share(a.papersUnchanged, a.papers)}% not changed at all)`} />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className={cn(fontDisplay, "text-2xl font-semibold text-slate-900")}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-600">{label}</p>
    </div>
  )
}

function Stat({ icon: Icon, label, value, note }: { icon: typeof Users; label: string; value: string; note: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-blue-900/5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon className="h-5 w-5" /></span>
      <p className="mt-3 text-sm font-medium text-slate-600">{label}</p>
      <p className={cn(fontDisplay, "text-3xl font-semibold text-slate-900")}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{note}</p>
    </div>
  )
}

function TeacherRow({ t, agreement }: { t: TeacherStats; agreement?: Agreement }) {
  const idle = !t.lastActive
  return (
    <tr className={cn(idle && "text-slate-500")}>
      <td className="px-5 py-3">
        <span className="block font-semibold text-slate-900">{t.name}</span>
        {t.email && <span className="block text-xs text-slate-500">{t.email}</span>}
      </td>
      <td className="px-3 py-3 text-right tabular-nums">{n(t.papers)}</td>
      <td className="px-3 py-3 text-right tabular-nums">{n(t.papersRecent)}</td>
      <td className="px-3 py-3 text-right tabular-nums">{n(t.sets)}</td>
      <td className="px-3 py-3 text-right tabular-nums">{t.classes ? `${t.classes} (${n(t.students)} students)` : "0"}</td>
      <td className="px-3 py-3 text-right tabular-nums">{n(t.practiceAssigned)}</td>
      <td className="px-3 py-3 text-right tabular-nums">{t.practiceStudents ? pct(t.practiceFinished, t.practiceStudents) : "–"}</td>
      <td className="px-3 py-3 text-right tabular-nums">{n(t.guides)}</td>
      <td className="px-3 py-3 text-right tabular-nums" title={agreement ? `${agreement.papers} checked report${agreement.papers === 1 ? "" : "s"}` : undefined}>
        {agreement?.questions ? `${share(agreement.questionsKept, agreement.questions)}%` : "–"}
      </td>
      <td className="whitespace-nowrap px-5 py-3 text-right">{ago(t.lastActive)}</td>
    </tr>
  )
}

function WeeklyChart({ weeks }: { weeks: SchoolOverview["weeks"] }) {
  const max = Math.max(1, ...weeks.map((w) => w.papers + w.practice + w.guides))
  const total = weeks.reduce((s, w) => s + w.papers + w.practice + w.guides, 0)
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900">Last 12 weeks</h2>
        <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600">
          <Legend className="bg-blue-600" label="Papers graded" />
          <Legend className="bg-orange-600" label="Practice assigned" />
          <Legend className="bg-teal-600" label="Guides made" />
        </div>
      </div>
      {total === 0 ? (
        <p className="mt-6 rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-600"><NotebookPen className="mx-auto mb-2 h-5 w-5 text-blue-600" />No activity in the last 12 weeks yet.</p>
      ) : (
        <div className="mt-5 flex h-48 items-end gap-2" role="img" aria-label={`Activity over the last 12 weeks: ${weeks.map((w) => `week of ${w.start}, ${w.papers} papers, ${w.practice} practice, ${w.guides} guides`).join("; ")}`}>
          {weeks.map((w) => {
            const sum = w.papers + w.practice + w.guides
            return (
              <div key={w.start} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-xs font-semibold tabular-nums text-slate-600">{sum || ""}</span>
                <div className="flex w-full max-w-10 flex-col-reverse overflow-hidden rounded-lg bg-slate-100" style={{ height: `${Math.max(4, (sum / max) * 80)}%` }} title={`${w.papers} papers, ${w.practice} practice, ${w.guides} guides`}>
                  <div className="bg-blue-600" style={{ height: `${sum ? (w.papers / sum) * 100 : 0}%` }} />
                  <div className="bg-orange-600" style={{ height: `${sum ? (w.practice / sum) * 100 : 0}%` }} />
                  <div className="bg-teal-600" style={{ height: `${sum ? (w.guides / sum) * 100 : 0}%` }} />
                </div>
                <span className="text-[0.7rem] text-slate-500">{new Date(`${w.start}T12:00:00Z`).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={cn("h-2.5 w-2.5 rounded-full", className)} />{label}</span>
}
