"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Filter, X } from "lucide-react"

export type DashboardRange = "next7" | "next30" | "next90" | "all"

export interface DashboardFilters {
  classId: string  // "all" or class id
  period: string   // "all" or period string
  range: DashboardRange
  hidePast: boolean
  hideSubmitted: boolean  // student: hide submitted/graded; teacher: hide fully-submitted
}

export const DEFAULT_FILTERS: DashboardFilters = {
  classId: "all",
  period: "all",
  range: "next30",
  hidePast: true,
  hideSubmitted: false,
}

const STORAGE_KEY_PREFIX = "casanova:dashboardFilters:v1"

// Read stored filters scoped per-user (so a shared device doesn't bleed state).
export function readStoredFilters(userId: string | null): DashboardFilters {
  if (!userId || typeof window === "undefined") return DEFAULT_FILTERS
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}:${userId}`)
    if (!raw) return DEFAULT_FILTERS
    const parsed = JSON.parse(raw) as Partial<DashboardFilters>
    return { ...DEFAULT_FILTERS, ...parsed }
  } catch {
    return DEFAULT_FILTERS
  }
}

export function writeStoredFilters(userId: string | null, filters: DashboardFilters) {
  if (!userId || typeof window === "undefined") return
  try {
    window.localStorage.setItem(`${STORAGE_KEY_PREFIX}:${userId}`, JSON.stringify(filters))
  } catch {
    // localStorage may be unavailable (private mode); silently no-op.
  }
}

// Translate range to {from, to} ISO strings for the dashboard API.
export function rangeToFromTo(range: DashboardRange): { from: string; to: string } {
  const now = new Date()
  const days = range === "next7" ? 7 : range === "next30" ? 30 : range === "next90" ? 90 : 365
  // Past floor: keep a small back-window so "Hide past" toggle has data to filter.
  const from = new Date(now.getTime() - 7 * 86400_000)
  const to = new Date(now.getTime() + days * 86400_000)
  return { from: from.toISOString(), to: to.toISOString() }
}

interface Props {
  userId: string | null
  filters: DashboardFilters
  onChange: (next: DashboardFilters) => void
  classes: Array<{ id: string; name: string; period: string | null }>
  showRange?: boolean  // false on the calendar (cursor controls range)
}

export default function DashboardFilterBar({
  userId,
  filters,
  onChange,
  classes,
  showRange = true,
}: Props) {
  const [open, setOpen] = useState(false)

  const periods = Array.from(
    new Set(classes.map(c => (c.period ?? "").trim()).filter(p => p.length > 0))
  ).sort()

  const update = (patch: Partial<DashboardFilters>) => {
    const next = { ...filters, ...patch }
    onChange(next)
    writeStoredFilters(userId, next)
  }

  const reset = () => {
    onChange(DEFAULT_FILTERS)
    writeStoredFilters(userId, DEFAULT_FILTERS)
  }

  const activeCount =
    (filters.classId !== DEFAULT_FILTERS.classId ? 1 : 0) +
    (filters.period !== DEFAULT_FILTERS.period ? 1 : 0) +
    (showRange && filters.range !== DEFAULT_FILTERS.range ? 1 : 0)

  const togglesDirty =
    filters.hidePast !== DEFAULT_FILTERS.hidePast ||
    filters.hideSubmitted !== DEFAULT_FILTERS.hideSubmitted

  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[11px]">
              {activeCount}
            </span>
          )}
        </Button>

        <div className="flex items-center gap-4 px-3 py-1.5 rounded-md border bg-background">
          <div className="flex items-center gap-2">
            <Switch
              id="hide-past-inline"
              checked={filters.hidePast}
              onCheckedChange={v => update({ hidePast: !!v })}
            />
            <label htmlFor="hide-past-inline" className="text-sm cursor-pointer select-none whitespace-nowrap">
              Hide past
            </label>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Switch
              id="hide-submitted-inline"
              checked={filters.hideSubmitted}
              onCheckedChange={v => update({ hideSubmitted: !!v })}
            />
            <label htmlFor="hide-submitted-inline" className="text-sm cursor-pointer select-none whitespace-nowrap">
              Hide submitted
            </label>
          </div>
        </div>

        {(activeCount > 0 || togglesDirty) && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <X className="h-4 w-4 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-3 p-4 border rounded-lg bg-muted/30 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Class</label>
            <Select value={filters.classId} onValueChange={v => update({ classId: v })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.period ? ` · P${c.period}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Period</label>
            <Select value={filters.period} onValueChange={v => update({ period: v })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All periods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All periods</SelectItem>
                {periods.map(p => (
                  <SelectItem key={p} value={p}>
                    Period {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showRange && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Due date</label>
              <Select value={filters.range} onValueChange={v => update({ range: v as DashboardRange })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="next7">Next 7 days</SelectItem>
                  <SelectItem value="next30">Next 30 days</SelectItem>
                  <SelectItem value="next90">Next 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------- Filter helpers (applied client-side after fetch) ----------

function periodMatches(period: string, itemPeriod: string | null | undefined): boolean {
  if (period === "all") return true
  return (itemPeriod ?? "") === period
}

function classMatches(classId: string, itemClassIds: string[] | string | undefined | null): boolean {
  if (classId === "all") return true
  if (Array.isArray(itemClassIds)) return itemClassIds.includes(classId)
  return itemClassIds === classId
}

function isPast(due_at: string | null | undefined): boolean {
  if (!due_at) return false
  return new Date(due_at).getTime() < Date.now()
}

// Student upcoming row
export function applyStudentUpcomingFilters<
  T extends {
    class_id: string
    due_at: string | null
    status: string | null
  } & { class_period?: string | null }
>(
  items: T[],
  filters: DashboardFilters,
  classPeriodLookup: (classId: string) => string | null
): T[] {
  return items.filter(it => {
    if (!classMatches(filters.classId, it.class_id)) return false
    if (!periodMatches(filters.period, classPeriodLookup(it.class_id))) return false
    if (filters.hidePast && isPast(it.due_at)) return false
    if (filters.hideSubmitted && it.status && ["submitted", "grading", "pending_review", "graded"].includes(it.status)) return false
    return true
  })
}

// Teacher upcoming row
export function applyTeacherUpcomingFilters<
  T extends {
    due_at: string | null
    per_class: Array<{ class_id: string; period: string | null; submitted: number; enrolled: number }>
  }
>(items: T[], filters: DashboardFilters): T[] {
  return items.filter(it => {
    // Class filter: keep if any per_class link matches
    if (filters.classId !== "all" && !it.per_class.some(pc => pc.class_id === filters.classId)) return false
    if (filters.period !== "all" && !it.per_class.some(pc => (pc.period ?? "") === filters.period)) return false
    if (filters.hidePast && isPast(it.due_at)) return false
    if (filters.hideSubmitted) {
      // "Fully submitted" = every class link has all enrolled students turned in (and at least 1 enrolled).
      const filteredLinks = filters.classId === "all" ? it.per_class : it.per_class.filter(pc => pc.class_id === filters.classId)
      const allFull = filteredLinks.length > 0 && filteredLinks.every(pc => pc.enrolled > 0 && pc.submitted >= pc.enrolled)
      if (allFull) return false
    }
    return true
  })
}

// Recent grades / pending review row (works for both)
export function applyGradesFilters<
  T extends {
    class_id: string
    submitted_at?: string
  }
>(items: T[], filters: DashboardFilters, classPeriodLookup: (classId: string) => string | null): T[] {
  return items.filter(it => {
    if (!classMatches(filters.classId, it.class_id)) return false
    if (!periodMatches(filters.period, classPeriodLookup(it.class_id))) return false
    return true
  })
}

// Guides row (deduped to one row per guide, with a list of class_ids)
export function applyGuidesFilters<
  T extends { class_ids: string[] }
>(items: T[], filters: DashboardFilters, classPeriodLookup: (classId: string) => string | null): T[] {
  return items.filter(it => {
    if (filters.classId !== "all" && !it.class_ids.includes(filters.classId)) return false
    if (filters.period !== "all" && !it.class_ids.some(cid => (classPeriodLookup(cid) ?? "") === filters.period)) return false
    return true
  })
}
