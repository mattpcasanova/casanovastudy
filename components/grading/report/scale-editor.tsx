"use client"

import { Plus, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DEFAULT_SCALE, SCALE_PRESETS, hasGrades, presetScale, type GradeScale, type ScalePreset } from "@/lib/grading/scale"
import { cn } from "@/lib/utils"
import { actionButton } from "@/components/grading/grading-ui"

/**
 * Grade scale picker: a preset (US letters, Cambridge A*-E, IB...) and, for
 * scales with grades, editable boundaries as percentages or raw marks.
 * `possible` (the paper's total) labels raw-mark boundaries.
 */
export function ScaleEditor({ value, onChange, possible, compact = false }: {
  value: GradeScale | null
  onChange: (scale: GradeScale) => void
  possible?: number
  compact?: boolean
}) {
  const scale = value ?? DEFAULT_SCALE
  const editable = hasGrades(scale)

  const setBand = (i: number, patch: Partial<{ grade: string; min: number }>) =>
    onChange({ ...scale, bands: scale.bands.map((b, k) => (k === i ? { ...b, ...patch } : b)) })

  return (
    <div className="space-y-3">
      <Select value={scale.preset} onValueChange={(p) => onChange(presetScale(p as ScalePreset))}>
        <SelectTrigger className="w-full bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(SCALE_PRESETS) as ScalePreset[]).map((p) => (
            <SelectItem key={p} value={p}>{SCALE_PRESETS[p].label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!compact && <p className="text-xs text-slate-500">{SCALE_PRESETS[scale.preset].hint}</p>}

      {editable && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600">Boundaries</span>
            <div className="flex rounded-lg bg-white p-0.5 text-xs ring-1 ring-slate-200">
              {(['percent', 'marks'] as const).map((basis) => (
                <button
                  key={basis}
                  type="button"
                  onClick={() => onChange({ ...scale, basis })}
                  className={cn("rounded-md px-2 py-1", scale.basis === basis ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100")}
                >
                  {basis === 'percent' ? 'Percent' : 'Raw marks'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            {scale.bands.map((band, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <input
                  value={band.grade}
                  onChange={(e) => setBand(i, { grade: e.target.value.slice(0, 12) })}
                  className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-center font-semibold"
                  aria-label="Grade"
                />
                <span className="text-slate-500">from</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={band.min}
                  onChange={(e) => setBand(i, { min: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1 text-right"
                  aria-label="Lowest score for this grade"
                />
                <span className="text-slate-500">{scale.basis === 'percent' ? '%' : possible ? `/ ${possible}` : 'marks'}</span>
                <button
                  type="button"
                  onClick={() => onChange({ ...scale, preset: 'custom', bands: scale.bands.filter((_, k) => k !== i) })}
                  className="ml-auto rounded p-1 text-slate-400 hover:bg-white hover:text-red-600"
                  aria-label={`Remove grade ${band.grade}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1 text-sm">
              <span className="text-slate-500">Below that:</span>
              <input
                value={scale.below}
                onChange={(e) => onChange({ ...scale, below: e.target.value.slice(0, 12) })}
                className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-center font-semibold"
                aria-label="Grade below every boundary"
              />
              <button
                type="button"
                onClick={() => onChange({ ...scale, preset: 'custom', bands: [...scale.bands, { grade: '', min: 0 }] })}
                className={cn(actionButton, "ml-auto")}
              >
                <Plus className="h-3.5 w-3.5" /> Add grade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
