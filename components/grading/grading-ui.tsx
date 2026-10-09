"use client"

// Shared look for the grading pages (/grade-exam, /grade-exam/batch and class
// results), matching the study-guide homepage (components/upload-page-redesigned.tsx):
// the blue gradient hero with the display serif, numbered step headings, white
// rounded-3xl cards that overlap the hero, and the same drop-zone style.
// Pages wrap themselves in `displaySerif.variable` so `fontDisplay` resolves.

import type { ReactNode } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, FileText, Image as ImageIcon, Upload, User, Users, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { fontDisplay } from "@/lib/formats/design"
import { uploadKind } from "@/lib/uploads/kinds"

export function GradingHero({ title, accent, subtitle, children }: { title: string; accent?: string; subtitle: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 pb-44 pt-16 text-white sm:pt-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-[8%] h-96 w-96 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="absolute -bottom-40 left-[2%] h-96 w-[34rem] rounded-full bg-indigo-400/25 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />
      </div>

      {/* Floating previews of a graded paper: decorative, wide screens only */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block">
        <div className="absolute left-[6%] top-20 w-56 -rotate-6 rounded-2xl bg-white/95 p-4 text-slate-800 shadow-2xl shadow-blue-950/30">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-emerald-600">Question 2</p>
          <p className={cn(fontDisplay, "mt-1.5 text-[0.95rem] font-semibold leading-snug")}>2 / 3 marks</p>
          <p className="mt-1.5 text-[0.7rem] leading-snug text-slate-500">Glycolysis and Krebs are right. The third stage is the electron transport chain, not fermentation.</p>
        </div>
        <div className="absolute right-[6%] top-28 w-52 rotate-6 rounded-2xl bg-white/95 p-4 text-slate-800 shadow-2xl shadow-blue-950/30">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-blue-600">Unit 4 Quiz</p>
          {[["Ava R.", "7/7"], ["Ben K.", "1/7"], ["Cara M.", "6/7"]].map(([n, s]) => (
            <p key={n} className="mt-1.5 flex items-center justify-between text-[0.75rem]"><span>{n}</span><span className="font-semibold text-slate-900">{s}</span></p>
          ))}
        </div>
        <div className="absolute bottom-32 left-[9%] w-44 rotate-3 rounded-2xl bg-white/95 p-3.5 text-slate-800 shadow-2xl shadow-blue-950/30">
          <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Handwriting read</p>
          <p className="mt-1 text-[0.65rem] text-slate-500">IMG_4021.HEIC, 2 pages</p>
        </div>
      </div>

      <div className="container relative mx-auto max-w-4xl px-4 text-center">
        <h1 className={cn(fontDisplay, "text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl")}>
          {title}
          {accent && <span className="block text-yellow-300">{accent}</span>}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-blue-50 sm:text-xl">{subtitle}</p>
        {children}
      </div>
    </section>
  )
}

/** The white card that overlaps the hero (homepage step cards). */
export function StepCard({ children, className, highlight }: { children: ReactNode; className?: string; highlight?: "drag" | "error" | null }) {
  return (
    <section className={cn(
      "relative rounded-3xl border bg-white p-5 shadow-2xl shadow-blue-900/10 transition sm:p-7",
      highlight === "drag" ? "border-blue-500 ring-4 ring-blue-500/20" : highlight === "error" ? "border-rose-300" : "border-slate-200",
      className,
    )}>
      {children}
    </section>
  )
}

export function StepHeading({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-base font-bold text-white shadow-md shadow-blue-600/25">{n}</span>
      <h2 className={cn(fontDisplay, "text-2xl font-semibold text-slate-900 sm:text-[1.7rem]")}>{title}</h2>
      {hint && <span className="text-sm font-medium text-slate-400">{hint}</span>}
    </div>
  )
}

/** Homepage-style drop zone. Drag handlers stay with the page; this is the look. */
export function DropZone({ label, sublabel, onBrowse, hasFiles, disabled, compact }: { label: string; sublabel?: string; onBrowse: () => void; hasFiles?: boolean; disabled?: boolean; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onBrowse}
      disabled={disabled}
      className={cn(
        "group flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 text-center transition disabled:cursor-not-allowed disabled:opacity-60",
        compact ? "py-5" : "py-8",
        hasFiles ? "border-blue-300 bg-blue-50/40 hover:bg-blue-50" : "border-slate-300 bg-slate-50/70 hover:border-blue-400 hover:bg-blue-50/60",
      )}
    >
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30 transition group-hover:scale-105">
        <Upload className="h-6 w-6" />
      </span>
      <span className="font-semibold text-slate-900">{label}</span>
      <span className="mt-1 text-sm text-slate-500">
        {sublabel ?? <>Drag &amp; drop or <span className="font-semibold text-blue-700 underline-offset-2 group-hover:underline">browse</span></>}
      </span>
      <span className="mt-3 flex flex-wrap justify-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wide">
        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">Photos</span>
        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-700">PDF</span>
        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">Word</span>
        <span className="rounded bg-orange-100 px-1.5 py-0.5 text-orange-700">PowerPoint</span>
      </span>
    </button>
  )
}

