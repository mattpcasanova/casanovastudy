import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

const MAX_TITLE_LEN = 200

interface CreateBody {
  title?: string
  description?: string | null
  due_at?: string | null
  mark_scheme_url?: string | null
  mark_scheme_text?: string | null
  grading_instructions?: string | null
  total_possible_marks?: number | null
  class_ids?: string[]
  is_published?: boolean
  type?: 'file_upload' | 'mastery_quiz'
  mastery?: {
    concept_ids?: string[]
    mastery_threshold?: number
    questions_per_round?: number
    window_size?: number
    min_questions?: number
    max_questions_per_concept?: number
    allowed_types?: string[]
    allow_ai_fallback?: boolean
  }
}

// GET - Teacher's assignments (with linked class names + submission counts).
// ?classId=<id> filters to assignments linked to that class.
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const classIdFilter = searchParams.get('classId')

    const supabase = createAdminClient()

    let assignmentsQuery = supabase
      .from('assignments')
      .select('id, type, title, description, due_at, mark_scheme_url, mark_scheme_text, grading_instructions, total_possible_marks, is_published, created_at, updated_at')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    if (classIdFilter) {
      const { data: linkedAssignmentIds } = await supabase
        .from('assignment_class_links')
        .select('assignment_id')
        .eq('class_id', classIdFilter)
      const ids = (linkedAssignmentIds ?? []).map(r => r.assignment_id)
      if (ids.length === 0) return NextResponse.json({ assignments: [] })
      assignmentsQuery = assignmentsQuery.in('id', ids)
    }

    const { data: assignments, error } = await assignmentsQuery

    if (error) {
      console.error('Error fetching assignments:', error)
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
    }
    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ assignments: [] })
    }

    const assignmentIds = assignments.map(a => a.id)

    // Pull links + class names + submission counts in parallel
    const [linksRes, submissionsRes] = await Promise.all([
      supabase
        .from('assignment_class_links')
        .select('assignment_id, class_id')
        .in('assignment_id', assignmentIds),
      supabase
        .from('assignment_submissions')
        .select('assignment_id, status')
        .in('assignment_id', assignmentIds),
    ])

    const links = linksRes.data ?? []
    const submissions = submissionsRes.data ?? []
    const classIds = Array.from(new Set(links.map(l => l.class_id)))

    const { data: classes } = classIds.length
      ? await supabase.from('classes').select('id, name, period').in('id', classIds)
      : { data: [] }

    const classMap = new Map((classes ?? []).map(c => [c.id, c]))

    const linksByAssignment = new Map<string, Array<{ id: string; name: string; period: string | null }>>()
    for (const l of links) {
      const cls = classMap.get(l.class_id)
      if (!cls) continue
      const arr = linksByAssignment.get(l.assignment_id) ?? []
      arr.push(cls)
      linksByAssignment.set(l.assignment_id, arr)
    }

    const submissionsByAssignment = new Map<string, { total: number; pending: number; graded: number }>()
    for (const s of submissions) {
      const stats = submissionsByAssignment.get(s.assignment_id) ?? { total: 0, pending: 0, graded: 0 }
      stats.total++
      if (s.status === 'pending_review' || s.status === 'submitted' || s.status === 'grading') stats.pending++
      if (s.status === 'graded') stats.graded++
      submissionsByAssignment.set(s.assignment_id, stats)
    }

    const result = assignments.map(a => ({
      ...a,
      classes: linksByAssignment.get(a.id) ?? [],
      submission_stats: submissionsByAssignment.get(a.id) ?? { total: 0, pending: 0, graded: 0 },
    }))

    return NextResponse.json({ assignments: result })
  } catch (error) {
    console.error('List assignments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Teacher creates an assignment and links it to one or more of their classes.
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const body = (await request.json()) as CreateBody
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    if (title.length > MAX_TITLE_LEN) return NextResponse.json({ error: 'Title too long' }, { status: 400 })

    const classIds = Array.isArray(body.class_ids) ? body.class_ids.filter(id => typeof id === 'string') : []
    if (classIds.length === 0) {
      return NextResponse.json({ error: 'Pick at least one class' }, { status: 400 })
    }

    let dueAt: string | null = null
    if (body.due_at) {
      const d = new Date(body.due_at)
      if (isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid due_at' }, { status: 400 })
      dueAt = d.toISOString()
    }

    const supabase = createAdminClient()

    const { data: profile } = await supabase
      .from('user_profiles').select('user_type').eq('id', user.id).single()
    if (profile?.user_type !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can create assignments' }, { status: 403 })
    }

    // Verify all class_ids belong to this teacher
    const { data: ownedClasses } = await supabase
      .from('classes')
      .select('id')
      .eq('teacher_id', user.id)
      .in('id', classIds)
    const ownedIds = new Set((ownedClasses ?? []).map(c => c.id))
    const missing = classIds.filter(id => !ownedIds.has(id))
    if (missing.length > 0) {
      return NextResponse.json({ error: 'One or more selected classes are not yours' }, { status: 403 })
    }

    const type = body.type === 'mastery_quiz' ? 'mastery_quiz' : 'file_upload'

    // Mastery quizzes: validate concept selection before creating anything.
    // Until AI runtime fallback ships, every concept needs at least one
    // approved question or the loop could never complete.
    let conceptIds: string[] = []
    if (type === 'mastery_quiz') {
      conceptIds = Array.isArray(body.mastery?.concept_ids)
        ? body.mastery!.concept_ids!.filter(id => typeof id === 'string')
        : []
      if (conceptIds.length === 0) {
        return NextResponse.json({ error: 'Pick at least one concept' }, { status: 400 })
      }

      const { data: concepts } = await supabase
        .from('concepts')
        .select('id, name')
        .eq('teacher_id', user.id)
        .in('id', conceptIds)
      const ownedConceptIds = new Set((concepts ?? []).map(c => c.id))
      if (conceptIds.some(id => !ownedConceptIds.has(id))) {
        return NextResponse.json({ error: 'One or more selected concepts are not yours' }, { status: 403 })
      }

      const { data: approvedQuestions } = await supabase
        .from('question_bank_questions')
        .select('concept_id')
        .eq('teacher_id', user.id)
        .eq('status', 'approved')
        .in('concept_id', conceptIds)
      const coveredIds = new Set((approvedQuestions ?? []).map(q => q.concept_id))
      const emptyConcepts = (concepts ?? []).filter(c => !coveredIds.has(c.id))
      if (emptyConcepts.length > 0) {
        return NextResponse.json(
          { error: `These concepts have no approved questions yet: ${emptyConcepts.map(c => c.name).join(', ')}. Add questions in the Question Bank first.` },
          { status: 400 }
        )
      }
    }

    const { data: created, error: insertError } = await supabase
      .from('assignments')
      .insert({
        teacher_id: user.id,
        type,
        title,
        description: body.description ?? null,
        due_at: dueAt,
        mark_scheme_url: type === 'file_upload' ? body.mark_scheme_url ?? null : null,
        mark_scheme_text: type === 'file_upload' ? body.mark_scheme_text ?? null : null,
        grading_instructions: type === 'file_upload' ? body.grading_instructions ?? null : null,
        // Mastery score = mastered concepts / total concepts
        total_possible_marks: type === 'mastery_quiz' ? conceptIds.length : body.total_possible_marks ?? null,
        is_published: body.is_published ?? true,
      })
      .select('id, type, title, description, due_at, mark_scheme_url, mark_scheme_text, grading_instructions, total_possible_marks, is_published, created_at, updated_at')
      .single()

    if (insertError || !created) {
      console.error('Error creating assignment:', insertError)
      return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 })
    }

    const cleanupAndFail = async (message: string) => {
      // Best-effort cleanup so we don't leave an orphan assignment
      await supabase.from('assignments').delete().eq('id', created.id)
      return NextResponse.json({ error: message }, { status: 500 })
    }

    if (type === 'mastery_quiz') {
      const m = body.mastery ?? {}
      const clamp = (v: unknown, lo: number, hi: number, dflt: number) => {
        const n = Number(v)
        return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n * 100) / 100)) : dflt
      }
      const allowedTypes = Array.isArray(m.allowed_types)
        ? m.allowed_types.filter(t => ['multiple_choice', 'true_false', 'short_answer'].includes(t))
        : []

      const { error: configError } = await supabase.from('assignment_mastery_config').insert({
        assignment_id: created.id,
        mastery_threshold: clamp(m.mastery_threshold, 0.5, 1, 0.8),
        window_size: clamp(m.window_size, 3, 10, 5),
        min_questions: clamp(m.min_questions, 1, 10, 3),
        max_questions_per_concept: clamp(m.max_questions_per_concept, 5, 50, 15),
        questions_per_round: clamp(m.questions_per_round, 1, 15, 5),
        allowed_types: allowedTypes.length > 0 ? allowedTypes : ['multiple_choice', 'true_false', 'short_answer'],
        allow_ai_fallback: m.allow_ai_fallback ?? true,
      })
      if (configError) {
        console.error('Error creating mastery config:', configError)
        return cleanupAndFail('Failed to create mastery quiz settings')
      }

      const conceptRows = conceptIds.map(concept_id => ({ assignment_id: created.id, concept_id }))
      const { error: conceptError } = await supabase.from('assignment_mastery_concepts').insert(conceptRows)
      if (conceptError) {
        console.error('Error linking mastery concepts:', conceptError)
        return cleanupAndFail('Failed to link concepts to the mastery quiz')
      }
    }

    const linkRows = classIds.map(class_id => ({ assignment_id: created.id, class_id }))
    const { error: linkError } = await supabase.from('assignment_class_links').insert(linkRows)
    if (linkError) {
      console.error('Error linking assignment to classes:', linkError)
      return cleanupAndFail('Failed to link assignment to classes')
    }

    return NextResponse.json({ assignment: { ...created, class_ids: classIds } }, { status: 201 })
  } catch (error) {
    console.error('Create assignment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
