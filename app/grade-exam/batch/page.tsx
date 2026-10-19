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
import { ScaleEditor } from "@/components/grading/report/scale-editor"
import { ScanInboxPanel } from "@/components/grading/scan-inbox-panel"
import { ClassroomWorkPanel } from "@/components/grading/classroom-work-panel"
import { placeStampedPages } from "@/lib/stamped/place"
import { missingPages } from "@/lib/stamped/codes"
import { DEFAULT_SCALE, SCALE_PRESETS, type GradeScale } from "@/lib/grading/scale"
import { usesMarkingStyle, type MarkingStyle } from "@/lib/grading/marking-style"
import { fullName, matchRoster, type RosterName } from "@/lib/grading/names"
import { looksLikeOnePerFile, nameFromFileName, studentNameForFile } from "@/lib/grading/file-names"
import type { RosterRow } from "@/lib/classes/server"
import Link from "next/link"
import { AlertCircle, CheckCircle2, Download, FileText, KeyRound, Loader2, RotateCcw, Scissors, Sparkles, Trash2, UsersRound, X } from "lucide-react"
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

// About 40 students x 11 pages; a 36-student class of 9-page papers is 324.
const MAX_PAGES = 450
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
  const [gradeScale, setGradeScale] = useState<GradeScale | null>(null)
  const [markingStyle, setMarkingStyle] = useState<MarkingStyle>({})
  const [optionsOpen, setOptionsOpen] = useState(false)
  // Start from the teacher's saved defaults (report settings).
  useEffect(() => {
    void (async () => {
      const res = await authFetch("/api/grading/report-settings")
      if (!res.ok) return
      const { settings } = await res.json()
      setGradeScale(settings.defaultScale ?? null)
      setMarkingStyle(settings.markingStyle ?? {})
    })()
  }, [])
  const [markFiles, setMarkFiles] = useState<File[]>([])
  const [paperFiles, setPaperFiles] = useState<File[]>([])
  const [sortByName, setSortByName] = useState(true)
  // null = decide from the file names (looksLikeOnePerFile); the teacher can override.
  const [onePerFileChoice, setOnePerFileChoice] = useState<boolean | null>(null)
  // Files brought in from Google Classroom know whose they are.
  const fileOwners = useRef(new WeakMap<File, string>())

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
  // Typed names, keyed by the page they were typed on (a paper uses the first one
  // among its pages), so re-splitting doesn't lose them.
  const [names, setNames] = useState<Record<number, string>>({})
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

  // Optional class: its roster helps read names and links each paper to a student.
  const [classes, setClasses] = useState<Array<{ id: string; name: string; period: string | null }>>([])
  const [classId, setClassId] = useState("")
  const [roster, setRoster] = useState<RosterRow[]>([])
  const [rosterNotice, setRosterNotice] = useState("")
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [inboxItem, setInboxItem] = useState<string | null>(null)
  // Page open full size on the review screen (index into pages).
  const [viewing, setViewing] = useState<number | null>(null)
  const [onlyToCheck, setOnlyToCheck] = useState(false)
  // Group work: other members of a paper (keyed by the paper's first page), graded once, saved for each.
  const [groups, setGroups] = useState<Record<number, string[]>>({})
  const [groupOpen, setGroupOpen] = useState<Set<number>>(new Set())
  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/classes")
      const data = await res.json().catch(() => ({}))
      if (res.ok) setClasses(data.classes ?? [])
    })()
    const query = new URLSearchParams(window.location.search)
    setInboxItem(query.get("inbox"))
    const fromUrl = query.get("class")
    if (fromUrl) setClassId(fromUrl)
    // ?batch=<id>: add late papers to an existing class set (same title, class and scale).
    const existing = query.get("batch")
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) {
      void (async () => {
        const res = await authFetch(`/api/grade-batch/${existing}`, { cache: "no-store" })
        const data = await res.json().catch(() => ({}))
        const first = data.results?.[0]
        if (!res.ok || !first) return
        batchId.current = existing
        setAddingTo(first.exam_title || "this class set")
        if (first.exam_title) setExamTitle(first.exam_title)
        if (first.class_name) setClassName(first.class_name)
        if (first.class_period) setClassPeriod(first.class_period)
        if (first.grade_scale) setGradeScale(first.grade_scale)
      })()
    }
  }, [])
  const loadRoster = async (id: string) => {
    if (!id) { setRoster([]); return }
    const res = await authFetch(`/api/classes/${id}/roster`, { cache: "no-store" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return
    setRoster(data.roster ?? [])
    if (data.class?.name) setClassName(data.class.name)
    if (data.class?.period) setClassPeriod(data.class.period)
  }
  useEffect(() => { void loadRoster(classId) }, [classId])
  const rosterNames: RosterName[] = useMemo(() => roster.map((r) => ({ id: r.id, firstName: r.firstName, lastName: r.lastName })), [roster])
  const namedFiles = paperFiles.filter((f) => nameFromFileName(f.name)).length
  const onePerFile = onePerFileChoice ?? looksLikeOnePerFile(paperFiles.map((f) => f.name), rosterNames)

  const papers = useMemo(() => {
    return groupPages(starts, headers, removed).map((g) => {
      const name = g.pages.map((i) => names[i]).find((n) => n !== undefined) ?? g.name
      // A stamped copy knows its student, unless the teacher renamed it.
      const stamp = headers[g.pages[0]]?.stamp
      const renamed = g.pages.some((i) => names[i] !== undefined)
      const match: ReturnType<typeof matchRoster> = stamp?.rosterId && !renamed ? { rosterId: stamp.rosterId, score: 1, confidence: "sure" } : matchRoster(name, rosterNames)
      const missing = stamp ? missingPages(g.pages.map((i) => headers[i]?.stamp?.page ?? 0), stamp.total) : []
      const others = (groups[g.pages[0]] ?? []).map((n) => ({ name: n, match: matchRoster(n, rosterNames) }))
      return { ...g, key: g.pages[0], name, match, stamp, missing, others }
    })
  }, [starts, headers, removed, names, rosterNames, groups])

  // Stamped copies from several classes: one class set (and results page) per class.
  const paperClasses = useMemo(() => {
    const seen = new Map<string, string>()
    for (const p of papers) if (p.stamp?.classId) seen.set(p.stamp.classId, [p.stamp.className, p.stamp.classPeriod && `P${p.stamp.classPeriod}`].filter(Boolean).join(" "))
    return seen
  }, [papers])
  const classBatches = useRef(new Map<string, string>())
  const batchFor = (paperClassId: string | null | undefined) => {
    if (paperClasses.size <= 1 || !paperClassId) return batchId.current
    let b = classBatches.current.get(paperClassId)
    if (!b) {
      b = classBatches.current.size === 0 ? batchId.current : crypto.randomUUID()
      classBatches.current.set(paperClassId, b)
    }
    return b
  }

  // Roster checks: two papers for one student, and students with no paper.
  const rosterCheck = useMemo(() => {
    const seen = new Map<string, number>()
    const duplicates = new Set<number>()
    papers.forEach((p) => {
      for (const m of [p.match, ...p.others.map((o) => o.match)]) {
        if (m.confidence !== "sure" || !m.rosterId) continue
        const prev = seen.get(m.rosterId)
        if (prev !== undefined && prev !== p.key) { duplicates.add(prev); duplicates.add(p.key) } else seen.set(m.rosterId, p.key)
      }
    })
    const missing = roster.filter((r) => !seen.has(r.id))
    const unknown = papers.filter((p) => p.match.confidence === "none" && !/^Student \d+$/.test(p.name))
    return { duplicates, missing, unknown }
  }, [papers, roster])

  const addUnknownToRoster = async () => {
    if (!classId || !rosterCheck.unknown.length) return
    const res = await authFetch(`/api/classes/${classId}/roster`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: rosterCheck.unknown.map((p) => p.name).join("\n") }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setRosterNotice(data.error || "Could not add those names"); return }
    setRoster(data.roster ?? [])
    setRosterNotice(`Added ${data.added} name${data.added === 1 ? "" : "s"} to the class.`)
  }

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
      const imagePages: Array<{ blob: Blob; label: string; file: string; fileIndex: number; owner?: string }> = []
      const textPapers: Page[] = []
      const textOwners: Array<string | undefined> = []
      for (const [fileIndex, file] of ordered.entries()) {
        if (imagePages.length >= MAX_PAGES) { issues.push(`Only the first ${MAX_PAGES} pages were used.`); break }
        const prepared = await prepareMaterials([file], { pdfMode: "images", maxImages: MAX_PAGES - imagePages.length, onProgress: setStatus })
        issues.push(...prepared.problems)
        const owner = fileOwners.current.get(file)
        prepared.images.forEach((img) => imagePages.push({ blob: img.blob, label: img.name, file: file.name, fileIndex, owner }))
        // A typed (Word/PowerPoint/text) paper is one student's whole paper.
        prepared.texts.forEach((t) => { textPapers.push({ label: t.name, text: t.content }); textOwners.push(owner) })
      }
      if (!imagePages.length && !textPapers.length) throw new Error("None of the papers could be read. " + issues.join(" "))

      // Name-stamped copies (QR on every page): read the codes here, put each
      // copy's pages together in order, and skip the AI name read for them.
      const stamped = await placeStampedPages(imagePages.map((p) => p.blob), (d) => setStatus(`Looking for name stamps (${d} of ${imagePages.length} pages)...`))
      if (stamped.duplicates) issues.push(`${stamped.duplicates} page${stamped.duplicates === 1 ? " was" : "s were"} scanned twice and left out.`)
      const orderedImages = stamped.order.map((i) => imagePages[i])

      const uploaded = await uploadAll(orderedImages.map((p) => ({ blob: p.blob, name: p.label })), "grading-pages", (n, total) => setStatus(`Uploading page ${n} of ${total}...`))
      const thumbs = orderedImages.map((p) => URL.createObjectURL(p.blob))
      thumbsRef.current.push(...thumbs)

      const imageHeaders: Array<PageHeader | undefined> = stamped.headers.slice()
      // One student per file (files named after students): the name comes from
      // the file, every page of it is that student's, no AI name read needed.
      // Google Classroom uploads: the student who uploaded them; all of one
      // student's photos are one paper.
      orderedImages.forEach((p, i) => {
        if (imageHeaders[i] || !p.owner) return // a name stamp wins
        imageHeaders[i] = { name: p.owner, firstPage: i === 0 || orderedImages[i - 1].owner !== p.owner, fromFile: true, fromClassroom: true }
      })
      if (onePerFile) {
        orderedImages.forEach((p, i) => {
          if (imageHeaders[i]) return // a name stamp wins
          const name = studentNameForFile(p.file, rosterNames)
          if (name) imageHeaders[i] = { name, firstPage: i === 0 || orderedImages[i - 1].fileIndex !== p.fileIndex, fromFile: true }
        })
      }

      // Only pages with no name yet (no stamp, not named after the file) go to the AI header read.
      const unread = uploaded.filter((_, i) => !imageHeaders[i])
      if (unread.length) {
        setStatus(`Finding where each student's paper starts (${unread.length} pages)...`)
        const res = await authFetch("/api/grade-batch/split", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pages: unread, roster: rosterNames.map(fullName) }),
        })
        const data = await res.json().catch(() => ({}))
        if (isPlanBlock(data)) { openPremium(data); setPhase("setup"); return }
        if (!res.ok) throw new Error(data.error || "Could not read the pages")
        let k = 0
        for (let i = 0; i < uploaded.length; i++) if (!imageHeaders[i]) imageHeaders[i] = data.headers[k++]
      }
      // A stack of one class's stamped copies picks that class.
      const stampClasses = [...new Set(imageHeaders.map((h) => h?.stamp?.classId).filter(Boolean))] as string[]
      if (stampClasses.length === 1 && !classId) setClassId(stampClasses[0])

      const allPages: Page[] = [
        ...uploaded.map((u, i) => ({ label: u.name, url: u.url, thumb: thumbs[i] })),
        ...textPapers,
      ]
      const allHeaders: PageHeader[] = [
        ...imageHeaders.map((h) => h ?? { name: null, firstPage: false }),
        ...textPapers.map((t, i) => (textOwners[i] ? { name: textOwners[i]!, firstPage: true, fromFile: true, fromClassroom: true } : { name: t.label.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "), firstPage: true })),
      ]
      // Fill the exam details from the papers (only the boxes the teacher left empty).
      const firsts = allHeaders.filter((h) => h.firstPage)
      const found = { title: mostCommon(firsts.map((h) => h.title)), course: mostCommon(firsts.map((h) => h.course)), period: mostCommon(allHeaders.map((h) => h.period)) }
      if (found.title && !examTitle.trim()) setExamTitle(found.title)
      if (found.course && !className.trim()) setClassName(found.course)
      if (found.period && !classPeriod.trim()) setClassPeriod(found.period)
      setAutoFilled(Boolean((found.title && !examTitle.trim()) || (found.course && !className.trim()) || (found.period && !classPeriod.trim())))

      const startPoints = splitPoints(allHeaders, rosterNames)
      // Stamped pages: a new copy code starts a paper, the same code never does;
      // the first unstamped page after them starts one too.
      allHeaders.forEach((h, i) => {
        if (h.stamp) startPoints[i] = i === 0 || allHeaders[i - 1]?.stamp?.code !== h.stamp.code
        else if (h.fromFile) startPoints[i] = h.firstPage
        else if (i > 0 && (allHeaders[i - 1]?.stamp || allHeaders[i - 1]?.fromFile)) startPoints[i] = true
      })
      setMarkScheme(scheme)
      setPages(allPages)
      setHeaders(allHeaders)
      setStarts(startPoints)
      setRemoved(new Set())
      setNames({})
      setGroups({})
      setGroupOpen(new Set())
      setRosterNotice("")
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
          batchId: batchFor(paper.stamp?.classId),
          studentName: paper.name,
          examTitle,
          className: paperClasses.size > 1 && paper.stamp?.className ? paper.stamp.className : className,
          classPeriod: paperClasses.size > 1 && paper.stamp ? paper.stamp.classPeriod ?? "" : classPeriod,
          additionalComments: notes,
          gradeScale,
          markingStyle,
          classId: paper.stamp?.classId || classId || undefined,
          rosterId: paper.match.confidence === "sure" ? paper.match.rosterId : undefined,
          groupMembers: paper.others.length ? paper.others.map((o) => ({ name: o.name, rosterId: o.match.confidence === "sure" ? o.match.rosterId : null })) : undefined,
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
          {addingTo && <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">Adding late papers to <span className="font-semibold">{addingTo}</span>. They&apos;ll join the same class results. Use the same mark scheme.</p>}

          <Section n={1} title="Student papers" hint="The whole stack: phone photos in any order of students, scanned PDFs, or one file per student. Names only need to be on the first page.">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
              <label htmlFor="batch-class" className="font-medium text-slate-700">Class</label>
              <select id="batch-class" value={classId} onChange={(e) => setClassId(e.target.value)} disabled={phase === "preparing"} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                <option value="">None (type names as you go)</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}{c.period ? ` (P${c.period})` : ""}</option>)}
              </select>
              {classId
                ? <span className="text-slate-500">{roster.length} name{roster.length === 1 ? "" : "s"} on the roster; papers are matched to them.</span>
                : <Link href="/teacher/classes" className="text-blue-700 hover:underline">{classes.length ? "Manage classes" : "Add a class list"}</Link>}
            </div>
            <ClassroomWorkPanel
              disabled={phase === "preparing"}
              onFiles={({ files, owners, classId: linked, title }) => {
                owners.forEach((who, f) => fileOwners.current.set(f, who))
                setPaperFiles((prev) => [...prev, ...files])
                if (linked && !classId) setClassId(linked)
                if (!examTitle.trim()) setExamTitle(title)
              }}
            />
            <ScanInboxPanel onFiles={(f) => setPaperFiles((prev) => [...prev, ...f])} openItemId={inboxItem} disabled={phase === "preparing"} />
            <DropZone files={paperFiles} onFiles={(f) => setPaperFiles((prev) => [...prev, ...f])} onRemove={(i) => setPaperFiles((prev) => prev.filter((_, j) => j !== i))} disabled={phase === "preparing"} big />
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={sortByName} onChange={(e) => setSortByName(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Put pages in file-name order (keeps phone photos in the order you took them)
            </label>
            {namedFiles > 0 && (
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={onePerFile} onChange={(e) => setOnePerFileChoice(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                Each file is one student&apos;s paper, named after them ({namedFiles} of {paperFiles.length} file{paperFiles.length === 1 ? "" : "s"} look like names, e.g. &quot;Mya.pdf&quot;)
              </label>
            )}
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
              {done.length > 0 && !running && paperClasses.size <= 1 && <Button asChild className="bg-blue-600 hover:bg-blue-700"><Link href={`/grade-exam/batch/${batchId.current}`}>Class results</Link></Button>}
              {done.length > 0 && !running && paperClasses.size > 1 && [...paperClasses.entries()].map(([cid, label]) => (
                <Button key={cid} asChild className="bg-blue-600 hover:bg-blue-700"><Link href={`/grade-exam/batch/${batchFor(cid)}`}>{label || "Class"} results</Link></Button>
              ))}
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
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span>
                Grading: <span className="font-medium text-slate-800">{SCALE_PRESETS[(gradeScale ?? DEFAULT_SCALE).preset].label}</span>
                {usesMarkingStyle(markingStyle) && <> · {[markingStyle.codes && "mark types", markingStyle.levels && "levels", markingStyle.ao && "AOs"].filter(Boolean).join(", ")}</>}
              </span>
              {phase === "review" && <button type="button" onClick={() => setOptionsOpen((o) => !o)} className="font-semibold text-blue-700 hover:underline">{optionsOpen ? "Done" : "Change"}</button>}
            </div>
            {optionsOpen && phase === "review" && (
              <div className="mt-3 grid gap-4 rounded-xl bg-white p-4 ring-1 ring-slate-200 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Grade scale</p>
                  <ScaleEditor value={gradeScale} onChange={setGradeScale} compact />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Exam-board marking (optional)</p>
                  {([["codes", "Mark types (M1, A1, B1)"], ["levels", "Levels of response"], ["ao", "Assessment objectives (AO1, AO2...)"]] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 py-1 text-sm text-slate-700">
                      <input type="checkbox" checked={!!markingStyle[key]} onChange={(e) => setMarkingStyle((m) => ({ ...m, [key]: e.target.checked }))} className="h-4 w-4 rounded border-slate-300" />
                      {label}
                    </label>
                  ))}
                  <p className="mt-1 text-xs text-slate-500">For AICE, A Level and similar. The grader records these on every question where they apply.</p>
                </div>
              </div>
            )}
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
              Grading should take <span className="font-semibold text-slate-900">{minutes(estimate)}</span> ({papers.length} paper{papers.length === 1 ? "" : "s"}, {CONCURRENCY} at a time, roughly a minute for a 9-page paper). Keep this tab open while it runs.
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

          {classId && roster.length > 0 && (rosterCheck.missing.length > 0 || rosterCheck.duplicates.size > 0 || rosterCheck.unknown.length > 0) && (
            <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-sm ring-1 ring-inset ring-slate-200">
              {rosterCheck.duplicates.size > 0 && <p className="text-amber-800">Two or more papers have the same student. Check the highlighted names.</p>}
              {rosterCheck.missing.length > 0 && (
                <p className="text-slate-700">
                  <span className="font-medium">No paper for {rosterCheck.missing.length}:</span> {rosterCheck.missing.map((r) => fullName(r)).join(", ")}
                </p>
              )}
              {rosterCheck.unknown.length > 0 && (
                <p className="text-slate-700">
                  {rosterCheck.unknown.length} name{rosterCheck.unknown.length === 1 ? " isn't" : "s aren't"} on the roster.{" "}
                  <button type="button" onClick={() => void addUnknownToRoster()} className="font-semibold text-blue-700 hover:underline">Add {rosterCheck.unknown.length === 1 ? "it" : "them"} to the class</button>
                </p>
              )}
              {rosterNotice && <p className="text-slate-600">{rosterNotice}</p>}
            </div>
          )}
          <datalist id="roster-names">{roster.map((r) => <option key={r.id} value={fullName(r)} />)}</datalist>

          {/* How the names stand: matched / to check / needing a name. */}
          {papers.length > 0 && (() => {
            const counts = { sure: 0, check: 0, none: 0 }
            papers.forEach((p) => { counts[paperMatchState(p, roster.length > 0)] += 1 })
            const toCheck = counts.check + counts.none
            return (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 text-sm ring-1 ring-slate-200">
                {roster.length > 0 ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-800"><CheckCircle2 className="h-4 w-4" />{counts.sure} matched</span>
                    {counts.check > 0 && <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-800">{counts.check} to check</span>}
                    {counts.none > 0 && <span className="rounded-full bg-rose-50 px-3 py-1 font-medium text-rose-800">{counts.none} need{counts.none === 1 ? "s" : ""} a name</span>}
                  </>
                ) : (
                  <span className="text-slate-600">No class picked, so names aren&apos;t checked against a class list.</span>
                )}
                {toCheck > 0 && roster.length > 0 && (
                  <label className="ml-auto flex items-center gap-2 text-slate-600">
                    <input type="checkbox" checked={onlyToCheck} onChange={(e) => setOnlyToCheck(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                    Show only the ones to check
                  </label>
                )}
              </div>
            )
          })()}

          <ul className="space-y-3">
            {papers.map((paper, n) => {
              const state = paperMatchState(paper, roster.length > 0)
              if (onlyToCheck && state === "sure") return null
              const r = results[paper.key]
              const row = roster.find((x) => x.id === paper.match.rosterId)
              const duplicate = rosterCheck.duplicates.has(paper.key)
              const tone = duplicate ? STATE_TONE.check : STATE_TONE[state]
              return (
                <li key={paper.key} className={cn("overflow-hidden rounded-2xl border bg-white shadow-sm", tone.border)}>
                  <div className={cn("flex flex-wrap items-center gap-3 border-l-4 px-4 py-3", tone.edge, tone.bg)}>
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold", tone.avatar)} aria-hidden>
                      {state === "sure" && paper.name ? initials(paper.name) : n + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <input
                        value={paper.name}
                        onChange={(e) => setNames((m) => ({ ...m, [paper.key]: e.target.value }))}
                        disabled={phase === "grading"}
                        aria-label={`Student ${n + 1} name`}
                        list={roster.length ? "roster-names" : undefined}
                        placeholder="Type or pick the student's name"
                        className="w-full rounded-lg border border-transparent bg-transparent px-1.5 py-0.5 text-base font-semibold text-slate-900 hover:border-slate-200 hover:bg-white focus:border-blue-400 focus:bg-white focus:outline-none disabled:hover:border-transparent"
                      />
                      <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 px-1.5 text-xs", tone.text)}>
                        {duplicate ? (
                          <span className="font-medium">Same student as another paper: check the name</span>
                        ) : state === "sure" ? (
                          <span className="inline-flex items-center gap-1 font-medium"><CheckCircle2 className="h-3.5 w-3.5" />Matched to the class list{row?.studentNumber ? ` · ID ${row.studentNumber}` : ""}</span>
                        ) : state === "check" && row ? (
                          <span className="inline-flex items-center gap-2 font-medium">
                            Is this {fullName(row)}?
                            <button type="button" disabled={phase === "grading"} onClick={() => setNames((m) => ({ ...m, [paper.key]: fullName(row) }))} className="rounded-md bg-amber-600 px-2 py-0.5 font-semibold text-white hover:bg-amber-700">Yes</button>
                          </span>
                        ) : state === "none" && roster.length > 0 ? (
                          <span className="inline-flex flex-wrap items-center gap-1.5 font-medium">
                            {/^Student \d+$/.test(paper.name) ? "Needs a name: open page 1 to read it" : "Not on the class list"}
                            {/* The class-list names with no paper yet are the likely ones. */}
                            {rosterCheck.missing.length > 0 && rosterCheck.missing.length <= 4 && phase === "review" && (
                              <>
                                <span className="text-slate-500">· No paper yet:</span>
                                {rosterCheck.missing.map((m) => (
                                  <button key={m.id} type="button" onClick={() => setNames((x) => ({ ...x, [paper.key]: fullName(m) }))} className="rounded-md bg-white px-2 py-0.5 font-semibold text-slate-800 ring-1 ring-slate-300 hover:bg-blue-50 hover:text-blue-800">{fullName(m)}</button>
                                ))}
                              </>
                            )}
                          </span>
                        ) : (
                          <span>{paper.pages.length} page{paper.pages.length === 1 ? "" : "s"}</span>
                        )}
                        {roster.length > 0 && <span className="text-slate-400">· {paper.pages.length} page{paper.pages.length === 1 ? "" : "s"}</span>}
                        {paper.stamp && <span className="rounded-full bg-white/80 px-2 py-0.5 font-medium text-emerald-700 ring-1 ring-emerald-200">Name stamp{paperClasses.size > 1 && paper.stamp.className ? ` · ${paperClasses.get(paper.stamp.classId ?? "")}` : ""}</span>}
                        {headers[paper.key]?.fromFile && !paper.stamp && <span className="rounded-full bg-white/80 px-2 py-0.5 font-medium text-sky-700 ring-1 ring-sky-200">{headers[paper.key]?.fromClassroom ? "From Google Classroom" : "From file name"}</span>}
                        {paper.missing.length > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">Missing page{paper.missing.length === 1 ? "" : "s"} {paper.missing.join(", ")}</span>}
                        {phase === "review" && !groupOpen.has(paper.key) && !paper.others.length && (
                          <button type="button" onClick={() => setGroupOpen((s) => new Set(s).add(paper.key))} className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 font-medium text-slate-600 ring-1 ring-slate-200 hover:text-blue-700 hover:ring-blue-300"><UsersRound className="h-3 w-3" />Group work?</button>
                        )}
                      </p>
                      {(groupOpen.has(paper.key) || paper.others.length > 0) && (
                        <GroupMembers
                          first={paper.name}
                          others={paper.others}
                          editable={phase === "review"}
                          rosterList={roster.length ? "roster-names" : undefined}
                          onChange={(list) => setGroups((g) => ({ ...g, [paper.key]: list }))}
                          onClose={() => { setGroups((g) => ({ ...g, [paper.key]: [] })); setGroupOpen((s) => { const n = new Set(s); n.delete(paper.key); return n }) }}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <PaperBadge status={r} now={now} />
                      {r?.state === "done" && r.id && <Link href={`/grade-report/${r.id}`} target="_blank" className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-blue-700 ring-1 ring-slate-200 hover:bg-blue-50">Report</Link>}
                      {r?.state === "error" && !running && <button type="button" onClick={() => void gradeAll([paper.key])} className="text-sm font-semibold text-blue-700 hover:underline">Retry</button>}
                    </div>
                  </div>
                  <div className="flex gap-2 overflow-x-auto px-4 py-3">
                    {paper.pages.map((i, k) => (
                      <PageThumb
                        key={i}
                        page={pages[i]}
                        number={i + 1}
                        firstOfPaper={k === 0}
                        startsPaper={starts[i]}
                        editable={phase === "review"}
                        onToggleStart={i === paper.pages[0] && n === 0 ? undefined : () => setStarts((s) => s.map((v, j) => (j === i ? !v : v)))}
                        onRemove={() => setRemoved((s) => new Set(s).add(i))}
                        onOpen={() => setViewing(i)}
                      />
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
          {viewing !== null && (
            <PageViewer
              index={viewing}
              pages={pages}
              order={papers.flatMap((p) => p.pages)}
              paper={papers.find((p) => p.pages.includes(viewing))}
              paperNumber={papers.findIndex((p) => p.pages.includes(viewing)) + 1}
              startsPaper={starts[viewing]}
              editable={phase === "review"}
              rosterList={roster.length ? "roster-names" : undefined}
              onName={(key, name) => setNames((m) => ({ ...m, [key]: name }))}
              onToggleStart={viewing === papers[0]?.pages[0] ? undefined : () => setStarts((s) => s.map((v, j) => (j === viewing ? !v : v)))}
              onRemove={() => { setRemoved((s) => new Set(s).add(viewing)); setViewing(null) }}
              onGo={setViewing}
              onClose={() => setViewing(null)}
            />
          )}
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

/** Group work on a paper: the members graded with it (first = the paper's name). */
function GroupMembers({ first, others, editable, rosterList, onChange, onClose }: {
  first: string
  others: Array<{ name: string; match: ReturnType<typeof matchRoster> }>
  editable: boolean
  rosterList?: string
  onChange: (names: string[]) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState("")
  const add = () => {
    const name = draft.trim()
    if (!name || name.toLowerCase() === first.toLowerCase() || others.some((o) => o.name.toLowerCase() === name.toLowerCase())) { setDraft(""); return }
    onChange([...others.map((o) => o.name), name])
    setDraft("")
  }
  return (
    <div className="mt-2 rounded-xl bg-white/90 px-2.5 py-2 ring-1 ring-indigo-200">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-indigo-800">
        <UsersRound className="h-3.5 w-3.5" />Group work: graded once, a report for each member
        {editable && <button type="button" onClick={onClose} className="ml-auto font-medium text-slate-500 hover:text-rose-700">Not a group</button>}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-900">{first || "This paper"}</span>
        {others.map((o) => (
          <span key={o.name} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", o.match.confidence === "sure" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900")} title={o.match.confidence === "sure" ? "On the class list" : "Not matched to the class list"}>
            {o.name}
            {editable && <button type="button" onClick={() => onChange(others.filter((x) => x.name !== o.name).map((x) => x.name))} aria-label={`Remove ${o.name}`} className="text-slate-400 hover:text-rose-600"><X className="h-3 w-3" /></button>}
          </span>
        ))}
        {editable && (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
            onBlur={add}
            list={rosterList}
            placeholder={others.length ? "Add another member" : "Add a group member"}
            aria-label="Add a group member"
            className="min-w-[10rem] flex-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs focus:border-blue-400 focus:outline-none"
          />
        )}
      </div>
    </div>
  )
}

type MatchState = "sure" | "check" | "none"

/** Where a paper's name stands against the class list (stamps and confident matches are "sure"). */
function paperMatchState(paper: { match: ReturnType<typeof matchRoster>; stamp?: unknown }, hasRoster: boolean): MatchState {
  if (!hasRoster) return "none"
  if (paper.stamp || paper.match.confidence === "sure") return "sure"
  return paper.match.confidence === "check" ? "check" : "none"
}

const STATE_TONE: Record<MatchState, { border: string; edge: string; bg: string; avatar: string; text: string }> = {
  sure: { border: "border-emerald-200", edge: "border-l-emerald-500", bg: "bg-emerald-50/50", avatar: "bg-emerald-600 text-white", text: "text-emerald-800" },
  check: { border: "border-amber-200", edge: "border-l-amber-500", bg: "bg-amber-50/60", avatar: "bg-amber-500 text-white", text: "text-amber-900" },
  none: { border: "border-slate-200", edge: "border-l-rose-400", bg: "bg-rose-50/40", avatar: "bg-slate-200 text-slate-700", text: "text-rose-800" },
}

const initials = (name: string) => name.split(/[\s,]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("")

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />
      <GradingHero
        title="Grade a whole class"
        accent="in one go"
        subtitle="Drop in the stack. We sort it into students, you check it, then every paper is graded against your mark scheme."
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

function PageThumb({ page, number, firstOfPaper = false, startsPaper, editable, onToggleStart, onRemove, onOpen }: { page: Page; number: number; firstOfPaper?: boolean; startsPaper: boolean; editable: boolean; onToggleStart?: () => void; onRemove: () => void; onOpen?: () => void }) {
  return (
    <div className="group relative shrink-0">
      {page.thumb ? (
        <button type="button" onClick={onOpen} className="block cursor-zoom-in rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" aria-label={`Open page ${number} full size`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.thumb} alt={`Page ${number}`} className={cn("h-40 w-32 rounded-lg border object-cover object-top shadow-sm transition hover:shadow-md", firstOfPaper ? "border-slate-300" : "border-slate-200")} />
        </button>
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

/**
 * A page full size, to read a name or check a split: the student's name box
 * beside it, previous/next page (arrow keys too), split and remove.
 */
function PageViewer({ index, pages, order, paper, paperNumber, startsPaper, editable, rosterList, onName, onToggleStart, onRemove, onGo, onClose }: {
  index: number
  pages: Page[]
  order: number[]
  paper: { key: number; name: string } | undefined
  paperNumber: number
  startsPaper: boolean
  editable: boolean
  rosterList?: string
  onName: (paperKey: number, name: string) => void
  onToggleStart?: () => void
  onRemove: () => void
  onGo: (index: number) => void
  onClose: () => void
}) {
  const pos = order.indexOf(index)
  const prev = pos > 0 ? order[pos - 1] : null
  const next = pos >= 0 && pos < order.length - 1 ? order[pos + 1] : null
  const [zoom, setZoom] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return }
      if ((e.target as HTMLElement)?.tagName === "INPUT") return // arrows move the cursor while typing a name
      if (e.key === "ArrowLeft" && prev !== null) onGo(prev)
      else if (e.key === "ArrowRight" && next !== null) onGo(next)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [prev, next, onGo, onClose])

  const page = pages[index]
  return (
    <div className="fixed inset-0 z-50 flex bg-slate-900/80 p-2 sm:p-6" role="dialog" aria-modal="true" aria-label={`Page ${index + 1}`} onClick={onClose}>
      <div className="mx-auto flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl lg:flex-row" onClick={(e) => e.stopPropagation()}>
        <div className={cn("min-h-0 flex-1 overflow-auto bg-slate-100", zoom ? "cursor-zoom-out" : "cursor-zoom-in")} onClick={() => setZoom((z) => !z)}>
          {page?.thumb
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={page.thumb} alt={`Page ${index + 1}`} className={cn("mx-auto", zoom ? "w-[200%] max-w-none" : "max-h-[85vh] w-auto")} />
            : <p className="p-8 text-sm text-slate-600">{page?.label}</p>}
        </div>
        <div className="w-full shrink-0 space-y-4 border-t border-slate-200 p-4 lg:w-72 lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Page {index + 1} · student {paperNumber}</p>
            <button type="button" onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="h-4 w-4" /></button>
          </div>
          {paper && (
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-slate-600">Student name</span>
              <input
                value={paper.name}
                onChange={(e) => onName(paper.key, e.target.value)}
                disabled={!editable}
                list={rosterList}
                autoFocus={editable}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 font-semibold text-slate-900 focus:border-blue-400 focus:outline-none"
              />
            </label>
          )}
          {editable && (
            <div className="space-y-2 text-sm">
              {onToggleStart && (
                <button type="button" onClick={onToggleStart} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 font-medium", startsPaper ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}>
                  <Scissors className="h-4 w-4" />{startsPaper ? "A new student starts here" : "Start a new student here"}
                </button>
              )}
              <button type="button" onClick={onRemove} className="flex w-full items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" />Remove this page</button>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={prev === null} onClick={() => prev !== null && onGo(prev)}>← Previous</Button>
            <Button variant="outline" className="flex-1" disabled={next === null} onClick={() => next !== null && onGo(next)}>Next →</Button>
          </div>
          <p className="text-xs text-slate-500">Click the page to zoom. Arrow keys move between pages.</p>
        </div>
      </div>
    </div>
  )
}