/** Uploaded-file rows, same as the homepage list. */
export function FileList({ files, onRemove, disabled }: { files: File[]; onRemove: (index: number) => void; disabled?: boolean }) {
  if (!files.length) return null
  return (
    <ul className="mt-3 space-y-2">
      {files.map((file, index) => {
        const kind = uploadKind(file.name, file.type)
        const Icon = kind === "image" || kind === "heic" ? ImageIcon : FileText
        return (
          <li key={`${file.name}-${index}`} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-2 text-sm shadow-sm">
            <Icon className={cn("h-4 w-4 shrink-0", kind === "image" || kind === "heic" ? "text-emerald-600" : kind === "pdf" ? "text-rose-500" : "text-blue-500")} />
            <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{file.name}</span>
            <span className="shrink-0 text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
            <button type="button" onClick={() => onRemove(index)} disabled={disabled} aria-label={`Remove ${file.name}`} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">
              <X className="h-4 w-4" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** The gradient call-to-action button from the homepage. */
export const primaryCta = "h-14 w-full rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 text-lg font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:brightness-110 hover:shadow-xl sm:w-auto sm:px-12"

/**
 * Whole class vs one student, the first thing on both grading pages (teachers).
 * Whole class comes first because it's the usual job.
 */
export function GradingModeSwitch({ mode }: { mode: "class" | "single" }) {
  const options = [
    { key: "class" as const, href: "/grade-exam/batch", icon: Users, title: "A whole class", text: "Drop in the whole stack. We sort it into students and grade every paper." },
    { key: "single" as const, href: "/grade-exam", icon: User, title: "One student", text: "Grade a single paper and watch the marking as it happens." },
  ]
  return (
    <nav aria-label="What are you grading?" className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl shadow-blue-900/10 sm:grid-cols-2">
      {options.map((o) => {
        const active = o.key === mode
        const Icon = o.icon
        return (
          <Link
            key={o.key}
            href={o.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-start gap-3 rounded-2xl border-2 p-4 transition",
              active ? "border-blue-600 bg-blue-50/70" : "border-transparent hover:border-slate-200 hover:bg-slate-50",
            )}
          >
            <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", active ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "bg-slate-100 text-slate-600")}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className={cn("block font-semibold", active ? "text-blue-900" : "text-slate-900")}>{o.title}</span>
              <span className="block text-sm text-slate-500">{o.text}</span>
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

/** Shown while no mark scheme is attached: grading works without one, but marks are much better with it. */
export function MarkSchemeNudge({ batch }: { batch?: boolean }) {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      <div>
        <p className="font-semibold">Highly recommended: add your mark scheme</p>
        <p className="mt-0.5 text-amber-800">
          It&apos;s the biggest thing for accurate marks: the grader uses your answers and your mark split instead of working them out itself.
          {batch
            ? " No mark scheme? Carry on: we'll write an answer key from the first paper for you to check, and mark everyone against it."
            : " No mark scheme? You can still grade; the marks will be the AI's own judgement."}
        </p>
      </div>
    </div>
  )
}
