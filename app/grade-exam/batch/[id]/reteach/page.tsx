"use client"

// Reteach plan for a graded set (/grade-exam/batch/[id]/reteach): written from
// the class report's weakest topics, the actual mistakes and small groups by
// student. Each section copies cleanly into a lesson planner (Planbook,
// Planboard, Common Planner, Google Docs); also Word download and print.

import { actionButton, actionButtonPrimary } from "@/components/grading/grading-ui"
import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, ClipboardCopy, Download, Loader2, Printer, RefreshCw, Star, Users, ClipboardList, PenLine, PencilLine } from "lucide-react"
import NavigationHeader from "@/components/navigation-header"
import AuthGate from "@/components/auth-gate"
import { Button } from "@/components/ui/button"
import { authFetch } from "@/lib/auth-fetch"
import { isPlanBlock } from "@/lib/plan-rules"
import { usePlan } from "@/components/plan/plan-provider"
import { openHomeWithPrefill } from "@/lib/prefill"
import { groupLabel, planDocBlocks, planHtml, planSections, planText, type PlanDetail, type PlanSection, type SavedReteach } from "@/lib/grading/reteach-export"
import { toDocx } from "@/lib/grading/docx"
import type { ReteachGroup } from "@/lib/grading/reteach"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"

type Saved = SavedReteach & { createdAt: string }
interface TopicOption { name: string; pct: number; recommended: boolean }

const DETAILS: Array<{ value: PlanDetail; label: string; hint: string; wait: string }> = [
  { value: "quick", label: "Quick", hint: "Bullets you can glance at mid-lesson, about a page", wait: "about 15 seconds" },
  { value: "standard", label: "Standard", hint: "Short steps and activities, the usual choice", wait: "about 25 seconds" },
  { value: "detailed", label: "Detailed", hint: "Full sentences, every problem written out", wait: "about 40 seconds" },
]

const MINUTES = [30, 40, 45, 50, 55, 60, 75, 90]
const GROUP_TONE: Record<ReteachGroup["kind"], string> = {
  reteach: "bg-rose-50 text-rose-800 ring-rose-200",
  practice: "bg-amber-50 text-amber-800 ring-amber-200",
  extend: "bg-emerald-50 text-emerald-800 ring-emerald-200",
}

async function copyRich(html: string, text: string) {
  try {
    await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })])
  } catch {
    await navigator.clipboard.writeText(text)
  }
}

export default function ReteachPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <AuthGate>
      <Reteach id={id} />
    </AuthGate>
  )
}

