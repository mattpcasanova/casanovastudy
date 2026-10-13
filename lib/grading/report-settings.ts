// A teacher's report defaults (table teacher_report_settings, migration 049):
// what a printed grade report shows, the branding footer, and the default
// grade scale / exam-board marking style for new gradings.

import { normalizeMarkingStyle, type MarkingStyle } from './marking-style'
import { DEFAULT_SCALE, normalizeScale, type GradeScale } from './scale'

export interface ReportSettings {
  showBranding: boolean
  schoolName: string
  teacherName: string
  showPercentage: boolean
  showGrade: boolean
  showFeedback: boolean
  showMarkCodes: boolean
  showLevels: boolean
  showAo: boolean
  defaultScale: GradeScale
  markingStyle: MarkingStyle
}

export const DEFAULT_REPORT_SETTINGS: ReportSettings = {
  showBranding: true,
  schoolName: '',
  teacherName: '',
  showPercentage: true,
  showGrade: true,
  showFeedback: true,
  showMarkCodes: true,
  showLevels: true,
  showAo: true,
  defaultScale: DEFAULT_SCALE,
  markingStyle: {},
}

type Row = Record<string, unknown> | null | undefined

const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export function settingsFromRow(row: Row): ReportSettings {
  const d = DEFAULT_REPORT_SETTINGS
  if (!row) return d
  return {
    showBranding: bool(row.show_branding, d.showBranding),
    schoolName: text(row.school_name, 120),
    teacherName: text(row.teacher_name, 120),
    showPercentage: bool(row.show_percentage, d.showPercentage),
    showGrade: bool(row.show_grade, d.showGrade),
    showFeedback: bool(row.show_feedback, d.showFeedback),
    showMarkCodes: bool(row.show_mark_codes, d.showMarkCodes),
    showLevels: bool(row.show_levels, d.showLevels),
    showAo: bool(row.show_ao, d.showAo),
    defaultScale: normalizeScale(row.default_scale) ?? d.defaultScale,
    markingStyle: normalizeMarkingStyle(row.marking_style),
  }
}

/** Request body (camelCase) → table row; unknown or bad values fall back to defaults. */
export function settingsToRow(input: unknown): Record<string, unknown> {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  const d = DEFAULT_REPORT_SETTINGS
  return {
    show_branding: bool(raw.showBranding, d.showBranding),
    school_name: text(raw.schoolName, 120) || null,
    teacher_name: text(raw.teacherName, 120) || null,
    show_percentage: bool(raw.showPercentage, d.showPercentage),
    show_grade: bool(raw.showGrade, d.showGrade),
    show_feedback: bool(raw.showFeedback, d.showFeedback),
    show_mark_codes: bool(raw.showMarkCodes, d.showMarkCodes),
    show_levels: bool(raw.showLevels, d.showLevels),
    show_ao: bool(raw.showAo, d.showAo),
    default_scale: normalizeScale(raw.defaultScale) ?? d.defaultScale,
    marking_style: normalizeMarkingStyle(raw.markingStyle),
  }
}

/** The scale and marking style for a new grading: what the request asked for, else the teacher's defaults. */
export function gradingChoices(settings: ReportSettings, scale: unknown, markingStyle: unknown): { scale: GradeScale; markingStyle: MarkingStyle } {
  return {
    scale: normalizeScale(scale) ?? settings.defaultScale,
    markingStyle: markingStyle && typeof markingStyle === 'object' ? normalizeMarkingStyle(markingStyle) : settings.markingStyle,
  }
}
