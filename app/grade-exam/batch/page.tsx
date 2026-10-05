"use client"

// Batch grading: a whole class set in one go. Teachers drop a stack of pages
// (phone photos in any format, scanned PDFs, Word files), we prepare them in the
// browser (lib/uploads/prepare.ts), upload them to Cloudinary, read the top of
// each page to find where each student's paper starts (students write their
// name on page 1 only) and fill in the exam details from the papers, let the
// teacher fix the split, then grade a few papers at a time
// (/api/grade-batch/paper). With no mark scheme, an answer key is drafted from
// the first paper (/api/grade-batch/answer-key) for the teacher to check, and
// every paper is marked against it. Keep the tab open while it grades.

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle2, Download, FileText, KeyRound, Loader2, RotateCcw, Scissors, Sparkles, Trash2 } from "lucide-react"
import NavigationHeader from "@/components/navigation-header"
import AuthGate from "@/components/auth-gate"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import { authFetch } from "@/lib/auth-fetch"
import { ClientCompression } from "@/lib/client-compression"
import { prepareMaterials } from "@/lib/uploads/prepare"
import { UPLOAD_ACCEPT } from "@/lib/uploads/kinds"
import { DropZone as KitDropZone, FileList, GradingHero, GradingModeSwitch, MarkSchemeNudge, StepCard, StepHeading, primaryCta } from "@/components/grading/grading-ui"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { estimateGradingSeconds, groupPages, measuredSecondsPerPage, mostCommon, remainingSeconds, naturalCompare, resultsCsv, splitPoints, type PageHeader } from "@/lib/grading/batch"
import { isPlanBlock } from "@/lib/plan-rules"
import { usePlan } from "@/components/plan/plan-provider"
import { cn } from "@/lib/utils"

const MAX_PAGES = 300
// Papers graded at once after the first (which runs alone to write the prompt cache).
const CONCURRENCY = 5

interface Page {
  label: string
  /** Uploaded JPEG (photos, scanned pages) or extracted text (Word/PowerPoint/text papers). */
  url?: string
  text?: string
  thumb?: string
}

type PaperStatus = {
  state: "waiting" | "grading" | "done" | "error"
  id?: string; marks?: number; possible?: number; percentage?: number; grade?: string; error?: string
  /** Live progress while grading. */
  message?: string; graded?: number; total?: number | null
  startedAt?: number; seconds?: number
}

type Phase = "setup" | "preparing" | "review" | "grading"

type AnswerKey = { status: "none" | "drafting" | "ready" | "error"; text: string; error?: string }

type Scheme = { texts: Array<{ name: string; content: string }>; images: Array<{ url: string; name: string }> }

