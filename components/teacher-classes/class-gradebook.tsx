"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { Download, ArrowUp, ArrowDown, ArrowUpDown, ExternalLink } from "lucide-react"

interface GradebookStudent {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
}

interface GradebookAssignment {
  id: string
  title: string
  due_at: string | null
  total_possible_marks: number | null
  is_published: boolean
}

interface GradebookSubmission {
  submission_id: string
  assignment_id: string
  student_id: string
  status: string
  is_late: boolean
  score: number | null
  possible: number | null
  percentage: number | null
}

interface GradebookData {
  students: GradebookStudent[]
  assignments: GradebookAssignment[]
  submissions: GradebookSubmission[]
}

type SortDir = "asc" | "desc"
type SortKey =
  | { kind: "name" }
  | { kind: "overall" }
  | { kind: "missing" }
  | { kind: "assignment"; assignmentId: string }

function sortKeyEquals(a: SortKey, b: SortKey): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === "assignment" && b.kind === "assignment") return a.assignmentId === b.assignmentId
  return true
}

// Numeric value for per-assignment sort. Returns null for "no data" states
// that should be pushed to the bottom regardless of direction.
function cellSortValue(cell: CellState): number | null {
  if (cell.kind === "graded" || cell.kind === "pending") {
    if (cell.sub?.percentage != null) return cell.sub.percentage
    if (cell.sub?.score != null && cell.sub?.possible != null && cell.sub.possible > 0) {
      return (cell.sub.score / cell.sub.possible) * 100
    }
    return null
  }
  if (cell.kind === "missing") return 0
  return null
}

interface CellState {
  kind: "graded" | "pending" | "submitted" | "grading" | "failed" | "missing" | "not_due"
  sub: GradebookSubmission | null
}

function lastName(s: GradebookStudent): string {
  return (s.last_name ?? "").trim().toLowerCase()
}
function firstName(s: GradebookStudent): string {
  return (s.first_name ?? "").trim().toLowerCase()
}
function displayName(s: GradebookStudent): string {
  const last = s.last_name?.trim() ?? ""
  const first = s.first_name?.trim() ?? ""
  if (last || first) return `${last}${last && first ? ", " : ""}${first}`
  return s.email
}

