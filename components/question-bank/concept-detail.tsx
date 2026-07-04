"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Loader2, Pencil, Plus, Sparkles, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import ConceptFormDialog from "@/components/question-bank/concept-form-dialog"
import ManualQuestionForm from "@/components/question-bank/manual-question-form"
import QuestionCard from "@/components/question-bank/question-card"
import type { ConceptRecord, QuestionRecord } from "@/lib/types/question-bank"

interface ConceptDetailProps {
  concept: ConceptRecord
  questions: QuestionRecord[]
}

export default function ConceptDetail({ concept, questions }: ConceptDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [editConceptOpen, setEditConceptOpen] = useState(false)
  const [deleteConceptOpen, setDeleteConceptOpen] = useState(false)
  const [questionFormOpen, setQuestionFormOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuestionRecord | undefined>(undefined)
  const [suggesting, setSuggesting] = useState(false)

  const approved = questions.filter(q => q.status === "approved")
  const suggested = questions.filter(q => q.status === "suggested")
  const archived = questions.filter(q => q.status === "archived")

  const openCreateQuestion = () => {
    setEditingQuestion(undefined)
    setQuestionFormOpen(true)
  }

  const openEditQuestion = (question: QuestionRecord) => {
    setEditingQuestion(question)
    setQuestionFormOpen(true)
  }

  const handleSuggest = async () => {
    setSuggesting(true)
    try {
      const res = await fetch("/api/question-bank/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept_ids: [concept.id], count: 5 }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to generate suggestions", variant: "destructive" })
        return
      }
      toast({ title: `${json.total_created} suggestion${json.total_created === 1 ? "" : "s"} ready to review` })
      router.refresh()
    } catch {
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setSuggesting(false)
    }
  }

  const handleReview = async (question: QuestionRecord, action: "approve" | "decline") => {
    const res = await fetch(`/api/question-bank/${question.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action === "approve" ? "approved" : "declined" }),
    })
    if (!res.ok) {
      const json = await res.json()
      toast({ title: json.error ?? "Failed to update question", variant: "destructive" })
      return
    }
    router.refresh()
  }

  const handleArchiveToggle = async (question: QuestionRecord) => {
    const nextStatus = question.status === "archived" ? "approved" : "archived"
    const res = await fetch(`/api/question-bank/${question.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    })
    if (!res.ok) {
      const json = await res.json()
      toast({ title: json.error ?? "Failed to update question", variant: "destructive" })
      return
    }
    router.refresh()
  }

  const handleDeleteConcept = async () => {
    const res = await fetch(`/api/concepts/${concept.id}`, { method: "DELETE" })
    const json = await res.json()
    if (!res.ok) {
      toast({ title: json.error ?? "Failed to delete concept", variant: "destructive" })
      return
    }
    router.push("/teacher/question-bank")
    router.refresh()
  }

  return (
    <>
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
          <Link href="/teacher/question-bank">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Question Bank
          </Link>
        </Button>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">{concept.name}</h1>
              {concept.unit && <Badge variant="outline">{concept.unit}</Badge>}
            </div>
            {concept.description && (
              <p className="text-muted-foreground text-sm mt-1 max-w-2xl">{concept.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setEditConceptOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteConceptOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button variant="outline" size="sm" onClick={handleSuggest} disabled={suggesting}>
              {suggesting
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <Sparkles className="h-4 w-4 mr-2" />}
              {suggesting ? "Generating…" : "Suggest with AI"}
            </Button>
            <Button size="sm" onClick={openCreateQuestion}>
              <Plus className="h-4 w-4 mr-2" />
              Add question
            </Button>
          </div>
        </div>
      </div>

      {suggested.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-500 mb-3">
            Awaiting review ({suggested.length})
          </h2>
          <div className="space-y-3">
            {suggested.map(q => (
              <QuestionCard
                key={q.id}
                question={q}
                onEdit={openEditQuestion}
                onArchiveToggle={handleArchiveToggle}
                onReview={handleReview}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Approved ({approved.length})
        </h2>
        {approved.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-1">No approved questions yet.</p>
              <p className="text-muted-foreground text-sm mb-4">
                Mastery quizzes serve approved questions from this concept&apos;s bank.
              </p>
              <Button onClick={openCreateQuestion}>
                <Plus className="h-4 w-4 mr-2" />
                Write the first question
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {approved.map(q => (
              <QuestionCard
                key={q.id}
                question={q}
                onEdit={openEditQuestion}
                onArchiveToggle={handleArchiveToggle}
              />
            ))}
          </div>
        )}
      </section>

      {archived.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Archived ({archived.length})
          </h2>
          <div className="space-y-3">
            {archived.map(q => (
              <QuestionCard
                key={q.id}
                question={q}
                onEdit={openEditQuestion}
                onArchiveToggle={handleArchiveToggle}
              />
            ))}
          </div>
        </section>
      )}

      <ConceptFormDialog
        open={editConceptOpen}
        onOpenChange={setEditConceptOpen}
        mode="edit"
        concept={concept}
        onSaved={() => router.refresh()}
      />

      <ManualQuestionForm
        open={questionFormOpen}
        onOpenChange={setQuestionFormOpen}
        conceptId={concept.id}
        question={editingQuestion}
        onSaved={() => router.refresh()}
      />

      <AlertDialog open={deleteConceptOpen} onOpenChange={setDeleteConceptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{concept.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the concept and all {questions.length} of its
              questions. Concepts used by a mastery quiz assignment can&apos;t be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConcept}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete concept
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
