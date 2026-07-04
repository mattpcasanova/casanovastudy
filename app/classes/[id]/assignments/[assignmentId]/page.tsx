import { notFound, redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import FileUploadAssignment from "@/components/student-assignments/file-upload-assignment"
import MasteryPlayer from "@/components/mastery/mastery-player"

export default async function StudentAssignmentPage({
  params,
}: {
  params: Promise<{ id: string; assignmentId: string }>
}) {
  const { id, assignmentId } = await params

  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/signin")

  // Visibility is governed by RLS: students see assignments via enrolled
  // classes (migration 024); teachers see their own assignments.
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, type, title, description, due_at")
    .eq("id", assignmentId)
    .maybeSingle()

  if (!assignment) notFound()

  if (assignment.type === "mastery_quiz") {
    return (
      <MasteryPlayer
        assignmentId={assignmentId}
        classId={id}
        title={assignment.title}
        description={assignment.description}
        dueAt={assignment.due_at}
      />
    )
  }

  return <FileUploadAssignment />
}
