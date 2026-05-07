// Color tokens used for classes. The palette is intentionally small so the
// calendar, dashboard, and class lists all resolve to the same Tailwind
// classes. The DB stores the token; the UI maps it to classes here.

export const CLASS_COLOR_TOKENS = [
  "slate",
  "rose",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "blue",
  "indigo",
  "violet",
  "purple",
  "pink",
] as const

export type ClassColorToken = (typeof CLASS_COLOR_TOKENS)[number]

export const DEFAULT_CLASS_COLOR: ClassColorToken = "slate"

export function isClassColorToken(value: unknown): value is ClassColorToken {
  return typeof value === "string" && (CLASS_COLOR_TOKENS as readonly string[]).includes(value)
}

// Resolve the color a viewer sees: the student's override wins; otherwise the
// teacher's class color; otherwise the default.
export function resolveClassColor(
  classColor: string | null | undefined,
  studentOverride: string | null | undefined
): ClassColorToken {
  if (isClassColorToken(studentOverride)) return studentOverride
  if (isClassColorToken(classColor)) return classColor
  return DEFAULT_CLASS_COLOR
}

// Tailwind class lookups. Tailwind needs the literal strings present in the
// codebase, so we keep them here rather than building strings dynamically.
export const COLOR_DOT: Record<ClassColorToken, string> = {
  slate: "bg-slate-500",
  rose: "bg-rose-500",
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  yellow: "bg-yellow-500",
  lime: "bg-lime-500",
  green: "bg-green-500",
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
  cyan: "bg-cyan-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
}

// A soft tinted strip used as a card accent.
export const COLOR_STRIPE: Record<ClassColorToken, string> = {
  slate: "bg-slate-400",
  rose: "bg-rose-400",
  red: "bg-red-400",
  orange: "bg-orange-400",
  amber: "bg-amber-400",
  yellow: "bg-yellow-400",
  lime: "bg-lime-400",
  green: "bg-green-400",
  emerald: "bg-emerald-400",
  teal: "bg-teal-400",
  cyan: "bg-cyan-400",
  blue: "bg-blue-400",
  indigo: "bg-indigo-400",
  violet: "bg-violet-400",
  purple: "bg-purple-400",
  pink: "bg-pink-400",
}

// A faint background tint for chips/rows.
export const COLOR_TINT_BG: Record<ClassColorToken, string> = {
  slate: "bg-slate-100 dark:bg-slate-900/40",
  rose: "bg-rose-100 dark:bg-rose-900/40",
  red: "bg-red-100 dark:bg-red-900/40",
  orange: "bg-orange-100 dark:bg-orange-900/40",
  amber: "bg-amber-100 dark:bg-amber-900/40",
  yellow: "bg-yellow-100 dark:bg-yellow-900/40",
  lime: "bg-lime-100 dark:bg-lime-900/40",
  green: "bg-green-100 dark:bg-green-900/40",
  emerald: "bg-emerald-100 dark:bg-emerald-900/40",
  teal: "bg-teal-100 dark:bg-teal-900/40",
  cyan: "bg-cyan-100 dark:bg-cyan-900/40",
  blue: "bg-blue-100 dark:bg-blue-900/40",
  indigo: "bg-indigo-100 dark:bg-indigo-900/40",
  violet: "bg-violet-100 dark:bg-violet-900/40",
  purple: "bg-purple-100 dark:bg-purple-900/40",
  pink: "bg-pink-100 dark:bg-pink-900/40",
}

export const COLOR_TINT_BORDER: Record<ClassColorToken, string> = {
  slate: "border-slate-300 dark:border-slate-700",
  rose: "border-rose-300 dark:border-rose-700",
  red: "border-red-300 dark:border-red-700",
  orange: "border-orange-300 dark:border-orange-700",
  amber: "border-amber-300 dark:border-amber-700",
  yellow: "border-yellow-300 dark:border-yellow-700",
  lime: "border-lime-300 dark:border-lime-700",
  green: "border-green-300 dark:border-green-700",
  emerald: "border-emerald-300 dark:border-emerald-700",
  teal: "border-teal-300 dark:border-teal-700",
  cyan: "border-cyan-300 dark:border-cyan-700",
  blue: "border-blue-300 dark:border-blue-700",
  indigo: "border-indigo-300 dark:border-indigo-700",
  violet: "border-violet-300 dark:border-violet-700",
  purple: "border-purple-300 dark:border-purple-700",
  pink: "border-pink-300 dark:border-pink-700",
}