const ANSWER_KEY_NAME = "Answer key (drafted from the papers, checked by the teacher)"

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`

const minutes = (seconds: number) => (seconds < 60 ? "under a minute" : seconds < 90 ? "about a minute" : `about ${Math.round(seconds / 60)} minutes`)

export default function BatchGradingPage() {
  return (
    <AuthGate>
      <BatchGrading />
    </AuthGate>
  )
}

function BatchGrading() {
  const { user } = useAuth()
  const { openPremium } = usePlan()
  const [examTitle, setExamTitle] = useState("")
  const [className, setClassName] = useState("")
  const [classPeriod, setClassPeriod] = useState("")
  const [notes, setNotes] = useState("")
  const [markFiles, setMarkFiles] = useState<File[]>([])
  const [paperFiles, setPaperFiles] = useState<File[]>([])
  const [sortByName, setSortByName] = useState(true)

  const [phase, setPhase] = useState<Phase>("setup")
  const [status, setStatus] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [problems, setProblems] = useState<string[]>([])

  const [markScheme, setMarkScheme] = useState<Scheme>({ texts: [], images: [] })
  const [answerKey, setAnswerKey] = useState<AnswerKey>({ status: "none", text: "" })
  const [autoFilled, setAutoFilled] = useState(false)
  const [pages, setPages] = useState<Page[]>([])
  const [headers, setHeaders] = useState<PageHeader[]>([])
  const [starts, setStarts] = useState<boolean[]>([])
  const [removed, setRemoved] = useState<Set<number>>(new Set())
  const [names, setNames] = useState<Record<number, string>>({}) // keyed by a paper's first page index
  const [results, setResults] = useState<Record<number, PaperStatus>>({})
  const [gradingStartedAt, setGradingStartedAt] = useState<number | null>(null)
  // A one-second clock while grading, for elapsed time and time left.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (phase !== "grading") return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [phase])
  const batchId = useRef<string>(typeof crypto !== "undefined" ? crypto.randomUUID() : "")
  const stopRef = useRef(false)

  // Free the page thumbnails when leaving.
  const thumbsRef = useRef<string[]>([])
  useEffect(() => () => thumbsRef.current.forEach((u) => URL.revokeObjectURL(u)), [])

  const papers = useMemo(() => {
    return groupPages(starts, headers, removed).map((g) => ({ ...g, key: g.pages[0], name: names[g.pages[0]] ?? g.name }))
  }, [starts, headers, removed, names])

  if (user && user.user_type !== "teacher") {
    return <Shell><p className="rounded-xl bg-amber-50 p-6 text-amber-900">Batch grading is for teacher accounts.</p></Shell>
  }

  const prepareAndSort = async () => {
    setError(null)
    setProblems([])
    if (!paperFiles.length) { setError("Add the students' papers first."); return }
    setPhase("preparing")
    try {
      // Mark scheme: typed PDFs/Word read as text, photos and scans as images.
      const issues: string[] = []
      let scheme = { texts: [] as Array<{ name: string; content: string }>, images: [] as Array<{ url: string; name: string }> }
      if (markFiles.length) {
        setStatus("Reading the mark scheme...")
        const prepared = await prepareMaterials(markFiles, { pdfMode: "auto", maxImages: 30, onProgress: setStatus })
        issues.push(...prepared.problems)
        const images = await uploadAll(prepared.images.map((i) => ({ blob: i.blob, name: i.name })), "grading-mark-schemes", (n, total) => setStatus(`Uploading mark scheme page ${n} of ${total}...`))
        scheme = { texts: prepared.texts, images }
      }

      // Student pages, in camera-roll / file-name order.
      const ordered = sortByName ? [...paperFiles].sort((a, b) => naturalCompare(a.name, b.name)) : paperFiles
      const imagePages: Array<{ blob: Blob; label: string }> = []
      const textPapers: Page[] = []
      for (const file of ordered) {
        if (imagePages.length >= MAX_PAGES) { issues.push(`Only the first ${MAX_PAGES} pages were used.`); break }
        const prepared = await prepareMaterials([file], { pdfMode: "images", maxImages: MAX_PAGES - imagePages.length, onProgress: setStatus })
        issues.push(...prepared.problems)
        prepared.images.forEach((img) => imagePages.push({ blob: img.blob, label: img.name }))
        // A typed (Word/PowerPoint/text) paper is one student's whole paper.
        prepared.texts.forEach((t) => textPapers.push({ label: t.name, text: t.content }))
      }
      if (!imagePages.length && !textPapers.length) throw new Error("None of the papers could be read. " + issues.join(" "))

      const uploaded = await uploadAll(imagePages.map((p) => ({ blob: p.blob, name: p.label })), "grading-pages", (n, total) => setStatus(`Uploading page ${n} of ${total}...`))
      const thumbs = imagePages.map((p) => URL.createObjectURL(p.blob))
      thumbsRef.current.push(...thumbs)

      let imageHeaders: PageHeader[] = []
      if (uploaded.length) {
        setStatus(`Finding where each student's paper starts (${uploaded.length} pages)...`)
        const res = await authFetch("/api/grade-batch/split", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pages: uploaded }),
        })
        const data = await res.json().catch(() => ({}))
        if (isPlanBlock(data)) { openPremium(data); setPhase("setup"); return }
        if (!res.ok) throw new Error(data.error || "Could not read the pages")
        imageHeaders = data.headers
      }

      const allPages: Page[] = [
        ...uploaded.map((u, i) => ({ label: u.name, url: u.url, thumb: thumbs[i] })),
        ...textPapers,
      ]
      const allHeaders: PageHeader[] = [
        ...imageHeaders,
        ...textPapers.map((t) => ({ name: t.label.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "), firstPage: true })),
      ]
      // Fill the exam details from the papers (only the boxes the teacher left empty).
      const firsts = allHeaders.filter((h) => h.firstPage)
      const found = { title: mostCommon(firsts.map((h) => h.title)), course: mostCommon(firsts.map((h) => h.course)), period: mostCommon(allHeaders.map((h) => h.period)) }
      if (found.title && !examTitle.trim()) setExamTitle(found.title)
      if (found.course && !className.trim()) setClassName(found.course)
      if (found.period && !classPeriod.trim()) setClassPeriod(found.period)
      setAutoFilled(Boolean((found.title && !examTitle.trim()) || (found.course && !className.trim()) || (found.period && !classPeriod.trim())))

      const startPoints = splitPoints(allHeaders)
      setMarkScheme(scheme)
      setPages(allPages)
      setHeaders(allHeaders)
      setStarts(startPoints)
      setRemoved(new Set())
      setNames({})
      setResults({})
      setProblems(issues)
      setPhase("review")

      // No mark scheme: write one answer key from the first paper so everyone is marked the same way.
      if (!scheme.texts.length && !scheme.images.length) {
        const first = groupPages(startPoints, allHeaders)[0]
        if (first) void draftAnswerKey(first.pages.map((i) => allPages[i]))
      } else {
        setAnswerKey({ status: "none", text: "" })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
      setPhase("setup")
    } finally {
      setStatus("")
    }
  }

  const draftAnswerKey = async (paperPages: Page[]) => {
    setAnswerKey({ status: "drafting", text: "" })
    try {
      const res = await authFetch("/api/grade-batch/answer-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pages: paperPages.filter((p) => p.url).map((p) => ({ url: p.url, name: p.label })),
          texts: paperPages.filter((p) => p.text).map((p) => ({ name: p.label, content: p.text })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (isPlanBlock(data)) { openPremium(data); setAnswerKey({ status: "error", text: "", error: data.error }); return }
      if (!res.ok || !data.key) throw new Error(data.error || "Could not write an answer key")
      setAnswerKey({ status: "ready", text: data.key })
    } catch (e) {
      setAnswerKey({ status: "error", text: "", error: e instanceof Error ? e.message : "Could not write an answer key" })
    }
  }

  const hasScheme = markScheme.texts.length > 0 || markScheme.images.length > 0
  // The checked answer key stands in for the mark scheme (and caches the same way).
  const schemeForGrading: Scheme = hasScheme || answerKey.status !== "ready" || !answerKey.text.trim()
    ? markScheme
    : { texts: [{ name: ANSWER_KEY_NAME, content: answerKey.text }], images: [] }

  const gradeOne = async (paper: (typeof papers)[number], attempt = 1): Promise<void> => {
    const startedAt = Date.now()
    const update = (patch: Partial<PaperStatus>) => setResults((r) => ({ ...r, [paper.key]: { ...r[paper.key], ...patch } as PaperStatus }))
    setResults((r) => ({ ...r, [paper.key]: { state: "grading", message: attempt > 1 ? "Trying again" : "Starting", startedAt } }))
    try {
      const imagePages = paper.pages.map((i) => pages[i]).filter((p) => p.url)
      const textPages = paper.pages.map((i) => pages[i]).filter((p) => p.text)
      const res = await authFetch("/api/grade-batch/paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: batchId.current,
          studentName: paper.name,
          examTitle, className, classPeriod,
          additionalComments: notes,
          markScheme: schemeForGrading,
          pages: imagePages.map((p) => ({ url: p.url, name: p.label })),
          texts: textPages.map((p) => ({ name: p.label, content: p.text })),
        }),
      })
      // Plan blocks and auth errors come back as plain JSON before any streaming.
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}))
        if (isPlanBlock(data)) { stopRef.current = true; openPremium(data); throw new Error(data.error) }
        throw new Error(data.error || "Grading failed")
      }
      let finished = false
      await readNdjson(res.body, (event) => {
        if (event.type === "status") update({ message: String(event.message) })
        else if (event.type === "progress") update({ graded: Number(event.graded), total: event.total == null ? null : Number(event.total), message: undefined })
        else if (event.type === "error") throw new Error(String(event.error || "Grading failed"))
        else if (event.type === "done") {
          finished = true
          setResults((r) => ({ ...r, [paper.key]: { state: "done", id: String(event.id), marks: Number(event.totalMarks), possible: Number(event.totalPossible), percentage: Number(event.percentage), grade: String(event.grade), seconds: (Date.now() - startedAt) / 1000 } }))
        }
      })
      if (!finished) throw new Error("The connection dropped before this paper finished")
    } catch (e) {
      // One automatic retry covers busy-API hiccups; the teacher can retry after that.
      if (attempt === 1 && !stopRef.current) {
        update({ message: "Hit a snag, trying again shortly" })
        await new Promise((r) => setTimeout(r, 5000))
        return gradeOne(paper, 2)
      }
      setResults((r) => ({ ...r, [paper.key]: { state: "error", error: e instanceof Error ? e.message : "Grading failed" } }))
    }
  }

  const gradeAll = async (only?: number[]) => {
    stopRef.current = false
    setPhase("grading")
    setGradingStartedAt(Date.now())
    const queue = papers.filter((p) => (only ? only.includes(p.key) : results[p.key]?.state !== "done"))
    setResults((r) => ({ ...r, ...Object.fromEntries(queue.map((p) => [p.key, { state: "waiting" as const }])) }))
    let next = 0
    const worker = async () => {
      while (next < queue.length && !stopRef.current) await gradeOne(queue[next++])
    }
    // The first paper runs alone so it writes the cached instructions + mark
    // scheme; the rest then read that cache (~10% of the input price).
    if (queue.length > 1) await gradeOne(queue[next++])
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length - next) }, worker))
  }

  const estimate = estimateGradingSeconds(papers.map((p) => p.pages.length), CONCURRENCY)
  // Once papers finish, time the rest from how long these papers actually took per page.
  const secondsPerPage = measuredSecondsPerPage(papers.filter((p) => results[p.key]?.seconds).map((p) => ({ pages: p.pages.length, seconds: results[p.key].seconds! })))
  const remaining = remainingSeconds(
    papers
      .filter((p) => results[p.key]?.state === "waiting" || results[p.key]?.state === "grading")
      .map((p) => ({ pages: p.pages.length, elapsed: results[p.key].startedAt ? (now - results[p.key].startedAt!) / 1000 : 0 })),
    CONCURRENCY,
    secondsPerPage,
  )
  const done = papers.filter((p) => results[p.key]?.state === "done")
  const failed = papers.filter((p) => results[p.key]?.state === "error")
  const running = papers.some((p) => ["waiting", "grading"].includes(results[p.key]?.state ?? ""))

  const downloadCsv = () => {
    const rows = done.map((p) => ({ name: p.name, marks: results[p.key].marks ?? 0, possible: results[p.key].possible ?? 0, percentage: results[p.key].percentage ?? 0, grade: results[p.key].grade ?? "" }))
    const blob = new Blob([resultsCsv(rows)], { type: "text/csv" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `${(examTitle || "class-results").replace(/[^\w-]+/g, "_")}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <Shell>
      {/* 1-3: setup */}
      {(phase === "setup" || phase === "preparing") && (
        <div className="space-y-8">
          <GradingModeSwitch mode="class" />

          <Section n={1} title="Student papers" hint="The whole stack: phone photos in any order of students, scanned PDFs, or one file per student. Names only need to be on the first page.">
            <DropZone files={paperFiles} onFiles={(f) => setPaperFiles((prev) => [...prev, ...f])} onRemove={(i) => setPaperFiles((prev) => prev.filter((_, j) => j !== i))} disabled={phase === "preparing"} big />
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={sortByName} onChange={(e) => setSortByName(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Put pages in file-name order (keeps phone photos in the order you took them)
            </label>
          </Section>

          <Section n={2} title="Mark scheme" hint="A photo, PDF, Word or text file of the answers.">
            {!markFiles.length && <MarkSchemeNudge batch />}
            <DropZone files={markFiles} onFiles={(f) => setMarkFiles((prev) => [...prev, ...f])} onRemove={(i) => setMarkFiles((prev) => prev.filter((_, j) => j !== i))} disabled={phase === "preparing"} />
          </Section>

          <Section n={3} title="Notes for marking" hint="Optional. The exam title, class and period are filled in from the papers next.">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. accept answers without units on Q3" aria-label="Notes for marking" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </Section>

          {error && <p className="flex items-start gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}

          <div className="flex flex-col items-center gap-2">
            <Button onClick={prepareAndSort} disabled={phase === "preparing" || !paperFiles.length} size="lg" className={primaryCta}>
              {phase === "preparing" ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Preparing…</> : <><Scissors className="mr-2 h-5 w-5" /> Sort into students</>}
            </Button>
            <p className="text-sm text-slate-500">{status || "Next you'll check which pages belong to each student before anything is graded."}</p>
          </div>
        </div>
      )}

      {/* 4: check the split, then grade */}
      {(phase === "review" || phase === "grading") && (
        <StepCard className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className={cn(fontDisplay, "text-3xl font-semibold text-slate-900")}>{papers.length} student{papers.length === 1 ? "" : "s"} found</h2>
              <p className="text-sm text-slate-600">
                {pages.length - removed.size} pages. {phase === "review" ? "Check the names and pages, then grade. Use the scissors on a page that starts a new student." : `${done.length} of ${papers.length} graded${failed.length ? `, ${failed.length} failed` : ""}.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {phase === "review" && <Button variant="outline" onClick={() => setPhase("setup")}><RotateCcw className="mr-2 h-4 w-4" />Start over</Button>}
              {phase === "review" && (
                <Button onClick={() => void gradeAll()} disabled={!papers.length || answerKey.status === "drafting"} className="bg-blue-600 hover:bg-blue-700">
                  {answerKey.status === "drafting" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Writing answer key…</> : `Grade ${papers.length} paper${papers.length === 1 ? "" : "s"}`}
                </Button>
              )}
              {phase === "grading" && running && <Button variant="outline" onClick={() => { stopRef.current = true }}>Pause after current papers</Button>}
              {phase === "grading" && !running && failed.length > 0 && <Button variant="outline" onClick={() => void gradeAll(failed.map((p) => p.key))}><RotateCcw className="mr-2 h-4 w-4" />Retry {failed.length} failed</Button>}
              {done.length > 0 && <Button variant="outline" onClick={downloadCsv}><Download className="mr-2 h-4 w-4" />CSV</Button>}
              {done.length > 0 && !running && <Button asChild className="bg-blue-600 hover:bg-blue-700"><Link href={`/grade-exam/batch/${batchId.current}`}>Class results</Link></Button>}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
            <p className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
              Exam details
              {autoFilled && <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800"><Sparkles className="h-3 w-3" />Filled in from the papers, check them</span>}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <TextInput label="Exam title" value={examTitle} onChange={setExamTitle} placeholder="Unit 4 quiz" disabled={phase === "grading"} />
              <TextInput label="Class" value={className} onChange={setClassName} placeholder="AP Chemistry" disabled={phase === "grading"} />
              <TextInput label="Period" value={classPeriod} onChange={setClassPeriod} placeholder="3" disabled={phase === "grading"} />
            </div>
          </div>

          {!hasScheme && answerKey.status !== "none" && (
            <AnswerKeyPanel
              answerKey={answerKey}
              editable={phase === "review"}
              onChange={(text) => setAnswerKey({ status: "ready", text })}
              onRedo={papers[0] ? () => void draftAnswerKey(papers[0].pages.map((i) => pages[i])) : undefined}
            />
          )}

          {phase === "review" && papers.length > 0 && (
            <p className="text-sm text-slate-600">
              Grading should take <span className="font-semibold text-slate-900">{minutes(estimate)}</span> ({papers.length} paper{papers.length === 1 ? "" : "s"}, {CONCURRENCY} at a time, roughly 15 seconds a page). Keep this tab open while it runs.
            </p>
          )}

          {phase === "grading" && (
            <div className="h-2 overflow-hidden rounded-full bg-slate-200" aria-label="Grading progress">
              <div className="h-full bg-blue-600 transition-all" style={{ width: `${(done.length / Math.max(1, papers.length)) * 100}%` }} />
            </div>
          )}
          {phase === "grading" && running && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="font-medium text-slate-700">
                {done.length} of {papers.length} done · {clock(gradingStartedAt ? (now - gradingStartedAt) / 1000 : 0)} so far · <span className="text-slate-900">{minutes(remaining)} left</span>
              </p>
              <p className="text-amber-800">Keep this tab open while it grades.</p>
            </div>
          )}
          {problems.length > 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{problems.join(" ")}</p>}

          <ul className="space-y-3">
            {papers.map((paper, n) => {
              const r = results[paper.key]
              return (
                <li key={paper.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{n + 1}</span>
                    <input
                      value={paper.name}
                      onChange={(e) => setNames((m) => ({ ...m, [paper.key]: e.target.value }))}
                      disabled={phase === "grading"}
                      aria-label="Student name"
                      className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 font-semibold text-slate-900 hover:border-slate-200 focus:border-blue-400 focus:outline-none disabled:bg-transparent"
                    />
                    <PaperBadge status={r} now={now} />
                    {r?.state === "done" && r.id && <Link href={`/grade-report/${r.id}`} target="_blank" className="text-sm font-semibold text-blue-700 hover:underline">Report</Link>}
                    {r?.state === "error" && !running && <button type="button" onClick={() => void gradeAll([paper.key])} className="text-sm font-semibold text-blue-700 hover:underline">Retry</button>}
                  </div>
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {paper.pages.map((i) => (
                      <PageThumb
                        key={i}
                        page={pages[i]}
                        number={i + 1}
                        startsPaper={starts[i]}
                        editable={phase === "review"}
                        onToggleStart={i === paper.pages[0] && n === 0 ? undefined : () => setStarts((s) => s.map((v, j) => (j === i ? !v : v)))}
                        onRemove={() => setRemoved((s) => new Set(s).add(i))}
                      />
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        </StepCard>
      )}
    </Shell>
  )
}

/** Uploads blobs to Cloudinary four at a time, keeping their order. */
async function uploadAll(items: Array<{ blob: Blob; name: string }>, folder: string, onProgress: (n: number, total: number) => void) {
  const out: Array<{ url: string; name: string }> = new Array(items.length)
  let next = 0, finished = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      const up = await ClientCompression.uploadToCloudinary(items[i].blob, folder, items[i].name)
      out[i] = { url: up.url, name: items[i].name }
      onProgress(++finished, items.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, items.length) }, worker))
  return out
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />
      <GradingHero
        title="Grade a whole class"
        accent="in one go"
        subtitle="Drop in the stack. We sort it into students, you check it, then every paper is graded against your mark scheme."
        chips={["Phone photos", "Scanned PDFs", "Names on page 1 only", "Class results", "CSV export"]}
      />
      <main className="container relative mx-auto -mt-28 max-w-5xl px-4 pb-24">{children}</main>
    </div>
  )
}

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <StepCard>
      <StepHeading n={n} title={title} />
      {hint && <p className="-mt-3 mb-4 text-sm text-slate-500">{hint}</p>}
      {children}
    </StepCard>
  )
}

function TextInput({ label, value, onChange, placeholder, disabled }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500" />
    </label>
  )
}

