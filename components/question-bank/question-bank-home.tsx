"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, ChevronRight, Library, Sparkles } from "lucide-react"
import ConceptFormDialog from "@/components/question-bank/concept-form-dialog"
import type { ConceptWithCounts } from "@/lib/types/question-bank"

// Client island for the question bank home. Data arrives from the server
// component; mutations go through the API routes, then router.refresh().
export default function QuestionBankHome({ concepts }: { concepts: ConceptWithCounts[] }) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)

  const byUnit = useMemo(() => {
    const groups = new Map<string, ConceptWithCounts[]>()
    for (const c of concepts) {
      const unit = c.unit?.trim() || "Ungrouped"
      const list = groups.get(unit) ?? []
      list.push(c)
      groups.set(unit, list)
    }
    return [...groups.entries()]
  }, [concepts])

  const covered = concepts.filter(c => c.approved_count > 0).length
  const pendingSuggestions = concepts.reduce((sum, c) => sum + c.suggested_count, 0)

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Question Bank</h1>
          <p className="text-muted-foreground text-sm">
            Organize questions by concept. Mastery quizzes pull from approved questions.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New concept
        </Button>
      </div>

      {concepts.length > 0 && (
        <Card className="mb-6">
          <CardContent className="py-4 flex items-center gap-6 flex-wrap text-sm">
            <span className="flex items-center gap-2">
              <Library className="h-4 w-4 text-muted-foreground" />
              <strong>{covered}</strong>&nbsp;of&nbsp;<strong>{concepts.length}</strong>&nbsp;concepts have approved questions
            </span>
            {pendingSuggestions > 0 && (
              <span className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                <Sparkles className="h-4 w-4" />
                {pendingSuggestions} suggestion{pendingSuggestions === 1 ? "" : "s"} awaiting review
              </span>
            )}
          </CardContent>
        </Card>
      )}

      {concepts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground mb-1">No concepts yet.</p>
            <p className="text-muted-foreground text-sm mb-4">
              Concepts are the topics students master — e.g. &quot;Sampling Distributions&quot; or &quot;Stoichiometry&quot;.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first concept
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {byUnit.map(([unit, unitConcepts]) => (
            <section key={unit}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                {unit}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {unitConcepts.map(concept => (
                  <Link key={concept.id} href={`/teacher/question-bank/${concept.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <h3 className="font-semibold text-lg leading-snug min-w-0">{concept.name}</h3>
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        </div>
                        {concept.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {concept.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={concept.approved_count > 0 ? "secondary" : "outline"}>
                            {concept.approved_count} approved
                          </Badge>
                          {concept.suggested_count > 0 && (
                            <Badge className="bg-amber-500 hover:bg-amber-600">
                              {concept.suggested_count} to review
                            </Badge>
                          )}
                          {concept.approved_count === 0 && concept.suggested_count === 0 && (
                            <span className="text-xs text-muted-foreground">Empty — add questions</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <ConceptFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onSaved={() => router.refresh()}
      />
    </>
  )
}
