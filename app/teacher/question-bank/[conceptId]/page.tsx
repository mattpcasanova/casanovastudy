import { notFound, redirect } from "next/navigation"
import NavigationHeader from "@/components/navigation-header"
import ClassesSectionNav from "@/components/classes-section-nav"
import ConceptDetail from "@/components/question-bank/concept-detail"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { ConceptRecord, QuestionRecord } from "@/lib/types/question-bank"

// Server component: fetches one concept + its questions (RLS-scoped to the
// signed-in teacher). All interactions live in the ConceptDetail client island.
export default async function ConceptDetailPage({
  params,
}: {
  params: Promise<{ conceptId: string }>
}) {
  const { conceptId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/signin")

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_type")
    .eq("id", user.id)
    .single()
  if (profile?.user_type !== "teacher") redirect("/")

  const { data: concept } = await supabase
    .from("concepts")
    .select("*")
    .eq("id", conceptId)
    .maybeSingle()
  if (!concept) notFound()

  const { data: questions } = await supabase
    .from("question_bank_questions")
    .select("*")
    .eq("concept_id", conceptId)
    .neq("status", "declined")
    .order("status", { ascending: false }) // suggested before approved/archived
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="container mx-auto px-4 py-8">
        <ClassesSectionNav />
        <ConceptDetail
          concept={concept as ConceptRecord}
          questions={(questions ?? []) as QuestionRecord[]}
        />
      </div>
    </div>
  )
}