function Reteach({ id }: { id: string }) {
  const router = useRouter()
  const { openPremium } = usePlan()
  const [saved, setSaved] = useState<Saved | null>(null)
  const [topics, setTopics] = useState<TopicOption[]>([])
  const [detail, setDetail] = useState<PlanDetail>("standard")
  const [ready, setReady] = useState(true)
  const [meta, setMeta] = useState<{ examTitle: string | null; className: string | null }>({ examTitle: null, className: null })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [minutes, setMinutes] = useState(50)
  const [focus, setFocus] = useState<string[]>([])
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const res = await authFetch(`/api/grade-batch/${id}/reteach`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) setError(data.error || "Could not load this class set")
      else {
        setSaved(data.saved)
        setTopics(data.topics ?? [])
        if (!data.saved) setFocus((data.topics ?? []).filter((t: TopicOption) => t.recommended).map((t: TopicOption) => t.name))
        setReady(data.ready)
        setMeta({ examTitle: data.examTitle, className: data.className })
        if (data.saved) { setMinutes(data.saved.minutes); setDetail(data.saved.detail ?? "detailed"); setFocus(data.saved.focus.map((f: { name: string }) => f.name)) }
      }
      setLoading(false)
    })()
  }, [id])

  const write = async () => {
    setBusy(true)
    setError("")
    try {
      const res = await authFetch(`/api/grade-batch/${id}/reteach`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ minutes, detail, focus: focus.length ? focus : undefined }) })
      const data = await res.json().catch(() => ({}))
      if (isPlanBlock(data)) { openPremium(data); return }
      if (!res.ok) throw new Error(data.error || "Could not write the plan")
      setSaved(data.saved)
      setFocus(data.saved.focus.map((f: { name: string }) => f.name))
      setOptionsOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not write the plan")
    } finally {
      setBusy(false)
    }
  }

  const copy = async (key: string, html: string, text: string) => {
    await copyRich(html, text)
    setCopied(key)
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000)
  }

  const downloadWord = async () => {
    if (!saved) return
    const bytes = await toDocx(planDocBlocks(saved))
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }))
    a.download = `${(saved.plan.title || "Reteach plan").replace(/[\\/:*?"<>|]+/g, " ")}.docx`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const practiceFor = (g: ReteachGroup) => {
    if (!saved) return
    const topic = g.topic ?? saved.focus.map((f) => f.name).join(", ")
    const mistakes = saved.plan.miniLesson.misconceptions.map((m) => m.mistake).slice(0, 4).join("; ")
    const level = g.kind === "extend" ? "harder, exam-level and extension problems" : g.kind === "reteach" ? "start from the basics and build up step by step" : "mixed practice at test level"
    router.push(openHomeWithPrefill({
      source: "class-area",
      sourceTitle: saved.className || "your class",
      studyRequest: `Practice on ${topic} for ${g.students.length} students in my ${saved.className || ""} class after ${saved.examTitle || "a test"}. ${level}. Mistakes students made on the test: ${mistakes || "see the topic"}. Include worked explanations.`,
      studyGuideName: `${topic}: ${groupLabel(g).startsWith("Reteach") ? "reteach practice" : g.kind === "extend" ? "extension" : "practice"}`,
      format: "practice",
      detail: `${topic} (${groupLabel(g).toLowerCase()})`,
    }))
  }

  const sections: PlanSection[] = saved ? planSections(saved) : []

  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50 print:bg-white")}>
      <div className="print:hidden"><NavigationHeader /></div>
      <main className="container mx-auto max-w-4xl px-4 py-10 print:max-w-none print:py-0">
        <Link href={`/grade-exam/batch/${id}`} className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline print:hidden"><ArrowLeft className="h-4 w-4" />Class results</Link>

        {loading ? (
          <p className="mt-10 flex items-center justify-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading…</p>
        ) : !saved ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-blue-900/5">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 text-white"><ClipboardList className="h-6 w-6" /></span>
            <h1 className={cn(fontDisplay, "mt-4 text-3xl font-semibold tracking-tight text-slate-900")}>Plan the reteach</h1>
            <p className="mt-1 max-w-2xl text-slate-600">
              One lesson built from {meta.examTitle ? <strong>{meta.examTitle}</strong> : "this test"}{meta.className ? ` (${meta.className})` : ""}: a warm-up aimed at the mistakes students actually made, a short mini-lesson, small groups by student, and an exit ticket. Students&apos; names stay here; the AI only sees group sizes.
            </p>
            {!ready ? (
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">The class report for this set isn&apos;t written yet. Open <Link href={`/grade-exam/batch/${id}`} className="font-semibold underline">class results</Link> first, then come back.</p>
            ) : (
              <PlanOptions topics={topics} minutes={minutes} setMinutes={setMinutes} focus={focus} setFocus={setFocus} detail={detail} setDetail={setDetail} />
            )}
            {error && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
            <Button onClick={() => void write()} disabled={busy || !ready} className="mt-5 h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-6 text-base font-semibold">
              {busy ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Writing the plan ({DETAILS.find((d) => d.value === detail)?.wait})…</> : <><PenLine className="mr-2 h-5 w-5" />Write the plan</>}
            </Button>
          </section>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-indigo-700">Reteach plan · {saved.minutes} minutes</p>
                <h1 className={cn(fontDisplay, "text-4xl font-semibold tracking-tight text-slate-900")}>{saved.plan.title || "Reteach lesson"}</h1>
                <p className="text-slate-600">{[saved.className, saved.examTitle && `after ${saved.examTitle}`].filter(Boolean).join(" · ")}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {saved.focus.map((f) => <span key={f.name} className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-800 ring-1 ring-inset ring-rose-200">{f.name} · class {f.pct}%</span>)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 print:hidden">
                <Button variant="outline" onClick={() => void copy("all", planHtml(saved), planText(saved))}>{copied === "all" ? <><Check className="mr-2 h-4 w-4" />Copied</> : <><ClipboardCopy className="mr-2 h-4 w-4" />Copy all</>}</Button>
                <Button variant="outline" onClick={() => void downloadWord()}><Download className="mr-2 h-4 w-4" />Word</Button>
                <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button>
                <Button variant="outline" onClick={() => setOptionsOpen((o) => !o)}><RefreshCw className="mr-2 h-4 w-4" />Rewrite</Button>
              </div>
            </div>

            <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-900 print:hidden">
              <strong>Into Planbook or your planner:</strong> each section has its own Copy button; paste it into the matching box of your lesson (Objectives, Activities, Assessment...). Formatting comes along. Or attach the Word file.
            </p>

            {optionsOpen && (
              <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 print:hidden">
                <PlanOptions topics={topics} minutes={minutes} setMinutes={setMinutes} focus={focus} setFocus={setFocus} detail={detail} setDetail={setDetail} />
                {error && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
                <Button onClick={() => void write()} disabled={busy} className="mt-4 bg-indigo-600 hover:bg-indigo-700">{busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Rewriting…</> : "Write a new plan"}</Button>
              </section>
            )}

            <div className="mt-6 space-y-4">
              {sections.map((s) => (
                <section key={s.key} className="break-inside-avoid rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h2 className={cn(fontDisplay, "text-xl font-semibold text-slate-900")}>{s.title}</h2>
                    <button type="button" onClick={() => void copy(s.key, s.html, s.text)} className={cn(actionButton, "print:hidden")}>
                      {copied === s.key ? <><Check className="h-4 w-4" />Copied</> : <><ClipboardCopy className="h-4 w-4" />Copy</>}
                    </button>
                  </div>
                  {s.key === "groups" ? (
                    <div className="space-y-3">
                      {saved.groups.map((g) => {
                        const ai = saved.plan.groups.find((x) => x.key === g.key)
                        return (
                          <div key={g.key} className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200 print:bg-white">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", GROUP_TONE[g.kind])}><Users className="h-3.5 w-3.5" />{groupLabel(g)}</span>
                              {ai?.minutes ? <span className="text-xs text-slate-500">{ai.minutes} min</span> : null}
                              <button type="button" onClick={() => practiceFor(g)} className={cn(actionButtonPrimary, "ml-auto print:hidden")}><PencilLine />Make their practice set</button>
                            </div>
                            <p className="mt-2 text-sm text-slate-800">{g.students.map((st) => st.name).join(", ")}</p>
                            {ai && <p className="mt-2 text-sm text-slate-700">{ai.activity}</p>}
                            {ai?.teacherMove && <p className="mt-1 text-sm text-slate-500"><span className="font-medium text-slate-700">You:</span> {ai.teacherMove}</p>}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="plan-html space-y-2 text-[0.95rem] leading-relaxed text-slate-800 [&_li]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ul]:list-disc [&_ul]:space-y-1" dangerouslySetInnerHTML={{ __html: s.html }} />
                  )}
                </section>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500 print:hidden">Written {new Date(saved.createdAt).toLocaleString()}. Groups come from each student&apos;s marks on the focus topics: under 60% gets the reteach, 80%+ everywhere gets extension.</p>
          </>
        )}
      </main>
    </div>
  )
}

function PlanOptions({ topics, minutes, setMinutes, focus, setFocus, detail, setDetail }: {
  topics: TopicOption[]
  minutes: number
  setMinutes: (m: number) => void
  focus: string[]
  setFocus: (f: string[]) => void
  detail: PlanDetail
  setDetail: (d: PlanDetail) => void
}) {
  const recommended = topics.filter((t) => t.recommended).map((t) => t.name)
  const onRecommended = recommended.length > 0 && recommended.length === focus.length && recommended.every((r) => focus.includes(r))
  return (
    <div className="mt-5 space-y-5">
      <div className="flex flex-wrap gap-6">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Lesson length</span>
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            {MINUTES.map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </select>
        </label>
        <div className="text-sm">
          <p className="mb-1 font-medium text-slate-700">How much detail</p>
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
            {DETAILS.map((d) => (
              <button key={d.value} type="button" aria-pressed={detail === d.value} onClick={() => setDetail(d.value)} className={cn("rounded-md px-3 py-1.5", detail === d.value ? "bg-white font-semibold text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}>
                {d.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">{DETAILS.find((d) => d.value === detail)?.hint}</p>
        </div>
      </div>
      {topics.length > 0 && (
        <div className="text-sm">
          <p className="mb-1 font-medium text-slate-700">Focus on <span className="font-normal text-slate-500">(up to 3)</span></p>
          {recommended.length > 0 && (
            <p className="mb-2 text-xs text-slate-600">
              <Star className="mr-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-500" />Recommended: the topics the class scored lowest on (under 80%).
              {!onRecommended && <button type="button" onClick={() => setFocus(recommended)} className="ml-1.5 font-semibold text-blue-700 hover:underline">Use the recommended ones</button>}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {topics.map((t) => {
              const on = focus.includes(t.name)
              return (
                <button
                  key={t.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFocus(on ? focus.filter((x) => x !== t.name) : focus.length < 3 ? [...focus, t.name] : focus)}
                  className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 ring-1 ring-inset", on ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50")}
                >
                  {t.recommended && <Star className={cn("h-3 w-3", on ? "fill-amber-300 text-amber-300" : "fill-amber-400 text-amber-500")} />}
                  {t.name}
                  <span className={cn("text-xs tabular-nums", on ? "text-indigo-100" : t.pct < 60 ? "text-rose-600" : t.pct < 80 ? "text-amber-700" : "text-emerald-700")}>{t.pct}%</span>
                </button>
              )
            })}
          </div>
          {focus.length === 0 && <p className="mt-1.5 text-xs text-slate-500">Nothing picked: we&apos;ll use the recommended ones.</p>}
        </div>
      )}
    </div>
  )
}
