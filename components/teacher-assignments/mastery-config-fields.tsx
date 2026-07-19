"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronsUpDown } from "lucide-react"
import type { ConceptWithCounts, QuestionType } from "@/lib/types/question-bank"

export interface MasteryConfigValues {
  concept_ids: string[]
  mastery_threshold: number
  questions_per_round: number
  min_questions: number
  window_size: number
  max_questions_per_concept: number
  allowed_types: QuestionType[]
}

export const DEFAULT_MASTERY_CONFIG: MasteryConfigValues = {
  concept_ids: [],
  mastery_threshold: 0.8,
  questions_per_round: 5,
  min_questions: 3,
  window_size: 5,
  max_questions_per_concept: 15,
  allowed_types: ["multiple_choice", "true_false", "short_answer"],
}

const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple choice",
  true_false: "True / False",
  short_answer: "Short answer (AI-graded)",
}

// Mastery-specific fields inside the assignment dialog. Concepts with no
// approved questions can't be selected — the loop couldn't complete.
export default function MasteryConfigFields({
  value,
  onChange,
}: {
  value: MasteryConfigValues
  onChange: (next: MasteryConfigValues) => void
}) {
  const [concepts, setConcepts] = useState<ConceptWithCounts[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/concepts")
      .then(r => r.json())
      .then(j => {
        if (!cancelled && Array.isArray(j.concepts)) setConcepts(j.concepts)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const toggleConcept = (id: string) => {
    onChange({
      ...value,
      concept_ids: value.concept_ids.includes(id)
        ? value.concept_ids.filter(c => c !== id)
        : [...value.concept_ids, id],
    })
  }

  const toggleType = (type: QuestionType) => {
    const next = value.allowed_types.includes(type)
      ? value.allowed_types.filter(t => t !== type)
      : [...value.allowed_types, type]
    if (next.length === 0) return // at least one type
    onChange({ ...value, allowed_types: next })
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Concepts to master</Label>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading concepts…</p>
        ) : concepts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No concepts yet — create them in your{" "}
            <Link href="/teacher/question-bank" className="text-primary hover:underline">
              Question Bank
            </Link>{" "}
            first.
          </p>
        ) : (
          <div className="border rounded-md divide-y max-h-52 overflow-y-auto">
            {concepts.map(concept => {
              const checked = value.concept_ids.includes(concept.id)
              const empty = concept.approved_count === 0
              return (
                <label
                  key={concept.id}
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-2.5 select-none transition-colors",
                    empty ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-muted/50",
                    checked && "bg-primary/5"
                  )}
                >
                  {checked && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-l-md" />}
                  <Checkbox
                    checked={checked}
                    disabled={empty}
                    onCheckedChange={() => toggleConcept(concept.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{concept.name}</p>
                    {concept.unit && (
                      <p className="text-xs text-muted-foreground truncate">{concept.unit}</p>
                    )}
                  </div>
                  <Badge variant={empty ? "outline" : "secondary"} className="flex-shrink-0 text-xs">
                    {empty ? "No questions" : `${concept.approved_count} question${concept.approved_count === 1 ? "" : "s"}`}
                  </Badge>
                </label>
              )
            })}
          </div>
        )}
        {value.concept_ids.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {value.concept_ids.length} concept{value.concept_ids.length === 1 ? "" : "s"} selected —
            students master each one to finish
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Mastery threshold</Label>
        <Select
          value={String(value.mastery_threshold)}
          onValueChange={v => onChange({ ...value, mastery_threshold: Number(v) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0.7">70% — lighter touch</SelectItem>
            <SelectItem value="0.8">80% — recommended</SelectItem>
            <SelectItem value="0.9">90% — strict</SelectItem>
            <SelectItem value="1">100% — perfect streak</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          A concept is mastered when the student&apos;s recent answers hit this accuracy.
          Early mistakes age out — students can always recover.
        </p>
      </div>

      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronsUpDown className="h-3.5 w-3.5" />
          Advanced settings
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Questions per round</Label>
              <Select
                value={String(value.questions_per_round)}
                onValueChange={v => onChange({ ...value, questions_per_round: Number(v) })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 5, 8, 10].map(n => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Minimum questions per concept</Label>
              <Select
                value={String(value.min_questions)}
                onValueChange={v => onChange({ ...value, min_questions: Number(v) })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5].map(n => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Question cap per concept</Label>
              <Select
                value={String(value.max_questions_per_concept)}
                onValueChange={v => onChange({ ...value, max_questions_per_concept: Number(v) })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 15, 20, 30].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} (stops the loop, partial credit)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Accuracy window</Label>
              <Select
                value={String(value.window_size)}
                onValueChange={v => onChange({ ...value, window_size: Number(v) })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 5, 7, 10].map(n => (
                    <SelectItem key={n} value={String(n)}>Last {n} answers</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Question types</Label>
            <div className="space-y-1.5">
              {(Object.keys(TYPE_LABELS) as QuestionType[]).map(type => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={value.allowed_types.includes(type)}
                    onCheckedChange={() => toggleType(type)}
                  />
                  <span className="text-sm">{TYPE_LABELS[type]}</span>
                </label>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
