import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireTeacher } from '@/lib/api-auth'

async function getOwnedConcept(teacherId: string, conceptId: string) {
  const supabase = createAdminClient()
  const { data: concept } = await supabase
    .from('concepts')
    .select('*')
    .eq('id', conceptId)
    .maybeSingle()
  if (!concept || concept.teacher_id !== teacherId) return null
  return concept
}

// PATCH - Update name/description/unit/class_id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireTeacher(request)
    if (error) return error

    const { id } = await params
    const concept = await getOwnedConcept(user.id, id)
    if (!concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (typeof body.name === 'string') {
      const name = body.name.trim()
      if (!name) return NextResponse.json({ error: 'Concept name cannot be empty' }, { status: 400 })
      updates.name = name
    }
    if ('description' in body) updates.description = body.description?.trim() || null
    if ('unit' in body) updates.unit = body.unit?.trim() || null
    if ('class_id' in body) updates.class_id = body.class_id ?? null

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: updated, error: updateError } = await supabase
      .from('concepts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === '23505') {
        return NextResponse.json({ error: 'A concept with that name already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to update concept' }, { status: 500 })
    }

    return NextResponse.json({ concept: updated })
  } catch (error) {
    console.error('Concept PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove a concept. Questions cascade; blocked (409) if the concept
// is referenced by a mastery assignment (FK RESTRICT).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireTeacher(request)
    if (error) return error

    const { id } = await params
    const concept = await getOwnedConcept(user.id, id)
    if (!concept) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 })
    }

    const supabase = createAdminClient()
    const { error: deleteError } = await supabase
      .from('concepts')
      .delete()
      .eq('id', id)

    if (deleteError) {
      if (deleteError.code === '23503') {
        return NextResponse.json(
          { error: 'This concept is used by a mastery quiz assignment and cannot be deleted' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to delete concept' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Concept DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
