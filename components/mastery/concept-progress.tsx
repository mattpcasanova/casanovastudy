"use client"

import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, CircleDashed, AlertCircle } from "lucide-react"
import type { MasteryConceptInfo, MasteryConfigView, MasteryRollup } from "@/components/mastery/types"

// Per-concept progress: window accuracy toward the mastery threshold.
// A concept shows as mastered/capped via its status, not the bar alone.
export default function ConceptProgress({
  concepts,
  rollups,
  config,
  compact = false,
}: {
  concepts: MasteryConceptInfo[]
  rollups: MasteryRollup[]
  config: MasteryConfigView
  compact?: boolean
}) {
  const rollupMap = new Map(rollups.map(r => [r.concept_id, r]))

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      {concepts.map(concept => {
        const rollup = rollupMap.get(concept.id)
        const recent = rollup?.recent_results ?? []
        const accuracy = recent.length === 0 ? 0 : recent.filter(Boolean).length / recent.length
        const pct = Math.round((accuracy / config.mastery_threshold) * 100)
        const status = rollup?.status ?? "in_progress"

        return (
          <div key={concept.id}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`truncate ${compact ? "text-sm" : "text-sm font-medium"}`}>
                {concept.name}
              </span>
              {status === "mastered" ? (
                <Badge className="bg-green-600 hover:bg-green-600 flex-shrink-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Mastered
                </Badge>
              ) : status === "max_reached" ? (
                <Badge variant="outline" className="text-amber-600 border-amber-300 flex-shrink-0">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Needs review
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                  <CircleDashed className="h-3 w-3" />
                  {rollup ? `${rollup.correct_count}/${rollup.answered_count}` : "Not started"}
                </span>
              )}
            </div>
            <Progress
              value={status === "mastered" ? 100 : Math.min(pct, 99)}
              className={compact ? "h-1.5" : "h-2"}
            />
          </div>
        )
      })}
    </div>
  )
}
