import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireTeacher } from '@/lib/api-auth'
import { generateMasteryQuestions } from '@/lib/mastery/ai'
import type { QuestionType } from '@/lib/types/question-bank'

export const maxDuration = 120 // one Claude call per concept

interface SuggestBody {
  concept_ids?: string[]
  count?: number
  allowed_types?: QuestionType[]
}

const VALID_TYPES: QuestionType[] = ['multiple_choice', 'true_false', 'short_answer']

// POST - Generate AI question suggestions for one or more concepts.
// Inserted as status='suggested' — nothing reaches students until the teacher
// approves. Style-anchored on the teacher's approved questions.
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireTeacher(request)
    if (error) return error

    const body = (await request.json()) as SuggestBody
    const conceptIds = Array.isArray(body.concept_ids)
      ? body.concept_ids.filter(id => typeof id === 'string').slice(0, 5)
      : []
    if (conceptIds.length === 0) {
      return NextResponse.json({ error: 'Pick at least one concept' }, { status: 400 })
    }
    const count = Math.min(10, Math.max(1, Math.round(Number(body.count)) || 5))
    const allowedTypes = Array.isArray(body.allowed_types)
      ? body.allowed_types.filter(t => VALID_TYPES.includes(t))
      : []
    const types = allowedTypes.length > 0 ? allowedTypes : VALID_TYPES

    const supabase = createAdminClient()

    const { data: concepts } = await supabase
      .from('concepts')
      .select('id, name, description, unit, class_id')
      .eq('teacher_id', user.id)
      .in('id', conceptIds)
    if (!concepts || concepts.length !== conceptIds.length) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 })
    }

    // Style anchors + duplicate-avoidance from the existing bank
    const { data: existing } = await supabase
      .from('question_bank_questions')
      .select('concept_id, type, question_text, options, correct_answer, status')
      .eq('teacher_id', user.id)
      .in('concept_id', conceptIds)
      .neq('status', 'declined')

    // Subject hint from a class-scoped concept when available
    const classIds = concepts.map(c => c.class_id).filter((id): id is string => !!id)
    let subject: string | null = null
    if (classIds.length > 0) {
      const { data: cls } = await supabase
        .from('classes')
        .select('subject')
        .in('id', classIds)
        .limit(1)
        .maybeSingle()
      subject = cls?.subject ?? null
    }

    const results: Array<{ concept_id: string; created: number; error?: string }> = []

    for (const concept of concepts) {
      const conceptQuestions = (existing ?? []).filter(q => q.concept_id === concept.id)
      try {
        const generated = await generateMasteryQuestions({
          concept,
          subject,
          count,
          allowedTypes: types,
          styleExamples: conceptQuestions
            .filter(q => q.status === 'approved')
            .slice(0, 3)
            .map(q => ({
              type: q.type,
              question_text: q.question_text,
              options: q.options,
              correct_answer: q.correct_answer,
            })),
          avoidTexts: conceptQuestions.map(q => q.question_text),
        })

        const { error: insertError } = await supabase.from('question_bank_questions').insert(
          generated.map(g => ({
            teacher_id: user.id,
            concept_id: concept.id,
            type: g.type,
            question_text: g.question_text,
            options: g.type === 'multiple_choice' ? g.options : null,
            correct_answer: g.correct_answer,
            explanation: g.explanation ?? null,
            difficulty: g.difficulty,
            source: 'ai_suggested',
            status: 'suggested',
          }))
        )
        if (insertError) throw new Error(insertError.message)
        results.push({ concept_id: concept.id, created: generated.length })
      } catch (err) {
        console.error(`Suggestion generation failed for concept ${concept.id}:`, err)
        results.push({
          concept_id: concept.id,
          created: 0,
          error: 'Generation failed — try again',
        })
      }
    }

    const totalCreated = results.reduce((sum, r) => sum + r.created, 0)
    if (totalCreated === 0) {
      return NextResponse.json({ error: 'Generation failed — try again', results }, { status: 502 })
    }
    return NextResponse.json({ results, total_created: totalCreated }, { status: 201 })
  } catch (error) {
    console.error('Suggest questions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
