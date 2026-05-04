import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

const MAX_TITLE_LEN = 200

// GET - Single assignment. Teacher gets full record + class links + submission
// stats. Student gets the assignment if they're enrolled in any linked class
// plus their own submission (if any).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    const { data: assignment, error } = await supabase
      .from('assignments')
      .select('id, teacher_id, title, description, due_at, mark_scheme_url, mark_scheme_text, grading_instructions, total_possible_marks, is_published, created_at, updated_at')
      .eq('id', id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: 'Failed to fetch assignment' }, { status: 500 })
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })

    const isTeacher = assignment.teacher_id === user.id

    // Fetch all class links for this assignment
    const { data: links } = await supabase
      .from('assignment_class_links')
      .select('class_id')
      .eq('assignment_id', id)
    const linkClassIds = (links ?? []).map(l => l.class_id)

    if (!isTeacher) {
      // Student access: must be actively enrolled in at least one linked class
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('class_id')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .in('class_id', linkClassIds)

      if (!enrollments || enrollments.length === 0) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }

      // Student-facing payload: redact mark scheme + grading instructions
      const { mark_scheme_url, mark_scheme_text, grading_instructions, teacher_id, ...studentSafe } = assignment

      // Look up student's own submission
      const { data: submission } = await supabase
        .from('assignment_submissions')
        .select('id, status, file_urls, student_comment, submitted_at, is_late, grading_result_id, updated_at')
        .eq('assignment_id', id)
        .eq('student_id', user.id)
        .maybeSingle()

      return NextResponse.json({
        assignment: studentSafe,
        viewer: 'student',
        my_submission: submission ?? null,
        enrolled_class_ids: enrollments.map(e => e.class_id),
      })
    }

    // Teacher path: include full assignment + class summaries + submission stats
    const [classesRes, submissionsRes] = await Promise.all([
      linkClassIds.length
        ? supabase.from('classes').select('id, name, period, subject').in('id', linkClassIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string; period: string | null; subject: string | null }> }),
      supabase.from('assignment_submissions').select('status').eq('assignment_id', id),
    ])

    const submissions = submissionsRes.data ?? []
    const stats = {
      total: submissions.length,
      submitted: submissions.filter(s => s.status === 'submitted').length,
      grading: submissions.filter(s => s.status === 'grading').length,
      pending_review: submissions.filter(s => s.status === 'pending_review').length,
      graded: submissions.filter(s => s.status === 'graded').length,
      failed: submissions.filter(s => s.status === 'failed').length,
    }

    return NextResponse.json({
      assignment,
      viewer: 'teacher',
      classes: classesRes.data ?? [],
      submission_stats: stats,
    })
  } catch (error) {
    console.error('Get assignment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Teacher edits an assignment. Body may include:
// title, description, due_at, mark_scheme_url, mark_scheme_text,
// grading_instructions, total_possible_marks, is_published, class_ids.
// If class_ids is provided we replace the link set wholesale.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const supabase = createAdminClient()

    const { data: assignment } = await supabase
      .from('assignments').select('id, teacher_id').eq('id', id).maybeSingle()
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    if (assignment.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const updates: Record<string, unknown> = {}
    if ('title' in body) {
      const t = typeof body.title === 'string' ? body.title.trim() : ''
      if (!t) return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
      if (t.length > MAX_TITLE_LEN) return NextResponse.json({ error: 'Title too long' }, { status: 400 })
      updates.title = t
    }
    if ('description' in body) updates.description = body.description ?? null
    if ('due_at' in body) {
      if (body.due_at === null || body.due_at === '') updates.due_at = null
      else {
        const d = new Date(body.due_at)
        if (isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid due_at' }, { status: 400 })
        updates.due_at = d.toISOString()
      }
    }
    if ('mark_scheme_url' in body) updates.mark_scheme_url = body.mark_scheme_url ?? null
    if ('mark_scheme_text' in body) updates.mark_scheme_text = body.mark_scheme_text ?? null
    if ('grading_instructions' in body) updates.grading_instructions = body.grading_instructions ?? null
    if ('total_possible_marks' in body) {
      const v = body.total_possible_marks
      if (v === null || v === '') updates.total_possible_marks = null
      else if (typeof v === 'number' && Number.isFinite(v) && v >= 0) updates.total_possible_marks = Math.round(v)
      else return NextResponse.json({ error: 'Invalid total_possible_marks' }, { status: 400 })
    }
    if ('is_published' in body) {
      if (typeof body.is_published !== 'boolean') {
        return NextResponse.json({ error: 'is_published must be boolean' }, { status: 400 })
      }
      updates.is_published = body.is_published
    }

    let updatedAssignment = assignment
    if (Object.keys(updates).length > 0) {
      const { data: u, error: updateError } = await supabase
        .from('assignments')
        .update(updates)
        .eq('id', id)
        .select('id, title, description, due_at, mark_scheme_url, mark_scheme_text, grading_instructions, total_possible_marks, is_published, created_at, updated_at')
        .single()
      if (updateError || !u) {
        console.error('Error updating assignment:', updateError)
        return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 })
      }
      updatedAssignment = { ...assignment, ...u }
    }

    // Replace class links wholesale if class_ids provided
    if (Array.isArray(body.class_ids)) {
      const newIds = body.class_ids.filter((x: unknown) => typeof x === 'string') as string[]
      if (newIds.length === 0) {
        return NextResponse.json({ error: 'Assignment must be linked to at least one class' }, { status: 400 })
      }
      const { data: ownedClasses } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', user.id)
        .in('id', newIds)
      const ownedIds = new Set((ownedClasses ?? []).map(c => c.id))
      const missing = newIds.filter(c => !ownedIds.has(c))
      if (missing.length > 0) {
        return NextResponse.json({ error: 'One or more selected classes are not yours' }, { status: 403 })
      }

      await supabase.from('assignment_class_links').delete().eq('assignment_id', id)
      const rows = newIds.map(class_id => ({ assignment_id: id, class_id }))
      const { error: linkError } = await supabase.from('assignment_class_links').insert(rows)
      if (linkError) {
        console.error('Error replacing class links:', linkError)
        return NextResponse.json({ error: 'Failed to update class links' }, { status: 500 })
      }
    }

    return NextResponse.json({ assignment: updatedAssignment })
  } catch (error) {
    console.error('Update assignment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Teacher deletes an assignment. Cascades to links and submissions.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })

    const { id } = await params
    const supabase = createAdminClient()

    const { data: assignment } = await supabase
      .from('assignments').select('id, teacher_id').eq('id', id).maybeSingle()
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    if (assignment.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { error } = await supabase.from('assignments').delete().eq('id', id)
    if (error) {
      console.error('Error deleting assignment:', error)
      return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete assignment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
