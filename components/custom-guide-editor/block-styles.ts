// Visual styles shared by the custom-guide EDITOR blocks and the CustomFormat
// VIEWER, so what a teacher edits looks exactly like what students see.
// Class strings are full literals so Tailwind's scanner keeps them.

import { Info, AlertTriangle, CheckCircle2, GraduationCap } from "lucide-react"
import type { AlertContent, DefinitionColorVariant, TableContent } from "@/lib/types/custom-guide"

export const ALERT_VARIANTS: Record<AlertContent["variant"], {
  label: string
  icon: React.ComponentType<{ className?: string }>
  box: string
  iconCls: string
  title: string
  body: string
}> = {
  info: { label: "Info", icon: Info, box: "bg-sky-50 border-sky-200", iconCls: "text-sky-600", title: "text-sky-900", body: "text-sky-900/85" },
  warning: { label: "Warning", icon: AlertTriangle, box: "bg-rose-50 border-rose-200", iconCls: "text-rose-600", title: "text-rose-900", body: "text-rose-900/85" },
  success: { label: "Key idea", icon: CheckCircle2, box: "bg-emerald-50 border-emerald-200", iconCls: "text-emerald-600", title: "text-emerald-900", body: "text-emerald-900/85" },
  "exam-tip": { label: "Exam tip", icon: GraduationCap, box: "bg-amber-50 border-amber-200", iconCls: "text-amber-600", title: "text-amber-900", body: "text-amber-900/85" },
}

export const DEFINITION_COLORS: Record<DefinitionColorVariant, { label: string; swatch: string; edge: string; bg: string; term: string; text: string }> = {
  purple: { label: "Purple", swatch: "bg-purple-500", edge: "border-l-purple-500", bg: "bg-purple-50/60", term: "text-purple-900", text: "text-purple-900/80" },
  blue: { label: "Blue", swatch: "bg-blue-500", edge: "border-l-blue-500", bg: "bg-blue-50/60", term: "text-blue-900", text: "text-blue-900/80" },
  teal: { label: "Teal", swatch: "bg-teal-500", edge: "border-l-teal-500", bg: "bg-teal-50/60", term: "text-teal-900", text: "text-teal-900/80" },
  green: { label: "Green", swatch: "bg-green-500", edge: "border-l-green-500", bg: "bg-green-50/60", term: "text-green-900", text: "text-green-900/80" },
  pink: { label: "Pink", swatch: "bg-pink-500", edge: "border-l-pink-500", bg: "bg-pink-50/60", term: "text-pink-900", text: "text-pink-900/80" },
  orange: { label: "Orange", swatch: "bg-orange-500", edge: "border-l-orange-500", bg: "bg-orange-50/60", term: "text-orange-900", text: "text-orange-900/80" },
}

type HeaderStyle = NonNullable<TableContent["headerStyle"]>

export const TABLE_HEADER_STYLES: Record<HeaderStyle, { label: string; swatch: string; head: string; headText: string }> = {
  default: { label: "Slate", swatch: "bg-slate-400", head: "bg-slate-100", headText: "text-slate-900" },
  blue: { label: "Blue", swatch: "bg-blue-500", head: "bg-blue-50", headText: "text-blue-900" },
  green: { label: "Green", swatch: "bg-emerald-500", head: "bg-emerald-50", headText: "text-emerald-900" },
  purple: { label: "Purple", swatch: "bg-purple-500", head: "bg-purple-50", headText: "text-purple-900" },
}
