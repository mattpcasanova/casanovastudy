import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireTeacher } from '@/lib/api-auth'

// GET - List the teacher's concepts with per-concept question counts.
// Optional ?class_id= filters to concepts scoped to that class or unscoped.
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await requireTeacher(request)
    if (error) return error

    const supabase = createAdminClient()
    const classId = request.nextUrl.searchParams.get('class_id')

    let query = supabase
      .from('concepts')
      .select('*')
      .eq('teacher_id', user.id)
      .order('unit', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true })

    if (classId) {
      query = query.or(`class_id.eq.${classId},class_id.is.null`)
    }

    const { data: concepts, error: conceptsError } = await query
    if (conceptsError) {
      return NextResponse.json({ error: 'Failed to fetch concepts' }, { status: 500 })
    }

    // Question counts per concept (approved + pending suggestions)
    const { data: questionRows, error: qError } = await supabase
      .from('question_bank_questions')
      .select('concept_id, status')
      .eq('teacher_id', user.id)
      .in('status', ['approved', 'suggested'])

    if (qError) {
      return NextResponse.json({ error: 'Failed to fetch question counts' }, { status: 500 })
    }

    const counts = new Map<string, { approved: number; suggested: number }>()
    for (const row of questionRows ?? []) {
      const entry = counts.get(row.concept_id) ?? { approved: 0, suggested: 0 }
      if (row.status === 'approved') entry.approved++
      else entry.suggested++
      counts.set(row.concept_id, entry)
    }

    const withCounts = (concepts ?? []).map(c => ({
      ...c,
      approved_count: counts.get(c.id)?.approved ?? 0,
      suggested_count: counts.get(c.id)?.suggested ?? 0,
    }))

    return NextResponse.json({ concepts: withCounts })
  } catch (error) {
    console.error('Concepts GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a concept (name required; class_id, description, unit optional)
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireTeacher(request)
    if (error) return error

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return NextResponse.json({ error: 'Concept name is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // If class-scoped, the class must belong to this teacher
    const classId = body.class_id ?? null
    if (classId) {
      const { data: cls } = await supabase
        .from('classes')
        .select('id, teacher_id')
        .eq('id', classId)
        .maybeSingle()
      if (!cls || cls.teacher_id !== user.id) {
        return NextResponse.json({ error: 'Class not found' }, { status: 404 })
      }
    }

    const { data: concept, error: insertError } = await supabase
      .from('concepts')
      .insert({
        teacher_id: user.id,
        class_id: classId,
        name,
        description: body.description?.trim() || null,
        unit: body.unit?.trim() || null,
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'A concept with that name already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create concept' }, { status: 500 })
    }

    return NextResponse.json({ concept }, { status: 201 })
  } catch (error) {
    console.error('Concepts POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
