"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  X,
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
  ChevronDown,
  Check,
  PenSquare,
  ArrowRight,
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

interface UploadPageProps {
  onGenerateStudyGuide: (data: StudyGuideData) => void
  isGenerating: boolean
}

type FormatValue = "outline" | "flashcards" | "quiz" | "summary" | "practice"

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
    desc: "Match, fill in blanks, sort and order — hands-on review",
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
]

const SUBJECTS = [
  { value: "mathematics", label: "Mathematics" },
  { value: "science", label: "Science" },
  { value: "english", label: "English" },
  { value: "history", label: "History / Social Studies" },
  { value: "foreign-language", label: "Foreign Language" },
  { value: "other", label: "Other" },
]

const GRADES = [
  { value: "6th-8th", label: "6th–8th Grade" },
  { value: "9th", label: "9th Grade" },
  { value: "10th", label: "10th Grade" },
  { value: "11th", label: "11th Grade" },
  { value: "12th", label: "12th Grade" },
  { value: "college", label: "College" },
]

const EXAMPLES = [
  "Photosynthesis and cellular respiration",
  "Causes of World War I",
  "Solving quadratic equations",
  "Spanish preterite vs. imperfect",
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
  const [difficultyLevel, setDifficultyLevel] = useState("")
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
        const { description, subject: suggested } = await res.json()
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
        ? `${file.name} is ${mb}MB — the limit is 50MB.`
        : `${file.name} is ${mb}MB — PDFs are limited to 10MB. Try compressing or splitting it.`
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
  const isFormValid = hasSource && !!format

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}
    if (!hasSource) newErrors.source = "Type what you want to study, or attach your class materials."
    if (!format) newErrors.format = "Pick a format."
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0 || isGenerating) return

    onGenerateStudyGuide({
      files,
      studyRequest: studyRequest.trim() || undefined,
      studyGuideName: studyGuideName.trim() || deriveTitle(studyRequest, files),
      autoTitle: !studyGuideName.trim(),
      subject: subject || "general",
      gradeLevel: gradeLevel || "general",
      format: format as FormatValue,
      topicFocus: topicFocus || undefined,
      difficultyLevel: (difficultyLevel || undefined) as StudyGuideData["difficultyLevel"],
      additionalInstructions: additionalInstructions || undefined,
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
            Type a topic, paste your notes, or upload your class slides — and get a study guide built for your next test.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 text-sm font-medium">
            {["Outlines", "Flashcards", "Quizzes", "Summaries", "Interactive practice"].map((l) => (
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
                    <Sparkles className="h-3.5 w-3.5" /> Suggested from your files — edit freely
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
                placeholder={"e.g. The French Revolution — causes, key events, and outcomes for my unit test on Friday."}
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
                <span className="font-semibold text-slate-900">{files.length ? "Add more files" : "Upload class materials"}</span>
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-2 block text-base font-semibold text-slate-800">Subject <span className="font-normal text-slate-400">(optional)</span></Label>
                <Select value={subject} onValueChange={(v) => { setSubject(v); setErrors((p) => ({ ...p, subject: "" })) }} disabled={isGenerating}>
                  <SelectTrigger className={cn("h-12 w-full bg-white text-base", errors.subject && "border-rose-400")}>
                    <SelectValue placeholder="Any subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Any subject</SelectItem>
                    {SUBJECTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.subject && <p className="mt-1 text-sm text-rose-600">{errors.subject}</p>}
              </div>
              <div>
                <Label className="mb-2 block text-base font-semibold text-slate-800">Grade level <span className="font-normal text-slate-400">(optional)</span></Label>
                <Select value={gradeLevel} onValueChange={(v) => { setGradeLevel(v); setErrors((p) => ({ ...p, gradeLevel: "" })) }} disabled={isGenerating}>
                  <SelectTrigger className={cn("h-12 w-full bg-white text-base", errors.gradeLevel && "border-rose-400")}>
                    <SelectValue placeholder="Any level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Any level</SelectItem>
                    {GRADES.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.gradeLevel && <p className="mt-1 text-sm text-rose-600">{errors.gradeLevel}</p>}
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="studyGuideName" className="mb-2 block text-base font-semibold text-slate-800">
                  Name <span className="font-normal text-slate-400">(optional)</span>
                </Label>
                <Input
                  id="studyGuideName"
                  placeholder={hasSource ? deriveTitle(studyRequest, files) : "e.g. Biology Chapter 5 — Cell Structure"}
                  value={studyGuideName}
                  onChange={(e) => setStudyGuideName(e.target.value)}
                  disabled={isGenerating}
                  className="h-12 text-base"
                />
              </div>
            </div>

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
                  <div>
                    <Label htmlFor="topic-focus" className="mb-1.5 block text-sm font-medium text-slate-700">Focus on</Label>
                    <Input
                      id="topic-focus"
                      placeholder="e.g. Chapters 3–4 only"
                      value={topicFocus}
                      onChange={(e) => setTopicFocus(e.target.value)}
                      disabled={isGenerating}
                      className="h-11"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-sm font-medium text-slate-700">Difficulty</Label>
                    <div className="grid h-11 grid-cols-3 rounded-lg bg-slate-100 p-1" role="radiogroup">
                      {["beginner", "intermediate", "advanced"].map((d) => (
                        <button
                          key={d}
                          type="button"
                          role="radio"
                          aria-checked={difficultyLevel === d}
                          onClick={() => setDifficultyLevel(difficultyLevel === d ? "" : d)}
                          disabled={isGenerating}
                          className={cn(
                            "rounded-md text-sm font-medium capitalize transition",
                            difficultyLevel === d ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                          )}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="instructions" className="mb-1.5 block text-sm font-medium text-slate-700">Anything else?</Label>
                    <Textarea
                      id="instructions"
                      placeholder="e.g. Include more practice with vocabulary, keep explanations short"
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
          <p className="text-sm text-slate-500">
            {isFormValid && sourceSummary
              ? `${FORMATS.find((f) => f.value === format)?.label} from ${sourceSummary} · usually ready in under a minute`
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
