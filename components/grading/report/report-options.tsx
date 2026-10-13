"use client"

import { Switch } from "@/components/ui/switch"
import type { MarkingStyle } from "@/lib/grading/marking-style"
import type { ReportSettings } from "@/lib/grading/report-settings"
import type { GradeScale } from "@/lib/grading/scale"
import { ScaleEditor } from "./scale-editor"

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 py-1.5">
      <span>
        <span className="block text-sm text-slate-800">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    </label>
  )
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 border-t border-slate-200 pt-4 first:border-0 first:pt-0">
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      {note && <p className="pb-1 text-xs text-slate-500">{note}</p>}
      {children}
    </div>
  )
}

/**
 * Report options: this report's grade scale and exam-board marking, and the
 * teacher's display settings (which apply to all their reports).
 */
export function ReportOptions({ settings, onSettings, scale, onScale, onScaleDefault, markingStyle, onMarkingStyle, possible }: {
  settings: ReportSettings
  onSettings: (patch: Partial<ReportSettings>) => void
  scale: GradeScale | null
  onScale: (scale: GradeScale) => void
  onScaleDefault: () => void
  markingStyle: MarkingStyle
  onMarkingStyle: (style: MarkingStyle) => void
  possible: number
}) {
  return (
    <div className="space-y-4">
      <Section title="Grade scale" note="For this report.">
        <ScaleEditor value={scale} onChange={onScale} possible={possible} />
        <button type="button" onClick={onScaleDefault} className="mt-1 text-xs font-medium text-blue-700 hover:underline">
          Use this scale for my future gradings
        </button>
      </Section>

      <Section title="Exam-board marking" note="Optional, for AICE, A Level and similar. Turn one on to add it by hand while editing; pick it before grading and the grader fills it in.">
        <Toggle label="Mark types (M1, A1, B1)" checked={!!markingStyle.codes} onChange={(codes) => onMarkingStyle({ ...markingStyle, codes })} />
        <Toggle label="Levels of response" checked={!!markingStyle.levels} onChange={(levels) => onMarkingStyle({ ...markingStyle, levels })} />
        <Toggle label="Assessment objectives (AO1, AO2...)" checked={!!markingStyle.ao} onChange={(ao) => onMarkingStyle({ ...markingStyle, ao })} />
      </Section>

      <Section title="What the report shows" note="Applies to all your reports.">
        <Toggle label="Percentage" checked={settings.showPercentage} onChange={(showPercentage) => onSettings({ showPercentage })} />
        <Toggle label="Grade" checked={settings.showGrade} onChange={(showGrade) => onSettings({ showGrade })} />
        <Toggle label="Feedback on each question" checked={settings.showFeedback} onChange={(showFeedback) => onSettings({ showFeedback })} />
        <Toggle label="Mark types" checked={settings.showMarkCodes} onChange={(showMarkCodes) => onSettings({ showMarkCodes })} />
        <Toggle label="Levels" checked={settings.showLevels} onChange={(showLevels) => onSettings({ showLevels })} />
        <Toggle label="Assessment objectives" checked={settings.showAo} onChange={(showAo) => onSettings({ showAo })} />
      </Section>

      <Section title="Header and footer" note="Applies to all your reports.">
        <label className="block py-1">
          <span className="mb-1 block text-xs text-slate-600">School name</span>
          <input value={settings.schoolName} onChange={(e) => onSettings({ schoolName: e.target.value })} placeholder="e.g. Coral Springs High School" className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm" />
        </label>
        <label className="block py-1">
          <span className="mb-1 block text-xs text-slate-600">Teacher name</span>
          <input value={settings.teacherName} onChange={(e) => onSettings({ teacherName: e.target.value })} placeholder="e.g. Mr. Casanova" className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm" />
        </label>
        <Toggle label={`"Graded with Casanova Study" footer`} checked={settings.showBranding} onChange={(showBranding) => onSettings({ showBranding })} />
      </Section>
    </div>
  )
}
