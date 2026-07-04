"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles } from "lucide-react"
import ConceptProgress from "@/components/mastery/concept-progress"
import type {
  MasteryConceptInfo,
  MasteryConfigView,
  MasteryRollup,
} from "@/components/mastery/types"

export default function RoundSummary({
  round,
  concepts,
  rollups,
  config,
  newlyMastered,
  loadingNext,
  onContinue,
}: {
  round: number
  concepts: MasteryConceptInfo[]
  rollups: MasteryRollup[]
  config: MasteryConfigView
  newlyMastered: string[]
  loadingNext: boolean
  onContinue: () => void
}) {
  const remaining = rollups.filter(r => r.status === "in_progress").length

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-1">Round {round} complete</h2>
        <p className="text-sm text-muted-foreground mb-5">
          {remaining === 0
            ? "All concepts resolved — wrapping up."
            : `${remaining} concept${remaining === 1 ? "" : "s"} still to master. Keep going!`}
        </p>

        {newlyMastered.length > 0 && (
          <div className="mb-5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 p-4">
            <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Mastered this round: {newlyMastered.join(", ")}
            </p>
          </div>
        )}

        <ConceptProgress concepts={concepts} rollups={rollups} config={config} />

        <div className="mt-6 flex justify-end">
          <Button onClick={onContinue} disabled={loadingNext}>
            {loadingNext && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
