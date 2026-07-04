import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireTeacher } from '@/lib/api-auth'
import { validateQuestionInput, type QuestionInput } from '@/lib/types/question-bank'

// GET - List the teacher's questions. Filters: ?concept_id=, ?status=, ?source=
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireTeacher(request)
    if (error) return error

    const supabase = createAdminClient()
    const { searchParams } = request.nextUrl

    let query = supabase
      .from('question_bank_questions')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    const conceptId = searchParams.get('concept_id')
    if (conceptId) query = query.eq('concept_id', conceptId)

    const status = searchParams.get('status')
    if (status) query = query.eq('status', status)

    const source = searchParams.get('source')
    if (source) query = query.eq('source', source)

    const { data: questions, error: qError } = await query
    if (qError) {
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }

    return NextResponse.json({ questions: questions ?? [] })
  } catch (error) {
    console.error('Question bank GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Manually author a question (source='manual', status='approved')
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireTeacher(request)
    if (error) return error

    const body = (await request.json()) as QuestionInput
    const validationError = validateQuestionInput(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: concept } = await supabase
      .from('concepts')
      .select('id, teacher_id')
      .eq('id', body.concept_id)
      .maybeSingle()
    if (!concept || concept.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 })
    }

    const difficulty = [1, 2, 3].includes(body.difficulty as number) ? body.difficulty : 2

    const { data: question, error: insertError } = await supabase
      .from('question_bank_questions')
      .insert({
        teacher_id: user.id,
        concept_id: body.concept_id,
        type: body.type,
        question_text: body.question_text.trim(),
        options: body.type === 'multiple_choice' ? body.options : null,
        correct_answer: body.correct_answer,
        explanation: body.explanation?.trim() || null,
        difficulty,
        source: 'manual',
        status: 'approved',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create question' }, { status: 500 })
    }

    return NextResponse.json({ question }, { status: 201 })
  } catch (error) {
    console.error('Question bank POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
