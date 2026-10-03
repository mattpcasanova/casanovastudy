"use client"

import type React from "react"
import { forwardRef, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  X,
  RotateCcw,
  FileText,
  FileImage,
  File as FileIcon,
  Loader2,
  AlertCircle,
  List,
  CreditCard,
  HelpCircle,
  ScrollText,
  Sparkles,
  Upload,
  PenLine,
  Puzzle,
  Lightbulb,
  GraduationCap,
  Trophy,
  Briefcase,
  BadgeCheck,
  Compass,
  Map as MapIcon,
  History,
  ChevronDown,
  Check,
  PenSquare,
  ArrowRight,
  Crown,
  LineChart,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import type { StudyGuideData } from "@/types"
import { supabase } from "@/lib/supabase"
import { extractMaterialExcerpt } from "@/lib/material-excerpt"
import { SUBJECTS, LEVEL_GROUPS, GOALS, type StudyGoal, type MaterialsKind } from "@/lib/study-options"
import { parsePlan, unitStudyRequest } from "@/lib/formats/plan"
import { takePrefill } from "@/lib/prefill"
import { useAuth } from "@/lib/auth"
import { visualsRelevant } from "@/lib/formats/figures"
import { DIFFICULTY_FORMATS, type GuideDifficulty } from "@/lib/study-options"
import { PLAN_LIMITS, isFreeFormat, premiumOnlyReason } from "@/lib/plan-rules"
import { formatReset, usePlan } from "@/components/plan/plan-provider"
import VisualsInfo from "@/components/visuals-info"

const VISUALS_PREF_KEY = "cs:pref:visuals"

type GuideLength = "short" | "medium" | "long"
const LENGTH_OPTIONS: { value: GuideLength; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
]
// What each length means for the chosen format (matches LENGTH_TARGETS in lib/claude-api.ts).
const LENGTH_HINTS: Record<string, Record<GuideLength, string>> = {
  outline: { short: "~2 min read", medium: "~6 min read", long: "~12 min read" },
  summary: { short: "~2 min read", medium: "~6 min read", long: "~12 min read" },
  quiz: { short: "8 questions", medium: "12-18 questions", long: "25-30 questions" },
  flashcards: { short: "15-20 cards", medium: "30-50 cards", long: "60-80 cards" },
  practice: { short: "8-10 activities", medium: "14-20 activities", long: "25-30 activities" },
  cheatsheet: { short: "5-7 boxes", medium: "8-14 boxes", long: "14-18 boxes" },
  timeline: { short: "8-12 events", medium: "14-24 events", long: "25-35 events" },
  plan: { short: "4-6 units", medium: "6-14 units", long: "12-20 units" },
}
const LENGTH_GENERIC: Record<GuideLength, string> = { short: "Quick review", medium: "Standard", long: "In depth" }

// Question difficulty (DIFFICULTY rules in lib/claude-api.ts). Separate from
// grade level, which describes the learner rather than the questions.
const DIFFICULTY_OPTIONS: { value: GuideDifficulty; label: string; hint: string; examHint: string }[] = [
  { value: "easier", label: "Easier", hint: "Build confidence", examHint: "Build confidence" },
  { value: "standard", label: "Standard", hint: "Typical test", examHint: "Like the real test" },
  { value: "hard", label: "Hard", hint: "Challenge me", examHint: "Its toughest" },
]

interface UploadPageProps {
  onGenerateStudyGuide: (data: StudyGuideData) => void
  isGenerating: boolean
}

type FormatValue = "outline" | "flashcards" | "quiz" | "summary" | "practice" | "plan" | "cheatsheet" | "timeline"

// Class strings are literal so Tailwind's scanner keeps them.
const FORMATS: Array<{
  value: FormatValue
  icon: typeof List
  label: string
  desc: string
  selected: string
  iconIdle: string
  iconOn: string
  badge?: string
  preview: React.ReactNode
}> = [
  {
    value: "outline",
    icon: List,
    label: "Outline",
    desc: "Organized topics you check off as you review",
    selected: "border-blue-500 ring-4 ring-blue-500/15 bg-blue-50/50",
    iconIdle: "bg-blue-100 text-blue-700",
    iconOn: "bg-blue-600 text-white",
    preview: (
      <div className="space-y-1.5">
        {[70, 55, 62].map((w, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-full border-2", i === 0 ? "border-blue-500 bg-blue-500" : "border-blue-300")} />
            <span className="h-1.5 rounded-full bg-blue-200" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    ),
  },
  {
    value: "flashcards",
    icon: CreditCard,
    label: "Flashcards",
    desc: "Flip cards in decks, track what you've mastered",
    selected: "border-indigo-500 ring-4 ring-indigo-500/15 bg-indigo-50/50",
    iconIdle: "bg-indigo-100 text-indigo-700",
    iconOn: "bg-indigo-600 text-white",
    preview: (
      <div className="relative h-9">
        <div className="absolute left-3 top-0 h-8 w-[70%] rotate-[-4deg] rounded-md border border-indigo-200 bg-white" />
        <div className="absolute left-5 top-1 flex h-8 w-[70%] items-center justify-center rounded-md border border-indigo-300 bg-white shadow-sm">
          <span className="h-1.5 w-1/2 rounded-full bg-indigo-300" />
        </div>
      </div>
    ),
  },
  {
    value: "quiz",
    icon: HelpCircle,
    label: "Quiz",
    desc: "Practice questions with instant feedback",
    selected: "border-purple-500 ring-4 ring-purple-500/15 bg-purple-50/50",
    iconIdle: "bg-purple-100 text-purple-700",
    iconOn: "bg-purple-600 text-white",
    preview: (
      <div className="space-y-1">
        {["A", "B", "C"].map((l, i) => (
          <div key={l} className={cn("flex items-center gap-1.5 rounded border px-1.5 py-0.5", i === 1 ? "border-emerald-300 bg-emerald-50" : "border-purple-200 bg-white")}>
            <span className="text-[0.55rem] font-bold text-purple-400">{l}</span>
            <span className={cn("h-1 rounded-full", i === 1 ? "w-3/5 bg-emerald-300" : "w-1/2 bg-purple-200")} />
          </div>
        ))}
      </div>
    ),
  },
  {
    value: "summary",
    icon: ScrollText,
    label: "Summary",
    desc: "A clean, readable write-up of the key ideas",
    selected: "border-green-500 ring-4 ring-green-500/15 bg-green-50/50",
    iconIdle: "bg-green-100 text-green-700",
    iconOn: "bg-green-600 text-white",
    preview: (
      <div className="space-y-1.5">
        <span className="block h-2 w-2/5 rounded-full bg-green-300" />
        {[92, 85, 60].map((w, i) => (
          <span key={i} className="block h-1.5 rounded-full bg-green-100" style={{ width: `${w}%` }} />
        ))}
      </div>
    ),
  },
  {
    value: "practice",
    icon: Puzzle,
    label: "Practice",
    desc: "Match, fill in blanks, sort and order for hands-on review",
    selected: "border-orange-500 ring-4 ring-orange-500/15 bg-orange-50/50",
    iconIdle: "bg-orange-100 text-orange-700",
    iconOn: "bg-orange-500 text-white",
    badge: "New",
    preview: (
      <div className="grid grid-cols-2 gap-1.5">
        {[0, 1].map((r) => (
          <div key={r} className="contents">
            <span className={cn("h-3 rounded border", r === 0 ? "border-emerald-300 bg-emerald-100" : "border-orange-300 bg-orange-100")} />
            <span className={cn("h-3 rounded border", r === 0 ? "border-emerald-300 bg-emerald-100" : "border-orange-200 bg-white")} />
          </div>
        ))}
        <span className="col-span-2 h-1.5 w-3/4 rounded-full bg-orange-200" />
      </div>
    ),
  },
  {
    value: "plan",
    icon: MapIcon,
    label: "Study plan",
    desc: "Break a big goal like the SAT or an interview into units",
    selected: "border-teal-500 ring-4 ring-teal-500/15 bg-teal-50/50",
    iconIdle: "bg-teal-100 text-teal-700",
    iconOn: "bg-teal-600 text-white",
    badge: "New",
    preview: (
      <div className="relative space-y-1.5 pl-3">
        <span className="absolute bottom-1 left-[3px] top-1 w-0.5 rounded bg-teal-200" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="relative flex items-center gap-1.5">
            <span className={cn("absolute -left-3 h-2 w-2 rounded-full", i === 0 ? "bg-emerald-500" : i === 1 ? "bg-teal-500" : "bg-teal-200")} />
            <span className={cn("h-1.5 rounded-full", i === 1 ? "w-4/5 bg-teal-300" : "w-3/5 bg-teal-100")} />
          </div>
        ))}
      </div>
    ),
  },
  {
    value: "cheatsheet",
    icon: FileText,
    label: "Cheat sheet",
    desc: "Every formula, rule and key fact on one printable page",
    selected: "border-slate-600 ring-4 ring-slate-500/15 bg-slate-50",
    iconIdle: "bg-slate-200 text-slate-700",
    iconOn: "bg-slate-800 text-white",
    badge: "New",
    preview: (
      <div className="grid grid-cols-3 gap-1">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={cn("space-y-0.5 rounded border-t-2 bg-white p-0.5", i === 1 ? "border-t-sky-400" : i === 4 ? "border-t-rose-400" : "border-t-slate-500")}>
            <span className="block h-0.5 w-4/5 rounded-full bg-slate-300" />
            <span className="block h-0.5 w-3/5 rounded-full bg-slate-200" />
          </div>
        ))}
      </div>
    ),
  },
  {
    value: "timeline",
    icon: History,
    label: "Timeline",
    desc: "Key events in order, with why each one mattered",
    selected: "border-fuchsia-500 ring-4 ring-fuchsia-500/15 bg-fuchsia-50/50",
    iconIdle: "bg-fuchsia-100 text-fuchsia-700",
    iconOn: "bg-fuchsia-600 text-white",
    badge: "New",
    preview: (
      <div className="relative flex h-9 items-center">
        <span className="absolute inset-x-1 top-1/2 h-0.5 -translate-y-1/2 rounded bg-fuchsia-200" />
        <div className="relative flex w-full justify-between px-1">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cn("h-2.5 w-2.5 rounded-full ring-2 ring-white", i === 2 ? "bg-fuchsia-600" : "bg-fuchsia-300")} />
          ))}
        </div>
      </div>
    ),
  },
]

