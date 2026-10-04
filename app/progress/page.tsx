"use client"

// The learner profile page: what this student is strong and weak at, built
// from their answer log (study_results) by lib/learner/profile.ts. Weak spots
// turn into a targeted quiz through the homepage prefill.

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Flame, Loader2, Target, TrendingUp, Trophy } from "lucide-react"
import NavigationHeader from "@/components/navigation-header"
import AuthGate from "@/components/auth-gate"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { flushResults } from "@/lib/results"
import { openHomeWithPrefill } from "@/lib/prefill"
import { displaySubject } from "@/lib/study-options"
import { buildProfile, weakSpotsRequest, PROFILE_RULES, type AnswerRow, type TopicStat } from "@/lib/learner/profile"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"

export default function ProgressPage() {
  return (
    <AuthGate>
      <Progress />
    </AuthGate>
  )
}

const pct = (x: number) => `${Math.round(x * 100)}%`
const OTHER = "__other"

function Progress() {
  const { user } = useAuth()
  const router = useRouter()
  const [rows, setRows] = useState<AnswerRow[] | null>(null)
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  // null = all subjects; OTHER = answers from guides without a subject.
  const [subject, setSubject] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    void (async () => {
      await flushResults() // answers still waiting in this browser
      const { data, error: dbError } = await supabase
        .from("study_results")
        .select("subject, topic, correct, answered_at, study_guide_id")
        .eq("user_id", user.id)
        .order("answered_at", { ascending: false })
        .limit(5000)
      if (dbError) { setError("Could not load your progress."); return }
      setRows(data ?? [])
      const ids = [...new Set((data ?? []).map((r) => r.study_guide_id).filter(Boolean))] as string[]
      if (ids.length) {
        const { data: guides } = await supabase.from("study_guides").select("id, title").in("id", ids.slice(0, 300))
        setTitles(Object.fromEntries((guides ?? []).map((g) => [g.id, g.title])))
      }
    })()
  }, [user])

  const overall = useMemo(() => (rows ? buildProfile(rows) : null), [rows])
  const otherCount = useMemo(() => rows?.filter((r) => !r.subject).length ?? 0, [rows])
  const profile = useMemo(() => {
    if (!rows) return null
    if (subject === null) return overall
    return buildProfile(rows.filter((r) => (subject === OTHER ? !r.subject : r.subject === subject)))
  }, [rows, subject, overall])
  const subjectTabs = overall
    ? [...overall.subjects.map((s) => ({ key: s.subject, label: displaySubject(s.subject) || s.subject, n: s.answered })), ...(otherCount ? [{ key: OTHER, label: "Other", n: otherCount }] : [])]
    : []
  const subjectLabel = subject === null ? "" : subjectTabs.find((t) => t.key === subject)?.label ?? ""
  const thisWeek = profile ? profile.last14.slice(-7).reduce((a, b) => a + b, 0) : 0

  const quizMe = (topics: TopicStat[]) => {
    const r = weakSpotsRequest(topics, titles)
    router.push(openHomeWithPrefill({
      source: "weak-spots",
      sourceTitle: "your Progress page",
      studyRequest: r.studyRequest,
      studyGuideName: r.studyGuideName,
      format: "quiz",
      subject: r.subject,
      detail: r.detail,
    }))
  }

  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 pb-36 pt-14 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 right-[8%] h-96 w-96 rounded-full bg-cyan-300/30 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />
        </div>
        <div className="container relative mx-auto max-w-4xl px-4 text-center">
          <h1 className={cn(fontDisplay, "text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl")}>
            Your progress
            <span className="block text-yellow-300">and what to study next</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-blue-50">Built from every quiz, practice and Learn question you answer. The more you study, the sharper it gets.</p>
        </div>
      </section>

      <main className="container relative mx-auto -mt-24 max-w-5xl space-y-6 px-4 pb-24">
        {error ? (
          <Card><p className="text-rose-700">{error}</p></Card>
        ) : !profile ? (
          <Card><p className="flex items-center justify-center gap-2 py-8 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading your progress…</p></Card>
        ) : profile.answered === 0 ? (
          <Card className="py-10 text-center">
            <Target className="mx-auto h-10 w-10 text-blue-600" />
            <h2 className={cn(fontDisplay, "mt-3 text-2xl font-semibold text-slate-900")}>Nothing here yet</h2>
            <p className="mx-auto mt-2 max-w-md text-slate-600">Answer questions in a quiz, practice set or Learn mode and your strengths and weak spots will show up here.</p>
            <Button asChild className="mt-5 bg-blue-600 hover:bg-blue-700"><Link href="/my-guides">Open my guides</Link></Button>
          </Card>
        ) : (
          <>
            {/* Overall, or one subject at a time (only when there's more than one) */}
            {subjectTabs.length > 1 && (
              <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-blue-900/10" role="tablist" aria-label="Subject">
                {[{ key: null as string | null, label: "All subjects", n: overall?.answered ?? 0 }, ...subjectTabs].map((t) => (
                  <button
                    key={t.key ?? "all"}
                    type="button"
                    role="tab"
                    aria-selected={subject === t.key}
                    onClick={() => setSubject(t.key)}
                    className={cn("rounded-xl px-4 py-2 text-sm font-semibold transition", subject === t.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100")}
                  >
                    {t.label} <span className={cn("ml-1 text-xs font-normal", subject === t.key ? "text-white/80" : "text-slate-400")}>{t.n}</span>
                  </button>
                ))}
              </div>
            )}

            {/* At a glance */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat icon={<TrendingUp className="h-5 w-5" />} label="Questions answered" value={profile.answered.toLocaleString()} />
              <Stat icon={<Target className="h-5 w-5" />} label="Accuracy" value={pct(profile.accuracy)} />
              <Stat icon={<Flame className="h-5 w-5" />} label="Day streak" value={String(profile.streak)} hint={profile.streak ? "Keep it going" : "Answer something today"} />
              <Stat icon={<Trophy className="h-5 w-5" />} label="This week" value={String(thisWeek)} hint="questions" />
            </div>

            <Card>
              <h2 className={cn(fontDisplay, "text-xl font-semibold text-slate-900")}>Last 2 weeks</h2>
              <ActivityStrip days={profile.last14} />
            </Card>

            {/* Weak spots */}
            <Card>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className={cn(fontDisplay, "text-2xl font-semibold text-slate-900")}>Weak spots{subjectLabel ? ` in ${subjectLabel}` : ""}</h2>
                  <p className="text-sm text-slate-500">Topics under {pct(PROFILE_RULES.weakBelow)} on your recent answers (at least {PROFILE_RULES.minAnswers} answered).</p>
                </div>
                {profile.weak.length > 0 && (
                  <Button onClick={() => quizMe(profile.weak)} className="h-11 rounded-xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 px-5 font-semibold text-white shadow-md hover:brightness-110">
                    Quiz me on my {subjectLabel ? `${subjectLabel} ` : ""}weak spots <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
              {profile.weak.length === 0 ? (
                <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">No weak spots right now. Nice work. Keep answering questions and this will update.</p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                  {profile.weak.slice(0, 8).map((t) => (
                    <TopicRow key={t.key} t={t} titles={titles} action={<button type="button" onClick={() => quizMe([t])} className="text-sm font-semibold text-blue-700 hover:underline">Practice</button>} />
                  ))}
                </ul>
              )}
            </Card>

            <div className={cn("grid gap-6", subject === null && "md:grid-cols-2")}>
              {/* Strong */}
              <Card>
                <h2 className={cn(fontDisplay, "text-2xl font-semibold text-slate-900")}>Strong topics</h2>
                {profile.strong.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">Topics where you get {pct(PROFILE_RULES.strongAtLeast)} or more right will show here.</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.strong.slice(0, 12).map((t) => (
                      <span key={t.key} className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">{t.topic} · {pct(t.recentAccuracy)}</span>
                    ))}
                  </div>
                )}
              </Card>

              {/* Subjects (overall view only) */}
              {subject === null && <Card>
                <h2 className={cn(fontDisplay, "text-2xl font-semibold text-slate-900")}>By subject</h2>
                {profile.subjects.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">Guides with a subject set will show here.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {profile.subjects.map((s) => (
                      <li key={s.subject}>
                        <div className="flex justify-between text-sm"><span className="font-medium text-slate-800">{displaySubject(s.subject) || s.subject}</span><span className="text-slate-500">{pct(s.accuracy)} of {s.answered}</span></div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn("h-full rounded-full", barColor(s.accuracy))} style={{ width: pct(s.accuracy) }} /></div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>}
            </div>

            {/* Every topic */}
            <Card>
              <button type="button" onClick={() => setShowAll(!showAll)} className="flex w-full items-center justify-between text-left">
                <h2 className={cn(fontDisplay, "text-xl font-semibold text-slate-900")}>All topics ({profile.topics.length})</h2>
                <span className="text-sm font-semibold text-blue-700">{showAll ? "Hide" : "Show"}</span>
              </button>
              {showAll && (
                <ul className="mt-3 divide-y divide-slate-100">
                  {[...profile.topics].sort((a, b) => b.lastAt.localeCompare(a.lastAt)).map((t) => <TopicRow key={t.key} t={t} titles={titles} />)}
                </ul>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  )
}

