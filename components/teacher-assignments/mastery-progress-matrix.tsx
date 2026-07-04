"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CheckCircle2, Flag, Loader2 } from "lucide-react"

interface ConceptCol {
  id: string
  name: string
}

interface StudentRow {
  attempt_id: string
  student_id: string
  name: string
  status: "in_progress" | "completed"
  current_round: number
  concepts: Array<{
    concept_id: string
    answered_count: number
    correct_count: number
    recent_results: boolean[]
    status: "in_progress" | "mastered" | "max_reached"
  }>
}

// Students × concepts heat grid for a mastery assignment. Cells show live
// window accuracy; teachers can force-finalize stragglers after the due date.
export default function MasteryProgressMatrix({ assignmentId }: { assignmentId: string }) {
  const { toast } = useToast()
  const [concepts, setConcepts] = useState<ConceptCol[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [dueAt, setDueAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [finalizingId, setFinalizingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/mastery/progress`)
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to load progress", variant: "destructive" })
        return
      }
      setConcepts(json.concepts)
      setStudents(json.students)
      setDueAt(json.due_at)
    } finally {
      setLoading(false)
    }
  }, [assignmentId, toast])

  useEffect(() => {
    load()
  }, [load])

  const handleFinalize = async (attemptId: string) => {
    setFinalizingId(attemptId)
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/mastery/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempt_id: attemptId }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to finalize", variant: "destructive" })
        return
      }
      toast({ title: "Finalized — graded as-is" })
      await load()
    } catch {
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setFinalizingId(null)
    }
  }

  const pastDue = !!(dueAt && new Date() > new Date(dueAt))

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-semibold text-lg">Mastery progress</h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-green-500 inline-block" /> Mastered</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400 inline-block" /> In progress</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-red-400 inline-block" /> Hit question cap</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-muted border inline-block" /> Not started</span>
          </div>
        </div>

        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No students have started yet.
          </p>
        ) : (
          <TooltipProvider delayDuration={100}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="text-left font-medium text-muted-foreground pb-2 pr-4 sticky left-0 bg-background">Student</th>
                    {concepts.map(c => (
                      <th key={c.id} className="pb-2 px-1 font-medium text-muted-foreground">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block max-w-[7rem] truncate text-xs cursor-default">{c.name}</span>
                          </TooltipTrigger>
                          <TooltipContent>{c.name}</TooltipContent>
                        </Tooltip>
                      </th>
                    ))}
                    <th className="pb-2 pl-3" />
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.attempt_id}>
                      <td className="py-1.5 pr-4 sticky left-0 bg-background">
                        <span className="font-medium">{s.name}</span>
                        {s.status === "completed" ? (
                          <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                            Done
                          </Badge>
                        ) : (
                          <span className="ml-2 text-xs text-muted-foreground">R{s.current_round}</span>
                        )}
                      </td>
                      {concepts.map(c => {
                        const r = s.concepts.find(x => x.concept_id === c.id)
                        const recent = r?.recent_results ?? []
                        const acc = recent.length ? Math.round((recent.filter(Boolean).length / recent.length) * 100) : null
                        const color = !r || r.answered_count === 0
                          ? "bg-muted border"
                          : r.status === "mastered"
                            ? "bg-green-500"
                            : r.status === "max_reached"
                              ? "bg-red-400"
                              : "bg-amber-400"
                        return (
                          <td key={c.id} className="py-1.5 px-1 text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={`inline-block h-6 w-10 rounded ${color} text-[10px] leading-6 text-white font-medium cursor-default`}>
                                  {r && r.answered_count > 0 && r.status !== "mastered" ? `${acc}%` : ""}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {r && r.answered_count > 0
                                  ? `${r.correct_count}/${r.answered_count} correct · ${r.status === "mastered" ? "mastered" : r.status === "max_reached" ? "hit cap" : `${acc}% recent accuracy`}`
                                  : "Not started"}
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        )
                      })}
                      <td className="py-1.5 pl-3 text-right">
                        {s.status === "in_progress" && pastDue && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleFinalize(s.attempt_id)}
                            disabled={finalizingId === s.attempt_id}
                          >
                            {finalizingId === s.attempt_id
                              ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              : <Flag className="h-3 w-3 mr-1" />}
                            Finalize
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  )
}