const GOAL_ICONS: Record<StudyGoal, typeof GraduationCap> = {
  class: GraduationCap,
  exam: Trophy,
  interview: Briefcase,
  certification: BadgeCheck,
  learning: Compass,
}

const EXAMPLES = [
  "Photosynthesis and cellular respiration",
  "SAT Math: linear equations and functions",
  "Coding interview: arrays, hashing, and two pointers",
  "Spanish preterite vs. imperfect",
  "AWS Cloud Practitioner basics",
]


// "photosynthesis and cellular respiration…" → "Photosynthesis and Cellular Respiration"
function deriveTitle(studyRequest: string, files: File[]): string {
  const firstLine = studyRequest.split("\n").map((l) => l.trim()).find(Boolean)
  if (firstLine) {
    const short = firstLine.length > 60 ? `${firstLine.slice(0, 57).replace(/\s+\S*$/, "")}…` : firstLine
    return short.charAt(0).toUpperCase() + short.slice(1)
  }
  if (files[0]) return files[0].name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim()
  return "Study Guide"
}

export default function UploadPageRedesigned({ onGenerateStudyGuide, isGenerating }: UploadPageProps) {
  const [files, setFiles] = useState<File[]>([])
  const [studyRequest, setStudyRequest] = useState("")
  const [studyGuideName, setStudyGuideName] = useState("")
  const [subject, setSubject] = useState("")
  const [gradeLevel, setGradeLevel] = useState("")
  const [format, setFormat] = useState<FormatValue | "">("")
  const [topicFocus, setTopicFocus] = useState("")
  const [goal, setGoal] = useState<StudyGoal | "">("")
  const [strictSources, setStrictSources] = useState(true)
  const [length, setLength] = useState<GuideLength>("medium")
  const [difficulty, setDifficulty] = useState<GuideDifficulty>("standard")
  // Graphs/models on by default; the last choice is remembered on this device.
  const [visuals, setVisualsState] = useState(true)
  const setVisuals = (on: boolean) => {
    setVisualsState(on)
    try { localStorage.setItem(VISUALS_PREF_KEY, on ? "on" : "off") } catch { /* storage unavailable */ }
  }
  useEffect(() => {
    try { if (localStorage.getItem(VISUALS_PREF_KEY) === "off") setVisualsState(false) } catch { /* storage unavailable */ }
  }, [])
  const [materialsKind, setMaterialsKind] = useState<MaterialsKind | null>(null)
  // Set when arriving from a study plan's "Create this guide" (/?plan=…&unit=…).
  const [planLink, setPlanLink] = useState<{ planId: string; unitKey: string; planTitle: string; unitNumber: number; unitTitle: string } | null>(null)
  // Why the user landed here with things filled in (plan unit, missed-quiz
  // review, new account) — shown as a banner so it never looks like a plain reset.
  const [arrival, setArrival] = useState<Arrival | null>(null)
  const arrivalRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const { plan, isPremium, openPremium } = usePlan()
  const freeGuides = plan && !isPremium ? plan.usage.guide : null
  const freeGuidesLeft = freeGuides ? Math.max(0, freeGuides.limit - freeGuides.used) : null

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("welcome")) {
      setArrival({ kind: "welcome" })
      window.history.replaceState(null, "", "/")
      return
    }
    if (params.get("from") !== "prefill") return
    const p = takePrefill()
    window.history.replaceState(null, "", "/")
    if (!p) return
    setStudyRequest(p.studyRequest)
    setStudyGuideName(p.studyGuideName)
    setFormat(p.format as FormatValue)
    if (p.subject && p.subject !== "general") setSubject(p.subject)
    if (p.gradeLevel && p.gradeLevel !== "general") setGradeLevel(p.gradeLevel)
    setArrival({ kind: "missed", sourceTitle: p.sourceTitle, detail: p.detail })
  }, [])

  // Bring the banner into view once something arrives.
  useEffect(() => {
    if (arrival && arrival.kind !== "welcome") {
      const t = setTimeout(() => {
        const el = arrivalRef.current
        if (!el) return
        // Land just below the sticky nav bar. Smooth scrolling can be skipped
        // (reduced motion, background tabs), so jump if it didn't move.
        const top = el.getBoundingClientRect().top + window.scrollY - 96
        window.scrollTo({ top, behavior: "smooth" })
        fallback = setTimeout(() => { if (Math.abs(window.scrollY - top) > 40) window.scrollTo({ top }) }, 900)
      }, 250)
      let fallback: ReturnType<typeof setTimeout> | undefined
      return () => { clearTimeout(t); if (fallback) clearTimeout(fallback) }
    }
  }, [arrival])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const planId = params.get("plan")
    const unitKey = params.get("unit")
    if (!planId || !unitKey) return
    let cancelled = false
    supabase
      .from("study_guides")
      .select("id, title, content, subject, grade_level, format, user_id")
      .eq("id", planId)
      .single()
      .then(async ({ data }) => {
        if (cancelled || !data || data.format !== "plan") return
        const unit = parsePlan(data.content).phases.flatMap((ph) => ph.units).find((u) => u.key === unitKey)
        if (!unit) return
        // Only your own plans get linked (the server enforces this too).
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user.id === data.user_id) setPlanLink({ planId, unitKey, planTitle: data.title, unitNumber: unit.number, unitTitle: unit.title })
        setArrival({ kind: "plan", sourceTitle: data.title, detail: `Unit ${unit.number}: ${unit.title}` })
        setStudyRequest(unitStudyRequest(data.title, unit))
        setStudyGuideName(unit.title)
        setFormat(unit.format)
        if (data.subject) setSubject(data.subject)
        if (data.grade_level) setGradeLevel(data.grade_level)
      })
    return () => { cancelled = true }
  }, [])
  const [additionalInstructions, setAdditionalInstructions] = useState("")
  const [showMore, setShowMore] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showConversionHelp, setShowConversionHelp] = useState(false)
  const [unsupportedFileName, setUnsupportedFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Auto-description from uploaded files: only ever fills an empty box (or
  // replaces its own earlier suggestion) — never overwrites what the student typed.
  const [describing, setDescribing] = useState(false)
  const [autoFilled, setAutoFilled] = useState(false)
  const excerptCache = useRef(new Map<string, string>())
  const describeRun = useRef(0)
  const autoFilledRef = useRef(false)
  useEffect(() => { autoFilledRef.current = autoFilled }, [autoFilled])
  const dragDepth = useRef(0)

  const { toast } = useToast()

  useEffect(() => {
    if (files.length === 0) setMaterialsKind(null)
    if (files.length === 0 || isGenerating) return
    if (studyRequest.trim() && !autoFilled) return
    const run = ++describeRun.current
    const describe = async () => {
      setDescribing(true)
      try {
        const excerpts = await Promise.all(files.slice(0, 5).map(async (f) => {
          const key = `${f.name}:${f.size}:${f.lastModified}`
          if (!excerptCache.current.has(key)) excerptCache.current.set(key, await extractMaterialExcerpt(f))
          return { name: f.name, excerpt: excerptCache.current.get(key) ?? '' }
        }))
        if (!excerpts.some((e) => e.excerpt.length > 40)) return
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return
        const res = await fetch("/api/describe-materials", {
          method: "POST",
          // Bearer auth only — skip cookies so bloated localhost cookie jars can't 431 the request.
          credentials: "omit",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ files: excerpts }),
        })
        if (!res.ok || run !== describeRun.current) return
        const { description, subject: suggested, kind } = await res.json()
        if (run !== describeRun.current) return
        if (description) {
          // Re-check: the student may have started typing while we waited.
          setStudyRequest((current) => {
            if (current.trim() && !autoFilledRef.current) return current
            autoFilledRef.current = true
            setAutoFilled(true)
            return description
          })
        }
        if (suggested) setSubject((cur) => cur || suggested)
        if (kind) setMaterialsKind(kind)
      } catch (err) {
        console.warn("Could not describe materials:", err)
      } finally {
        if (run === describeRun.current) setDescribing(false)
      }
    }
    describe()
    // Re-run only when the set of files changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files])

  const validateFile = (file: File): string | null => {
    const maxCloudinarySize = 10 * 1024 * 1024
    const maxClientProcessSize = 50 * 1024 * 1024
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/x-iwork-keynote-sffkey",
      "",
    ]
    const validExtensions = [".pdf", ".pptx", ".docx", ".doc", ".ppt", ".key"]
    const extension = "." + file.name.split(".").pop()?.toLowerCase()

    const isOldPPT = extension === ".ppt" || file.type === "application/vnd.ms-powerpoint"
    const isKeynote = extension === ".key" || file.type === "application/x-iwork-keynote-sffkey"
    if (isOldPPT || isKeynote) {
      setUnsupportedFileName(file.name)
      setShowConversionHelp(true)
      return "UNSUPPORTED_FORMAT"
    }

    if (!validTypes.includes(file.type) && !validExtensions.includes(extension)) {
      return `${file.name}: unsupported file type. Upload a PDF, PowerPoint (.pptx) or Word (.docx) file.`
    }

    const canProcessClientSide = extension === ".pptx" || extension === ".docx"
    const maxSize = canProcessClientSide ? maxClientProcessSize : maxCloudinarySize
    if (file.size > maxSize) {
      const mb = (file.size / 1024 / 1024).toFixed(1)
      return canProcessClientSide
        ? `${file.name} is ${mb}MB. The limit is 50MB.`
        : `${file.name} is ${mb}MB. PDFs are limited to 10MB, so try compressing or splitting it.`
    }
    return null
  }

  const handleFiles = (newFiles: File[]) => {
    const validationErrors: string[] = []
    const validFiles: File[] = []
    let hasUnsupportedFormat = false

    newFiles.forEach((file) => {
      const error = validateFile(file)
      if (error === "UNSUPPORTED_FORMAT") hasUnsupportedFormat = true
      else if (error) validationErrors.push(error)
      else validFiles.push(file)
    })

    if (validationErrors.length > 0) {
      const errorMessage = validationErrors.join(" ")
      setErrors((prev) => ({ ...prev, source: errorMessage }))
      toast({ variant: "destructive", title: "Couldn't add that file", description: errorMessage, duration: 8000 })
    } else if (!hasUnsupportedFormat) {
      setErrors((prev) => ({ ...prev, source: "" }))
    }
    if (validFiles.length > 0) setFiles((prev) => [...prev, ...validFiles])
  }

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragDepth.current++
    setDragActive(true)
  }
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragActive(false)
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    dragDepth.current = 0
    setDragActive(false)
    if (!isGenerating && e.dataTransfer.files?.length) handleFiles(Array.from(e.dataTransfer.files))
  }

  const getFileIcon = (file: File) => {
    if (file.type === "application/pdf") return <FileText className="h-4 w-4 text-rose-500" />
    if (file.type.includes("presentation")) return <FileImage className="h-4 w-4 text-orange-500" />
    if (file.type.includes("document")) return <FileText className="h-4 w-4 text-blue-500" />
    return <FileIcon className="h-4 w-4 text-slate-500" />
  }

  const hasSource = files.length > 0 || studyRequest.trim().length >= 3
  // Only offer the visuals switch when this topic/format would actually get figures.
  const showVisualsSwitch = visualsRelevant({
    subject: subject && subject !== "general" ? subject : null,
    text: [studyRequest, topicFocus, studyGuideName, ...files.map((f) => f.name)].join("\n"),
    format: format || null,
  })
  const isFormValid = hasSource && !!format

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}
    if (!hasSource) newErrors.source = "Type what you want to study, or attach your class materials."
    if (!format) newErrors.format = "Pick a format."
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0 || isGenerating) return

    // Free plan: check options and the weekly count here, before files are processed.
    if (plan && !isPremium) {
      const usesDifficulty = !format || DIFFICULTY_FORMATS.includes(format)
      const reason = premiumOnlyReason({ format, length, difficulty: usesDifficulty ? difficulty : undefined })
      if (reason) return openPremium({ error: reason, code: "premium_only" })
      if (freeGuides && freeGuides.used >= freeGuides.limit) {
        return openPremium({ error: `You've used your ${freeGuides.limit} free guides for this week.`, code: "limit_reached", kind: "guide", resetsAt: freeGuides.resetsAt ?? undefined })
      }
    }

    onGenerateStudyGuide({
      files,
      studyRequest: studyRequest.trim() || undefined,
      studyGuideName: studyGuideName.trim() || deriveTitle(studyRequest, files),
      autoTitle: !studyGuideName.trim(),
      subject: subject || "general",
      gradeLevel: gradeLevel || "general",
      format: format as FormatValue,
      topicFocus: topicFocus || undefined,
      goal: goal || undefined,
      // Quizzes and topic lists need teaching beyond the file itself.
      sourcePolicy: files.length > 0 && strictSources && materialsKind !== "assessment" && materialsKind !== "topic_list" ? "strict" : "expand",
      materialsKind: files.length > 0 ? materialsKind ?? undefined : undefined,
      planId: planLink && format !== "plan" ? planLink.planId : undefined,
      planUnit: planLink && format !== "plan" ? planLink.unitKey : undefined,
      additionalInstructions: additionalInstructions || undefined,
      visuals,
      length,
      difficultyLevel: !format || DIFFICULTY_FORMATS.includes(format) ? difficulty : undefined,
    })
  }

  const sourceSummary = files.length > 0
    ? `${files.length} file${files.length === 1 ? "" : "s"}${studyRequest.trim() ? " + your notes" : ""}`
    : studyRequest.trim() ? "your topic" : null

  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 pb-44 pt-16 text-white sm:pt-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 right-[8%] h-96 w-96 rounded-full bg-cyan-300/30 blur-3xl" />
          <div className="absolute -bottom-40 left-[2%] h-96 w-[34rem] rounded-full bg-indigo-400/25 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }}
          />
        </div>

        {/* Floating format previews — decorative, wide screens only */}
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block">
          <div className="absolute left-[6%] top-20 w-52 -rotate-6 rounded-2xl bg-white/95 p-4 text-slate-800 shadow-2xl shadow-blue-950/30">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-indigo-600">Flashcard</p>
            <p className={cn(fontDisplay, "mt-2 text-[0.95rem] font-semibold leading-snug")}>What does the mitochondria do?</p>
            <p className="mt-3 text-[0.65rem] text-slate-400">Tap to flip</p>
          </div>
          <div className="absolute bottom-24 left-[10%] w-56 rotate-3 rounded-2xl bg-white/95 p-4 text-slate-800 shadow-2xl shadow-blue-950/30">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-orange-600">Fill in the blank</p>
            <p className="mt-2 text-sm leading-relaxed">
              Plants make glucose through <span className="rounded bg-emerald-100 px-1.5 font-semibold text-emerald-800">photosynthesis</span>.
            </p>
          </div>
          <div className="absolute right-[6%] top-24 w-56 rotate-6 rounded-2xl bg-white/95 p-4 text-slate-800 shadow-2xl shadow-blue-950/30">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-purple-600">Quiz</p>
            <div className="mt-2 space-y-1.5 text-xs">
              <div className="rounded-lg border border-slate-200 px-2 py-1.5">A) 1776</div>
              <div className="flex items-center justify-between rounded-lg border-2 border-emerald-400 bg-emerald-50 px-2 py-1.5 font-semibold text-emerald-800">B) 1789 <Check className="h-3.5 w-3.5" /></div>
              <div className="rounded-lg border border-slate-200 px-2 py-1.5">C) 1804</div>
            </div>
          </div>
          <div className="absolute bottom-28 right-[9%] w-52 -rotate-3 rounded-2xl bg-white/95 p-4 text-slate-800 shadow-2xl shadow-blue-950/30">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-blue-600">Outline</p>
            <div className="mt-2 space-y-1.5">
              {["Causes", "Key events", "Outcomes"].map((t, i) => (
                <div key={t} className="flex items-center gap-2 text-xs font-medium">
                  <span className={cn("h-3.5 w-3.5 rounded-full border-2", i < 2 ? "border-emerald-500 bg-emerald-500" : "border-slate-300")} />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="container relative mx-auto max-w-4xl px-4 text-center">
          <h1 className={cn(fontDisplay, "text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl")}>
            What do you want
            <span className="block text-yellow-300">to study today?</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-blue-50 sm:text-xl">
            Type a topic, paste your notes, or upload your materials to get a study guide built for your class, exam, interview, or just for learning.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 text-sm font-medium">
            {["Outlines", "Flashcards", "Quizzes", "Summaries", "Interactive practice", "Study plans", "Cheat sheets", "Timelines"].map((l) => (
              <span key={l} className="rounded-full bg-white/15 px-3.5 py-1.5 ring-1 ring-inset ring-white/25 backdrop-blur-sm">{l}</span>
            ))}
          </div>
        </div>
      </section>

      <div className="container relative mx-auto -mt-28 max-w-5xl px-4 pb-24">
        {/* 1 — Source */}
        <section
          onDragEnter={onDragEnter}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "relative rounded-3xl border bg-white p-5 shadow-2xl shadow-blue-900/10 transition sm:p-7",
            dragActive ? "border-blue-500 ring-4 ring-blue-500/20" : errors.source ? "border-rose-300" : "border-slate-200"
          )}
        >
          {dragActive && (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center rounded-3xl bg-blue-50/95">
              <Upload className="mb-2 h-10 w-10 text-blue-600" />
              <p className="text-lg font-semibold text-blue-900">Drop your files here</p>
              <p className="text-sm text-blue-700">PDF, PowerPoint, or Word</p>
            </div>
          )}

          {arrival && (
            <ArrivalBanner
              ref={arrivalRef}
              arrival={arrival}
              firstName={user?.first_name}
              formatLabel={FORMATS.find((f) => f.value === format)?.label}
              planLinked={!!planLink}
              onUnlinkPlan={() => setPlanLink(null)}
              onCreate={handleSubmit}
              onEdit={() => {
                document.getElementById("study-request")?.focus()
                setArrival(null)
              }}
              onDismiss={() => setArrival(null)}
              busy={isGenerating}
            />
          )}
          <StepHeading n={1} title="Your topic and materials" hint="Type, upload, or both" />

          <div className="grid gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            {/* Type */}
            <div className="flex flex-col rounded-2xl border-2 border-slate-200 bg-white transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3.5">
                <Label htmlFor="study-request" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <PenLine className="h-4 w-4 text-blue-600" /> Type a topic or paste notes
                </Label>
                {describing ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading your files…
                  </span>
                ) : autoFilled ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    <Sparkles className="h-3.5 w-3.5" /> Suggested from your files. Edit freely
                  </span>
                ) : null}
              </div>
              <Textarea
                id="study-request"
                value={studyRequest}
                onChange={(e) => {
                  setStudyRequest(e.target.value)
                  if (autoFilled) setAutoFilled(false)
                  if (errors.source) setErrors((p) => ({ ...p, source: "" }))
                }}
                disabled={isGenerating}
                rows={6}
                placeholder={"e.g. The French Revolution for my unit test on Friday, SAT reading, a coding interview, AWS certification…"}
                className="min-h-[10rem] flex-1 resize-none border-0 bg-transparent px-4 pb-4 pt-2 text-base leading-relaxed shadow-none placeholder:text-slate-400 focus-visible:ring-0 sm:text-[1.05rem]"
              />
            </div>

            {/* Upload */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating}
                className={cn(
                  "group flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition",
                  files.length ? "border-blue-300 bg-blue-50/40 hover:bg-blue-50" : "border-slate-300 bg-slate-50/70 hover:border-blue-400 hover:bg-blue-50/60"
                )}
              >
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30 transition group-hover:scale-105">
                  <Upload className="h-6 w-6" />
                </span>
                <span className="font-semibold text-slate-900">{files.length ? "Add more files" : "Upload your materials"}</span>
                <span className="mt-1 text-sm text-slate-500">
                  Drag &amp; drop or <span className="font-semibold text-blue-700 underline-offset-2 group-hover:underline">browse</span>
                </span>
                <span className="mt-3 flex flex-wrap justify-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wide">
                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-700">PDF</span>
                  <span className="rounded bg-orange-100 px-1.5 py-0.5 text-orange-700">PowerPoint</span>
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">Word</span>
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.ppt,.pptx,.docx,.key"
                onChange={(e) => {
                  if (e.target.files?.length) handleFiles(Array.from(e.target.files))
                  e.target.value = ""
                }}
                className="hidden"
                disabled={isGenerating}
              />
              {files.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {files.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-2 text-sm shadow-sm">
                      {getFileIcon(file)}
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{file.name}</span>
                      <span className="shrink-0 text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                        disabled={isGenerating}
                        className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-rose-600"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* How the uploads are used */}
          {files.length > 0 && (
            materialsKind === "assessment" || materialsKind === "topic_list" ? (
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  {materialsKind === "assessment"
                    ? <><strong>This looks like a quiz or test.</strong> Your guide will teach what each question is testing, show how to solve them, and add fresh practice like it.</>
                    : <><strong>This looks like a list of topics.</strong> Your guide will teach each one, in the same order.</>}
                </span>
              </div>
            ) : (
              <label className="mt-4 flex cursor-pointer items-start justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-200">
                <span className="text-sm">
                  <span className="block font-semibold text-slate-800">Only use what&apos;s in my files</span>
                  <span className="text-slate-500">
                    {strictSources
                      ? "Sticks to your materials. Best when your teacher tests exactly what's in them."
                      : "Uses your files as the backbone and fills gaps with outside knowledge."}
                  </span>
                </span>
                <Switch checked={strictSources} onCheckedChange={setStrictSources} disabled={isGenerating} className="mt-0.5" />
              </label>
            )
          )}

          {!studyRequest && files.length === 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-500">Try:</span>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setStudyRequest(ex)}
                  className="rounded-full bg-slate-100 px-3.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
          {errors.source && (
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-rose-600">
              <AlertCircle className="h-4 w-4" /> {errors.source}
            </p>
          )}
        </section>

        {/* 2 — Format */}
        <section className="mt-14">
          <StepHeading n={2} title="Pick a format" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {FORMATS.map((f) => {
              const on = format === f.value
              const Icon = f.icon
              return (
                <button
                  key={f.value}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => {
                    setFormat(f.value)
                    if (errors.format) setErrors((p) => ({ ...p, format: "" }))
                  }}
                  aria-pressed={on}
                  className={cn(
                    "group relative flex flex-col rounded-2xl border-2 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg sm:p-5",
                    on ? f.selected : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  {on ? (
                    <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : plan && !isPremium && !isFreeFormat(f.value) ? (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-amber-800"><Crown className="h-3 w-3" /> Premium</span>
                  ) : f.badge ? (
                    <span className="absolute right-3 top-3 rounded-full bg-orange-500 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white">{f.badge}</span>
                  ) : null}
                  <span className={cn("mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition-colors", on ? f.iconOn : f.iconIdle)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-lg font-semibold text-slate-900">{f.label}</span>
                  <span className="mt-1 text-sm leading-snug text-slate-500">{f.desc}</span>
                  <span className="mt-auto block pt-4">
                    <span className="flex h-[4.5rem] flex-col justify-center rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-100">{f.preview}</span>
                  </span>
                </button>
              )
            })}
          </div>
          {errors.format && <p className="mt-3 text-sm font-medium text-rose-600">{errors.format}</p>}
        </section>

        {/* 3 — Details */}
        <section className="mt-14">
          <StepHeading n={3} title="Add details" />
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <Label className="mb-2.5 block text-base font-semibold text-slate-800">
                What are you studying for? <span className="font-normal text-slate-400">(optional)</span>
              </Label>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5" role="radiogroup">
                {GOALS.map((g) => {
                  const Icon = GOAL_ICONS[g.value]
                  const on = goal === g.value
                  return (
                    <button
                      key={g.value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={isGenerating}
                      onClick={() => setGoal(on ? "" : g.value)}
                      className={cn(
                        "flex flex-col items-start rounded-xl border-2 px-3.5 py-3 text-left transition",
                        on ? "border-blue-500 bg-blue-50/70 ring-4 ring-blue-500/10" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <Icon className={cn("mb-2 h-5 w-5", on ? "text-blue-600" : "text-slate-400")} />
                      <span className="font-semibold leading-tight text-slate-900">{g.label}</span>
                      <span className="mt-0.5 text-xs leading-snug text-slate-500">{g.hint}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-base font-semibold text-slate-800">Subject <span className="font-normal text-slate-400">(optional)</span></Label>
                <Select value={subject} onValueChange={setSubject} disabled={isGenerating}>
                  <SelectTrigger className="h-12 w-full bg-white text-base">
                    <SelectValue placeholder="Figure it out for me" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Figure it out for me</SelectItem>
                    {SUBJECTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block text-base font-semibold text-slate-800">Your level <span className="font-normal text-slate-400">(optional)</span></Label>
                <Select value={gradeLevel} onValueChange={setGradeLevel} disabled={isGenerating}>
                  <SelectTrigger className="h-12 w-full bg-white text-base">
                    <SelectValue placeholder="Figure it out for me" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Figure it out for me</SelectItem>
                    {LEVEL_GROUPS.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel className="text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</SelectLabel>
                        {group.levels.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="studyGuideName" className="mb-2 block text-base font-semibold text-slate-800">
                  Name <span className="font-normal text-slate-400">(optional)</span>
                </Label>
                <Input
                  id="studyGuideName"
                  placeholder={hasSource ? deriveTitle(studyRequest, files) : "e.g. Biology Chapter 5: Cell Structure"}
                  value={studyGuideName}
                  onChange={(e) => setStudyGuideName(e.target.value)}
                  disabled={isGenerating}
                  className="h-12 text-base"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm">
                <span className="block font-semibold text-slate-800">Length</span>
                <span className="text-slate-500">
                  {length === "short" ? "Just the essentials." : length === "long" ? "Everything, with more detail and examples." : "A full guide without the extras."}
                </span>
              </span>
              <div className="grid shrink-0 grid-cols-3 gap-1 rounded-lg bg-white p-1 ring-1 ring-inset ring-slate-200" role="radiogroup" aria-label="Guide length">
                {LENGTH_OPTIONS.map((o) => {
                  const on = length === o.value
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={isGenerating}
                      onClick={() => setLength(o.value)}
                      className={cn(
                        "flex min-w-[5.5rem] flex-col items-center rounded-md px-3 py-1.5 text-sm transition",
                        on ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <span className="inline-flex items-center gap-1 font-semibold">{o.label}{plan && !isPremium && o.value === "long" && <Crown className={cn("h-3 w-3", on ? "text-amber-200" : "text-amber-500")} aria-label="Premium" />}</span>
                      <span className={cn("text-[0.7rem] leading-tight", on ? "text-white/85" : "text-slate-400")}>
                        {(format && LENGTH_HINTS[format]?.[o.value]) || LENGTH_GENERIC[o.value]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {(!format || DIFFICULTY_FORMATS.includes(format)) && (
              <div className="mt-3 flex flex-col gap-3 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm">
                  <span className="block font-semibold text-slate-800">Difficulty</span>
                  <span className="text-slate-500">
                    {difficulty === "easier"
                      ? "Core ideas, one or two steps at a time."
                      : difficulty === "hard"
                        ? "Multi-step questions with tempting wrong answers."
                        : "A realistic mix, like the real thing."}
                  </span>
                </span>
                <div className="grid shrink-0 grid-cols-3 gap-1 rounded-lg bg-white p-1 ring-1 ring-inset ring-slate-200" role="radiogroup" aria-label="Difficulty">
                  {DIFFICULTY_OPTIONS.map((o) => {
                    const on = difficulty === o.value
                    return (
                      <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={isGenerating}
                        onClick={() => setDifficulty(o.value)}
                        className={cn(
                          "flex min-w-[5.5rem] flex-col items-center rounded-md px-3 py-1.5 text-sm transition",
                          on ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        )}
                      >
                        <span className="inline-flex items-center gap-1 font-semibold">{o.label}{plan && !isPremium && o.value === "hard" && <Crown className={cn("h-3 w-3", on ? "text-amber-200" : "text-amber-500")} aria-label="Premium" />}</span>
                        <span className={cn("text-[0.7rem] leading-tight", on ? "text-white/85" : "text-slate-400")}>
                          {goal === "exam" ? o.examHint : o.hint}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {showVisualsSwitch && (
              <label className="mt-3 flex cursor-pointer items-start justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-200">
                <span className="text-sm">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <LineChart className="h-4 w-4 text-blue-600" /> Include visuals
                    <VisualsInfo />
                  </span>
                  <span className="text-slate-500">
                    {visuals
                      ? "Graphs, figures and science models where they help you learn."
                      : "Text only. Simple flowcharts and tables are still included."}
                  </span>
                </span>
                <Switch checked={visuals} onCheckedChange={setVisuals} disabled={isGenerating} className="mt-0.5" aria-label="Include visuals" />
              </label>
            )}

            <button
              type="button"
              onClick={() => setShowMore((s) => !s)}
              className="mt-6 flex items-center gap-1.5 text-base font-semibold text-blue-700 hover:text-blue-800"
              aria-expanded={showMore}
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", showMore && "rotate-180")} />
              More options
            </button>

            <div className={cn("grid transition-all duration-300 ease-out", showMore ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
              <div className="overflow-hidden">
                <div className="grid gap-4 pb-1 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="topic-focus" className="mb-1.5 block text-sm font-medium text-slate-700">Focus on</Label>
                    <Input
                      id="topic-focus"
                      placeholder="e.g. Chapters 3–4 only, or just the dynamic programming problems"
                      value={topicFocus}
                      onChange={(e) => setTopicFocus(e.target.value)}
                      disabled={isGenerating}
                      className="h-11"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="instructions" className="mb-1.5 block text-sm font-medium text-slate-700">Anything else?</Label>
                    <Textarea
                      id="instructions"
                      placeholder="e.g. Use Java for code examples, keep explanations short, more practice problems"
                      value={additionalInstructions}
                      onChange={(e) => setAdditionalInstructions(e.target.value)}
                      rows={3}
                      disabled={isGenerating}
                      className="resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Generate */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <Button
            onClick={handleSubmit}
            disabled={isGenerating}
            size="lg"
            className={cn(
              "h-14 w-full rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 text-lg font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:brightness-110 hover:shadow-xl sm:w-auto sm:px-12",
              !isFormValid && "opacity-80"
            )}
          >
            {isGenerating ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating…</>
            ) : (
              <><Sparkles className="mr-2 h-5 w-5" /> Generate study guide</>
            )}
          </Button>
          {freeGuides && (
            <p className={cn("text-sm font-medium", freeGuidesLeft ? "text-slate-600" : "text-amber-700")}>
              {freeGuidesLeft
                ? `${freeGuidesLeft} of ${PLAN_LIMITS.free.guide.limit} free guides left this week`
                : `You've used this week's ${PLAN_LIMITS.free.guide.limit} free guides. Next one unlocks ${formatReset(freeGuides.resetsAt) ?? "soon"}.`}
              {" "}
              <button type="button" onClick={() => openPremium()} className="font-semibold text-blue-700 hover:underline">Premium</button>
            </p>
          )}
          <p className="text-sm text-slate-500">
            {isFormValid && sourceSummary
              ? `${FORMATS.find((f) => f.value === format)?.label} from ${sourceSummary} · ${difficulty === "hard" && DIFFICULTY_FORMATS.includes(format) ? "hard questions take about 2 minutes" : "usually ready in under a minute"}`
              : "Takes about a minute. Your guide is saved to My Guides."}
          </p>
        </div>

        {/* Custom builder entry point */}
        <Link
          href="/create-guide"
          className="group mt-12 flex items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4 transition hover:border-blue-300 hover:bg-white"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700">
            <PenSquare className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-slate-900">Want to mix formats or edit every section?</span>
            <span className="block text-sm text-slate-500">Build a custom guide with the block editor.</span>
          </span>
          <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
        </Link>
      </div>

      {/* Conversion help for .ppt / Keynote */}
      <Dialog open={showConversionHelp} onOpenChange={setShowConversionHelp}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              File format not supported
            </DialogTitle>
            <DialogDescription className="pt-2 text-left">
              <strong>{unsupportedFileName}</strong> can&apos;t be read directly.
              {unsupportedFileName.endsWith(".key")
                ? " Keynote files are Mac 'bundle' files that browsers can't open."
                : " The old PowerPoint format (.ppt) needs converting first."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div className="rounded-lg bg-green-50 p-3">
              <p className="font-semibold text-green-800">Export as PDF (recommended)</p>
              <ol className="mt-1 list-inside list-decimal space-y-1 text-green-700">
                <li>Open it in {unsupportedFileName.endsWith(".key") ? "Keynote" : "PowerPoint, Keynote, or Google Slides"}</li>
                <li>Choose <strong>File → Export {unsupportedFileName.endsWith(".key") ? "To → PDF" : "as PDF"}</strong></li>
                <li>Attach the PDF here</li>
              </ol>
            </div>
            {!unsupportedFileName.endsWith(".key") && (
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="font-semibold text-blue-800">Or save as .pptx</p>
                <p className="mt-1 text-blue-700">In PowerPoint: <strong>File → Save As → PowerPoint Presentation (.pptx)</strong></p>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowConversionHelp(false)} className="bg-blue-600 hover:bg-blue-700">Got it</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StepHeading({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-base font-bold text-white shadow-md shadow-blue-600/25">{n}</span>
      <h2 className={cn(fontDisplay, "text-2xl font-semibold text-slate-900 sm:text-[1.7rem]")}>{title}</h2>
      {hint && <span className="text-sm font-medium text-slate-400">{hint}</span>}
    </div>
  )
}

type Arrival =
  | { kind: "plan"; sourceTitle: string; detail: string }
  | { kind: "missed"; sourceTitle: string; detail: string }
  | { kind: "welcome" }

const ARRIVAL_STYLE = {
  plan: { ring: "ring-teal-200", bg: "from-teal-50 to-white", iconBg: "bg-teal-600", eyebrow: "text-teal-700", button: "bg-teal-600 hover:bg-teal-700", Icon: MapIcon },
  missed: { ring: "ring-purple-200", bg: "from-purple-50 to-white", iconBg: "bg-purple-600", eyebrow: "text-purple-700", button: "bg-purple-600 hover:bg-purple-700", Icon: RotateCcw },
  welcome: { ring: "ring-blue-200", bg: "from-blue-50 to-white", iconBg: "bg-blue-600", eyebrow: "text-blue-700", button: "bg-blue-600 hover:bg-blue-700", Icon: Sparkles },
} as const

const ArrivalBanner = forwardRef<HTMLDivElement, {
  arrival: Arrival
  firstName?: string
  formatLabel?: string
  planLinked: boolean
  onUnlinkPlan: () => void
  onCreate: () => void
  onEdit: () => void
  onDismiss: () => void
  busy: boolean
}>(function ArrivalBanner({ arrival, firstName, formatLabel, planLinked, onUnlinkPlan, onCreate, onEdit, onDismiss, busy }, ref) {
  const style = ARRIVAL_STYLE[arrival.kind]
  const Icon = style.Icon

  let eyebrow: string, title: React.ReactNode, body: React.ReactNode
  if (arrival.kind === "welcome") {
    eyebrow = "Welcome"
    title = <>Your account is ready{firstName ? `, ${firstName}` : ""}!</>
    body = "Type a topic or upload your notes below, pick a format, and your first study guide will be ready in about a minute."
  } else if (arrival.kind === "plan") {
    eyebrow = "From your study plan"
    title = <>{arrival.detail}</>
    body = (
      <>
        Everything below is filled in from <strong>{arrival.sourceTitle}</strong>
        {formatLabel ? <> as a <strong>{formatLabel.toLowerCase()}</strong></> : null}.
        {planLinked ? " The new guide will link back to your plan." : null}
      </>
    )
  } else {
    eyebrow = "Practice what you missed"
    title = <>A new quiz on the {arrival.detail}</>
    body = <>We filled in a request from your results on <strong>{arrival.sourceTitle}</strong>. Create it now, or change anything below first.</>
  }

  return (
    <div ref={ref} role="status" className={cn("relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r p-5 ring-1 ring-inset animate-fade-up", style.bg, style.ring)}>
      <button type="button" onClick={onDismiss} className="absolute right-3 top-3 rounded-md p-1 text-slate-400 transition hover:bg-white hover:text-slate-600" aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-4 pr-6">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm", style.iconBg)}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("text-xs font-semibold uppercase tracking-[0.14em]", style.eyebrow)}>{eyebrow}</p>
          <p className={cn(fontDisplay, "mt-1 text-xl font-semibold leading-snug text-slate-900")}>{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
          {arrival.kind !== "welcome" && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onCreate}
                disabled={busy}
                className={cn("inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60", style.button)}
              >
                <Sparkles className="h-4 w-4" /> Create it now
              </button>
              <button type="button" onClick={onEdit} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white">
                Change something first
              </button>
              {arrival.kind === "plan" && planLinked && (
                <button type="button" onClick={onUnlinkPlan} className="ml-auto text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline">
                  Don&apos;t link to the plan
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
