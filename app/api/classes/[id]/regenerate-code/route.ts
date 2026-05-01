import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

// POST - Teacher regenerates the enrollment code for a class.
// Useful if a code has leaked beyond the intended roster.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Class id required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: cls, error: lookupError } = await supabase
      .from('classes')
      .select('id, teacher_id')
      .eq('id', id)
      .maybeSingle()

    if (lookupError) {
      return NextResponse.json({ error: 'Failed to fetch class' }, { status: 500 })
    }
    if (!cls) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }
    if (cls.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { data: codeData, error: codeError } = await supabase.rpc('generate_class_code')
    if (codeError || typeof codeData !== 'string') {
      console.error('Error generating class code:', codeError)
      return NextResponse.json({ error: 'Failed to generate enrollment code' }, { status: 500 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('classes')
      .update({ enrollment_code: codeData })
      .eq('id', id)
      .select('id, enrollment_code')
      .single()

    if (updateError) {
      console.error('Error updating enrollment code:', updateError)
      return NextResponse.json({ error: 'Failed to update enrollment code' }, { status: 500 })
    }

    return NextResponse.json({ class: updated })
  } catch (error) {
    console.error('Regenerate code error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