function DropZone({ files, onFiles, onRemove, disabled, big }: { files: File[]; onFiles: (f: File[]) => void; onRemove: (i: number) => void; disabled?: boolean; big?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) onFiles(Array.from(e.dataTransfer.files)) }}
      className={cn("rounded-2xl transition", over && "ring-4 ring-blue-500/20")}
    >
      <KitDropZone label={files.length ? "Add more files" : big ? "Upload the stack" : "Upload the answers"} onBrowse={() => input.current?.click()} hasFiles={files.length > 0} disabled={disabled} compact={!big} />
      <input ref={input} type="file" multiple accept={UPLOAD_ACCEPT} className="hidden" onChange={(e) => { if (e.target.files?.length) onFiles(Array.from(e.target.files)); e.target.value = "" }} />
      <div className={cn(files.length > 6 && "max-h-72 overflow-y-auto pr-1")}>
        <FileList files={files} onRemove={onRemove} disabled={disabled} />
      </div>
    </div>
  )
}

function AnswerKeyPanel({ answerKey, editable, onChange, onRedo }: { answerKey: AnswerKey; editable: boolean; onChange: (text: string) => void; onRedo?: () => void }) {
  return (
    <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold text-amber-900"><KeyRound className="h-4 w-4" />No mark scheme, so here&apos;s an answer key from the first paper</p>
        {editable && onRedo && answerKey.status !== "drafting" && (
          <button type="button" onClick={onRedo} className="text-sm font-semibold text-amber-900 underline-offset-2 hover:underline">Write it again</button>
        )}
      </div>
      <p className="mt-1 text-sm text-amber-800">Every student is marked against this key, so totals match across the class. Check the answers and marks, and fix anything that&apos;s wrong before grading.</p>
      {answerKey.status === "drafting" && (
        <p className="mt-3 flex items-center gap-2 text-sm text-amber-900"><Loader2 className="h-4 w-4 animate-spin" />Reading the questions and working out the answers (about 1 to 2 minutes). Check the pages below meanwhile.</p>
      )}
      {answerKey.status === "error" && (
        <p className="mt-3 text-sm text-rose-800">{answerKey.error} You can try again, or grade without a key (each paper is then marked on its own).</p>
      )}
      {answerKey.status === "ready" && (
        <textarea
          value={answerKey.text}
          onChange={(e) => onChange(e.target.value)}
          readOnly={!editable}
          rows={Math.min(16, Math.max(6, answerKey.text.split("\n").length + 1))}
          aria-label="Answer key"
          className="mt-3 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 font-mono text-[0.8rem] leading-relaxed text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
        />
      )}
    </div>
  )
}

