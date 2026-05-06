import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

// GET - fetch class IDs this guide is currently assigned to (teacher/owner only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createAdminClient()

    const { data: guide } = await supabase
      .from('study_guides')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!guide) return NextResponse.json({ error: 'Study guide not found' }, { status: 404 })
    if (guide.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await supabase
      .from('study_guide_assignments')
      .select('class_id')
      .eq('study_guide_id', id)

    if (error) return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })

    return NextResponse.json({ classIds: (data ?? []).map(r => r.class_id) })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - assign guide to one or more classes (upsert, idempotent)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const classIds: string[] = Array.isArray(body?.classIds) ? body.classIds : []
    if (classIds.length === 0) return NextResponse.json({ error: 'classIds must be a non-empty array' }, { status: 400 })

    const supabase = createAdminClient()

    const { data: guide } = await supabase
      .from('study_guides')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!guide) return NextResponse.json({ error: 'Study guide not found' }, { status: 404 })
    if (guide.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Verify the teacher owns all specified classes
    const { data: ownedClasses } = await supabase
      .from('classes')
      .select('id')
      .eq('teacher_id', user.id)
      .in('id', classIds)

    const ownedIds = new Set((ownedClasses ?? []).map(c => c.id))
    const unauthorized = classIds.filter(cid => !ownedIds.has(cid))
    if (unauthorized.length > 0) {
      return NextResponse.json({ error: 'You do not own all specified classes' }, { status: 403 })
    }

    const rows = classIds.map(class_id => ({
      study_guide_id: id,
      class_id,
      assigned_by: user.id,
    }))

    const { error } = await supabase
      .from('study_guide_assignments')
      .upsert(rows, { onConflict: 'study_guide_id,class_id' })

    if (error) {
      console.error('Assign error:', error)
      return NextResponse.json({ error: 'Failed to assign guide' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - unassign guide from a single class (?class_id=X)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('class_id')
    if (!classId) return NextResponse.json({ error: 'class_id query param is required' }, { status: 400 })

    const supabase = createAdminClient()

    const { data: guide } = await supabase
      .from('study_guides')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!guide) return NextResponse.json({ error: 'Study guide not found' }, { status: 404 })
    if (guide.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: cls } = await supabase
      .from('classes')
      .select('id')
      .eq('id', classId)
      .eq('teacher_id', user.id)
      .single()

    if (!cls) return NextResponse.json({ error: 'Class not found or you do not own it' }, { status: 403 })

    const { error } = await supabase
      .from('study_guide_assignments')
      .delete()
      .eq('study_guide_id', id)
      .eq('class_id', classId)

    if (error) return NextResponse.json({ error: 'Failed to unassign guide' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