function barColor(acc: number) {
  return acc >= PROFILE_RULES.strongAtLeast ? "bg-emerald-500" : acc >= PROFILE_RULES.weakBelow ? "bg-blue-500" : "bg-amber-500"
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-blue-900/10 sm:p-6", className)}>{children}</section>
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-blue-900/10">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">{icon}</span>
      <p className={cn(fontDisplay, "mt-3 text-3xl font-semibold text-slate-900")}>{value}</p>
      <p className="text-sm text-slate-500">{label}{hint ? <span className="block text-xs text-slate-400">{hint}</span> : null}</p>
    </div>
  )
}

function ActivityStrip({ days }: { days: number[] }) {
  const max = Math.max(1, ...days)
  const label = (i: number) => { const d = new Date(); d.setDate(d.getDate() - (13 - i)); return d.toLocaleDateString([], { weekday: "narrow" }) }
  return (
    <div className="mt-4 flex items-end gap-1.5" role="img" aria-label={`Questions answered each day for the last 14 days: ${days.join(", ")}`}>
      {days.map((n, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex h-16 w-full items-end overflow-hidden rounded-md bg-slate-100">
            <div className={cn("w-full rounded-md", n ? "bg-gradient-to-t from-blue-600 to-cyan-400" : "")} style={{ height: `${(n / max) * 100}%` }} title={`${n} answered`} />
          </div>
          <span className={cn("text-[0.65rem]", i === 13 ? "font-bold text-slate-700" : "text-slate-400")}>{label(i)}</span>
        </div>
      ))}
    </div>
  )
}

function TopicRow({ t, titles, action }: { t: TopicStat; titles: Record<string, string>; action?: React.ReactNode }) {
  const guideId = t.guideIds[0]
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <span className={cn("w-12 shrink-0 rounded-lg py-1 text-center text-sm font-bold", t.recentAccuracy >= PROFILE_RULES.strongAtLeast ? "bg-emerald-50 text-emerald-700" : t.recentAccuracy >= PROFILE_RULES.weakBelow ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-800")}>{pct(t.recentAccuracy)}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-slate-900">{t.topic}</span>
        <span className="block truncate text-xs text-slate-500">
          {Math.round(t.recentAccuracy * t.recentAnswered)} of your last {t.recentAnswered} right
          {guideId && titles[guideId] ? <> · <Link href={`/study-guide/${guideId}`} className="hover:text-blue-700 hover:underline">{titles[guideId]}</Link></> : null}
        </span>
      </span>
      {action}
    </li>
  )
}