function PageThumb({ page, number, startsPaper, editable, onToggleStart, onRemove }: { page: Page; number: number; startsPaper: boolean; editable: boolean; onToggleStart?: () => void; onRemove: () => void }) {
  return (
    <div className="group relative shrink-0">
      {page.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={page.thumb} alt={`Page ${number}`} className="h-36 w-28 rounded-lg border border-slate-200 object-cover object-top" />
      ) : (
        <div className="flex h-36 w-28 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-2 text-center text-[0.65rem] text-slate-500"><FileText className="h-6 w-6" />{page.label}</div>
      )}
      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[0.65rem] font-semibold text-white">p{number}</span>
      {editable && (
        <div className="absolute right-1 top-1 flex flex-col gap-1">
          {onToggleStart && (
            <button type="button" onClick={onToggleStart} title={startsPaper ? "Join this page to the student before" : "A new student starts on this page"} aria-label={startsPaper ? "Join to previous student" : "New student starts here"} className={cn("rounded-md p-1 shadow", startsPaper ? "bg-blue-600 text-white" : "bg-white/90 text-slate-700 hover:bg-white")}>
              <Scissors className="h-3.5 w-3.5" />
            </button>
          )}
          <button type="button" onClick={onRemove} title="Remove this page" aria-label="Remove page" className="rounded-md bg-white/90 p-1 text-slate-700 shadow hover:bg-white hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      )}
    </div>
  )
}

function PaperBadge({ status, now }: { status?: PaperStatus; now: number }) {
  if (!status) return null
  if (status.state === "waiting") return <span className="text-sm text-slate-400">Waiting</span>
  if (status.state === "grading") {
    const marking = status.graded !== undefined && (status.graded > 0 || status.total)
    const label = status.message
      ?? (marking ? (status.total ? `Marking question ${Math.min(status.graded! + 1, status.total)} of ${status.total}` : `${status.graded} questions marked`) : "Grading")
    const pct = status.total ? Math.round((Math.min(status.graded ?? 0, status.total) / status.total) * 100) : null
    return (
      <span className="inline-flex min-w-[12rem] flex-col gap-1">
        <span className="inline-flex items-center gap-1.5 text-sm text-blue-700">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span className="truncate">{label}</span>
          {status.startedAt && <span className="ml-auto shrink-0 tabular-nums text-xs text-slate-400">{clock((now - status.startedAt) / 1000)}</span>}
        </span>
        {pct !== null && (
          <span className="h-1 overflow-hidden rounded-full bg-blue-100"><span className="block h-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} /></span>
        )}
      </span>
    )
  }
  if (status.state === "error") return <span className="inline-flex items-center gap-1 text-sm text-rose-700" title={status.error}><AlertCircle className="h-4 w-4" />{status.error?.slice(0, 60) ?? "Failed"}</span>
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-sm font-semibold text-emerald-800">
      <CheckCircle2 className="h-4 w-4" />{status.marks}/{status.possible} · {Math.round(status.percentage ?? 0)}% · {status.grade}
    </span>
  )
}

/** Reads a newline-delimited JSON stream, calling `onEvent` for each line. A throw in `onEvent` stops reading. */
async function readNdjson(body: ReadableStream<Uint8Array>, onEvent: (event: Record<string, unknown>) => void) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (value) buffer += decoder.decode(value, { stream: true })
      let nl: number
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim()
        buffer = buffer.slice(nl + 1)
        if (line) onEvent(JSON.parse(line))
      }
      if (done) break
    }
    if (buffer.trim()) onEvent(JSON.parse(buffer))
  } finally {
    reader.releaseLock()
  }
}
