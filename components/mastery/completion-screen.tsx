"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, PartyPopper } from "lucide-react"
import ConceptProgress from "@/components/mastery/concept-progress"
import type {
  MasteryConceptInfo,
  MasteryConfigView,
  MasteryFinalScore,
  MasteryRollup,
} from "@/components/mastery/types"

export default function CompletionScreen({
  classId,
  concepts,
  rollups,
  config,
  finalScore,
}: {
  classId: string
  concepts: MasteryConceptInfo[]
  rollups: MasteryRollup[]
  config: MasteryConfigView
  finalScore: MasteryFinalScore
}) {
  const allMastered = finalScore.mastered === finalScore.total

  return (
    <Card>
      <CardContent className="p-8 text-center">
        {allMastered ? (
          <PartyPopper className="h-12 w-12 text-green-600 mx-auto mb-4" />
        ) : (
          <Trophy className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        )}
        <h2 className="text-2xl font-bold mb-1">
          {allMastered ? "All concepts mastered!" : "Quiz complete"}
        </h2>
        <p className="text-muted-foreground mb-6">
          You mastered {finalScore.mastered} of {finalScore.total} concepts ({finalScore.percentage}%).
          {!allMastered && " Concepts marked “Needs review” are worth revisiting with your teacher."}
        </p>

        <div className="text-left max-w-md mx-auto mb-8">
          <ConceptProgress concepts={concepts} rollups={rollups} config={config} />
        </div>

        <Button asChild>
          <Link href={`/classes/${classId}`}>Back to class</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
