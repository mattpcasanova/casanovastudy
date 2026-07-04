import { redirect } from "next/navigation"
import NavigationHeader from "@/components/navigation-header"
import ClassesSectionNav from "@/components/classes-section-nav"
import QuestionBankHome from "@/components/question-bank/question-bank-home"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { ConceptWithCounts } from "@/lib/types/question-bank"

// Server component: auth + data fetching happen here; interactivity lives in
// the QuestionBankHome client island, which calls the API routes and
// router.refresh()es to re-render this page with fresh data.
export default async function QuestionBankPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/signin")

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_type")
    .eq("id", user.id)
    .single()
  if (profile?.user_type !== "teacher") redirect("/")

  // RLS scopes both queries to this teacher
  const [{ data: concepts }, { data: questionRows }] = await Promise.all([
    supabase
      .from("concepts")
      .select("*")
      .order("unit", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true }),
    supabase
      .from("question_bank_questions")
      .select("concept_id, status")
      .in("status", ["approved", "suggested"]),
  ])

  const counts = new Map<string, { approved: number; suggested: number }>()
  for (const row of questionRows ?? []) {
    const entry = counts.get(row.concept_id) ?? { approved: 0, suggested: 0 }
    if (row.status === "approved") entry.approved++
    else entry.suggested++
    counts.set(row.concept_id, entry)
  }

  const conceptsWithCounts: ConceptWithCounts[] = (concepts ?? []).map(c => ({
    ...c,
    approved_count: counts.get(c.id)?.approved ?? 0,
    suggested_count: counts.get(c.id)?.suggested ?? 0,
  }))

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="container mx-auto px-4 py-8">
        <ClassesSectionNav />
        <QuestionBankHome concepts={conceptsWithCounts} />
      </div>
    </div>
  )
}
