// Shared design tokens for the study-guide format renderers.
//
// Direction: a calm "study desk" system — paper/ink neutrals (slate), one
// confident brand accent (indigo), and a disciplined semantic palette with a
// SINGLE fixed meaning per color. The signature device is the exam-priority
// tier (Essential / Important / Supporting) the generator already emits, which
// encodes what to study first.
//
// Class strings are written as full literals so Tailwind's scanner picks them up.

export const fontDisplay = "font-[family-name:var(--font-display)]"

// Capitalize the first letter for display (e.g. "history" → "History"), leaving
// already-capitalized subjects like "AP US History" untouched.
export function capitalizeFirst(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Base surfaces
export const surface = "rounded-xl border border-slate-200 bg-white shadow-sm"
export const surfaceMuted = "rounded-xl border border-slate-200 bg-slate-50"

// ── Exam-priority tiers (🔴 Essential / 🟡 Important / 🟢 Supporting) ──────────
export type Tier = "essential" | "important" | "supporting"

export interface TierStyle {
  label: string // human label
  edge: string // left accent rule on cards
  borderB: string // bottom accent rule under headings
  dot: string // filled marker
  text: string // tinted heading/label text
  chip: string // eyebrow chip (bg + text + ring)
}

export const tierStyles: Record<Tier, TierStyle> = {
  essential: {
    label: "Essential",
    edge: "border-l-rose-500",
    borderB: "border-b-rose-500",
    dot: "bg-rose-500",
    text: "text-rose-700",
    chip: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
  },
  important: {
    label: "Important",
    edge: "border-l-amber-500",
    borderB: "border-b-amber-500",
    dot: "bg-amber-500",
    text: "text-amber-700",
    chip: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  },
  supporting: {
    label: "Supporting",
    edge: "border-l-emerald-500",
    borderB: "border-b-emerald-500",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    chip: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  },
}

// Detect a section's exam-priority tier from its title (emoji or keyword).
export function detectTier(title: string): Tier | null {
  const t = title.toLowerCase()
  if (title.includes("🔴") || t.includes("essential")) return "essential"
  if (title.includes("🟡") || t.includes("important")) return "important"
  if (title.includes("🟢") || t.includes("supporting")) return "supporting"
  return null
}

// Strip the leading tier emoji from a title for clean display.
export function stripTierEmoji(title: string): string {
  return title.replace(/^[🔴🟡🟢]\s*/u, "").trim()
}

// ── Study-state semantics (flashcards / quiz) ────────────────────────────────
// Mastered = emerald, Difficult = amber, Neutral/active = indigo brand.
export const state = {
  mastered: {
    edge: "border-l-emerald-500",
    ring: "ring-emerald-500",
    solid: "bg-emerald-500",
    soft: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    text: "text-emerald-700",
  },
  difficult: {
    edge: "border-l-amber-500",
    ring: "ring-amber-500",
    solid: "bg-amber-500",
    soft: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
    text: "text-amber-700",
  },
  neutral: {
    edge: "border-l-slate-200",
    ring: "ring-sky-500",
    solid: "bg-sky-500",
    soft: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
    text: "text-slate-600",
  },
} as const

// Quiz answer states
export const answer = {
  correct: "border-emerald-300 bg-emerald-50",
  wrong: "border-rose-300 bg-rose-50",
  selected: "border-sky-400 bg-sky-50",
  idle: "border-slate-200 hover:border-sky-300 hover:bg-slate-50",
} as const

// Small uppercase eyebrow label
export const eyebrow = "text-[0.7rem] font-semibold uppercase tracking-[0.14em]"

// ── Per-format identity color ────────────────────────────────────────────────
// Each study-guide category gets its own accent so the four formats read as a
// distinct-but-related family. Colors are chosen to avoid the tier palette
// (rose/amber/emerald) and the quiz/flashcard state colors. Class strings are
// full literals so Tailwind's scanner keeps them.
export type FormatKey = "outline" | "summary" | "quiz" | "flashcards"

export interface FormatAccent {
  text: string // eyebrows, progress %, small accents
  edge: string // left accent rule (border-l-*)
  solid: string // primary button / filled label bg
  hover: string // primary button hover
  ring: string // focus / card ring
  soft: string // chip (bg + text + ring)
  iconBadge: string // header icon badge (bg + text)
  bannerFrom: string
  bannerTo: string
  bannerSub: string // subtitle text color over the banner gradient
}

// Colors mirror the "Configure your study guide" format picker
// (outline=blue, flashcards=indigo, quiz=purple, summary=green).
export const formatAccent: Record<FormatKey, FormatAccent> = {
  outline: {
    text: "text-blue-700",
    edge: "border-l-blue-500",
    solid: "bg-blue-600",
    hover: "hover:bg-blue-700",
    ring: "ring-blue-500",
    soft: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
    iconBadge: "bg-white/15 text-white",
    bannerFrom: "from-blue-500",
    bannerTo: "to-blue-700",
    bannerSub: "text-blue-50",
  },
  summary: {
    text: "text-green-700",
    edge: "border-l-green-500",
    solid: "bg-green-600",
    hover: "hover:bg-green-700",
    ring: "ring-green-500",
    soft: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200",
    iconBadge: "bg-white/15 text-white",
    bannerFrom: "from-green-500",
    bannerTo: "to-green-700",
    bannerSub: "text-green-50",
  },
  quiz: {
    text: "text-purple-700",
    edge: "border-l-purple-500",
    solid: "bg-purple-600",
    hover: "hover:bg-purple-700",
    ring: "ring-purple-500",
    soft: "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200",
    iconBadge: "bg-white/15 text-white",
    bannerFrom: "from-purple-500",
    bannerTo: "to-purple-700",
    bannerSub: "text-purple-50",
  },
  flashcards: {
    text: "text-indigo-700",
    edge: "border-l-indigo-500",
    solid: "bg-indigo-600",
    hover: "hover:bg-indigo-700",
    ring: "ring-indigo-500",
    soft: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200",
    iconBadge: "bg-white/15 text-white",
    bannerFrom: "from-indigo-500",
    bannerTo: "to-indigo-700",
    bannerSub: "text-indigo-50",
  },
}