function formatDue(iso: string | null): string {
  if (!iso) return "No due date"
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function cellFor(
  sub: GradebookSubmission | null,
  assignment: GradebookAssignment,
  now: number
): CellState {
  if (sub) {
    if (sub.status === "graded" || sub.status === "pending_review") {
      // pending_review = AI-graded, awaiting teacher return; still show the numeric score
      if (sub.score != null && sub.possible != null) return { kind: sub.status === "graded" ? "graded" : "pending", sub }
      return { kind: "pending", sub }
    }
    if (sub.status === "submitted") return { kind: "submitted", sub }
    if (sub.status === "grading") return { kind: "grading", sub }
    if (sub.status === "failed") return { kind: "failed", sub }
  }
  // No submission
  const due = assignment.due_at ? new Date(assignment.due_at).getTime() : null
  if (due != null && due < now) return { kind: "missing", sub: null }
  return { kind: "not_due", sub: null }
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

interface GradebookRow {
  student: GradebookStudent
  cells: Map<string, CellState>
  overallPercent: number | null
  missingCount: number
}

export default function ClassGradebook({ classId, className }: { classId: string; className: string }) {
  const { toast } = useToast()
  const [data, setData] = useState<GradebookData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>({ kind: "name" })
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [now] = useState(() => Date.now())

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/classes/${classId}/gradebook`)
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to load gradebook", variant: "destructive" })
        return
      }
      setData({ students: json.students ?? [], assignments: json.assignments ?? [], submissions: json.submissions ?? [] })
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [classId, toast])

  useEffect(() => { fetchData() }, [fetchData])

  const rows: GradebookRow[] = useMemo(() => {
    if (!data) return []
    // Index submissions by (student_id, assignment_id)
    const subKey = (s: string, a: string) => `${s}::${a}`
    const subIndex = new Map<string, GradebookSubmission>()
    for (const s of data.submissions) subIndex.set(subKey(s.student_id, s.assignment_id), s)

    return data.students.map(student => {
      const cells = new Map<string, CellState>()
      let scoreSum = 0
      let possibleSum = 0
      let missing = 0
      for (const a of data.assignments) {
        const sub = subIndex.get(subKey(student.id, a.id)) ?? null
        const cell = cellFor(sub, a, now)
        cells.set(a.id, cell)
        if ((cell.kind === "graded" || cell.kind === "pending") && cell.sub?.score != null && cell.sub?.possible != null) {
          scoreSum += cell.sub.score
          possibleSum += cell.sub.possible
        }
        if (cell.kind === "missing") missing += 1
      }
      const overall = possibleSum > 0 ? (scoreSum / possibleSum) * 100 : null
      return { student, cells, overallPercent: overall, missingCount: missing }
    })
  }, [data, now])

  const sortedRows: GradebookRow[] = useMemo(() => {
    // For numeric sorts, null values are pushed to the bottom regardless of direction.
    const numericCmp = (a: number | null, b: number | null, dir: SortDir): number => {
      if (a == null && b == null) return 0
      if (a == null) return 1
      if (b == null) return -1
      return dir === "asc" ? a - b : b - a
    }

    const copy = [...rows]
    copy.sort((a, b) => {
      if (sortKey.kind === "name") {
        let cmp = lastName(a.student).localeCompare(lastName(b.student))
        if (cmp === 0) cmp = firstName(a.student).localeCompare(firstName(b.student))
        return sortDir === "asc" ? cmp : -cmp
      }
      if (sortKey.kind === "overall") {
        return numericCmp(a.overallPercent, b.overallPercent, sortDir)
      }
      if (sortKey.kind === "missing") {
        return sortDir === "asc"
          ? a.missingCount - b.missingCount
          : b.missingCount - a.missingCount
      }
      // assignment column
      const av = cellSortValue(a.cells.get(sortKey.assignmentId)!)
      const bv = cellSortValue(b.cells.get(sortKey.assignmentId)!)
      return numericCmp(av, bv, sortDir)
    })
    return copy
  }, [rows, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKeyEquals(sortKey, key)) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      // Sensible default direction per column type
      setSortDir(key.kind === "name" ? "asc" : "desc")
    }
  }

  const exportCsv = () => {
    if (!data) return
    const header = [
      "Last Name",
      "First Name",
      "Email",
      "Overall %",
      "Missing",
      ...data.assignments.map(a => {
        const due = a.due_at ? ` (Due ${formatDue(a.due_at)})` : ""
        const total = a.total_possible_marks != null ? ` /${a.total_possible_marks}` : ""
        return `${a.title}${total}${due}`
      }),
    ]
    const lines = [header.map(csvEscape).join(",")]
    for (const row of sortedRows) {
      const overall = row.overallPercent == null ? "" : row.overallPercent.toFixed(1)
      const cells = data.assignments.map(a => {
        const c = row.cells.get(a.id)
        if (!c) return ""
        switch (c.kind) {
          case "graded":
          case "pending": {
            if (c.sub?.score != null && c.sub?.possible != null) {
              const pct = c.sub.percentage ?? (c.sub.possible > 0 ? (c.sub.score / c.sub.possible) * 100 : null)
              return pct != null
                ? `${c.sub.score}/${c.sub.possible} (${pct.toFixed(0)}%)`
                : `${c.sub.score}/${c.sub.possible}`
            }
            return c.kind.toUpperCase()
          }
          case "submitted": return "SUBMITTED"
          case "grading": return "GRADING"
          case "failed": return "FAILED"
          case "missing": return "MISSING"
          case "not_due": return "--"
        }
      })
      lines.push([
        row.student.last_name ?? "",
        row.student.first_name ?? "",
        row.student.email,
        overall,
        row.missingCount.toString(),
        ...cells,
      ].map(v => csvEscape(String(v))).join(","))
    }
    const csv = lines.join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    const safe = className.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60)
    a.href = url
    a.download = `${safe}_gradebook.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.students.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          No active students enrolled. Share the enrollment code from the Overview tab.
        </CardContent>
      </Card>
    )
  }

  if (data.assignments.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          No published assignments yet. The gradebook will populate once you post one from the Overview tab.
        </CardContent>
      </Card>
    )
  }

  const sortIndicator = (key: SortKey) => {
    if (!sortKeyEquals(sortKey, key)) return <ArrowUpDown className="h-3 w-3 opacity-40" />
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-end gap-3 mb-4">
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 sticky top-0">
              <tr>
                <th className="text-left font-medium px-3 py-2 sticky left-0 bg-muted/40 z-10 min-w-[180px]">
                  <button
                    type="button"
                    onClick={() => toggleSort({ kind: "name" })}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Student {sortIndicator({ kind: "name" })}
                  </button>
                </th>
                <th className="text-right font-medium px-3 py-2 min-w-[100px]">
                  <button
                    type="button"
                    onClick={() => toggleSort({ kind: "overall" })}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Overall {sortIndicator({ kind: "overall" })}
                  </button>
                </th>
                <th className="text-right font-medium px-3 py-2 min-w-[90px]">
                  <button
                    type="button"
                    onClick={() => toggleSort({ kind: "missing" })}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Missing {sortIndicator({ kind: "missing" })}
                  </button>
                </th>
                {data.assignments.map(a => (
                  <th key={a.id} className="text-center font-medium px-3 py-2 min-w-[120px]">
                    <div className="flex flex-col items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => toggleSort({ kind: "assignment", assignmentId: a.id })}
                        className="inline-flex items-center gap-1 hover:text-foreground max-w-[160px]"
                        title={a.title}
                      >
                        <span className="truncate">{a.title}</span>
                        {sortIndicator({ kind: "assignment", assignmentId: a.id })}
                      </button>
                      <div className="flex items-center gap-1 text-[10px] font-normal text-muted-foreground">
                        <span>{formatDue(a.due_at)}</span>
                        {a.total_possible_marks != null && <span>· /{a.total_possible_marks}</span>}
                        <Link
                          href={`/teacher/assignments/${a.id}`}
                          className="ml-0.5 hover:text-foreground"
                          aria-label={`Open ${a.title}`}
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(row => (
                <tr key={row.student.id} className="border-t hover:bg-muted/20">
                  <td className="px-3 py-2 sticky left-0 bg-background hover:bg-muted/20 font-medium">
                    {displayName(row.student)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.overallPercent == null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      `${row.overallPercent.toFixed(1)}%`
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.missingCount > 0 ? (
                      <span className="text-red-600">{row.missingCount}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  {data.assignments.map(a => (
                    <td key={a.id} className="px-3 py-2 text-center">
                      <GradebookCell cell={row.cells.get(a.id)!} assignmentId={a.id} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function GradebookCell({ cell, assignmentId }: { cell: CellState; assignmentId: string }) {
  if (cell.kind === "not_due") {
    return <span className="text-muted-foreground">—</span>
  }
  if (cell.kind === "missing") {
    return <span className="text-red-600 text-xs font-medium">Missing</span>
  }
  if (cell.kind === "failed") {
    return (
      <Link href={`/teacher/assignments/${assignmentId}?submission=${cell.sub!.submission_id}`}>
        <Badge variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">Failed</Badge>
      </Link>
    )
  }
  if (cell.kind === "submitted") {
    return (
      <Link href={`/teacher/assignments/${assignmentId}?submission=${cell.sub!.submission_id}`}>
        <Badge variant="secondary" className="hover:bg-secondary/80">Submitted</Badge>
      </Link>
    )
  }
  if (cell.kind === "grading") {
    return (
      <Link href={`/teacher/assignments/${assignmentId}?submission=${cell.sub!.submission_id}`}>
        <Badge variant="secondary" className="hover:bg-secondary/80">Grading…</Badge>
      </Link>
    )
  }
  // graded or pending — both show numeric score
  const sub = cell.sub!
  if (sub.score == null || sub.possible == null) {
    return (
      <Link href={`/teacher/assignments/${assignmentId}?submission=${sub.submission_id}`} className="text-amber-600 text-xs hover:underline">
        Pending
      </Link>
    )
  }
  const isPending = cell.kind === "pending"
  const percent = sub.percentage ?? (sub.possible > 0 ? (sub.score / sub.possible) * 100 : null)
  return (
    <Link
      href={`/teacher/assignments/${assignmentId}?submission=${sub.submission_id}`}
      className={`inline-flex flex-col items-center leading-tight tabular-nums hover:underline ${isPending ? "text-amber-700" : ""}`}
      title={isPending ? "AI-graded, awaiting return to student" : undefined}
    >
      <span>{sub.score}/{sub.possible}</span>
      {percent != null && (
        <span className="text-[10px] text-muted-foreground">{percent.toFixed(0)}%</span>
      )}
    </Link>
  )
}
