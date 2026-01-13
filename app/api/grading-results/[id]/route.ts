import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createAdminClient } from '@/lib/supabase-server'

interface MetadataUpdateBody {
  userId?: string
  studentFirstName?: string | null
  studentLastName?: string | null
  studentUserId?: string | null
  className?: string | null
  classPeriod?: string | null
  examTitle?: string | null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: MetadataUpdateBody = await request.json()

    // Get authenticated user from cookies or body
    let userId: string | null = null
    const cookieUser = await getAuthenticatedUser(request)

    if (cookieUser) {
      userId = cookieUser.id
    } else if (body.userId) {
      userId = body.userId
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()

    // Check user is a teacher
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { success: false, error: 'Failed to verify user profile' },
        { status: 500 }
      )
    }

    if (userProfile.user_type !== 'teacher') {
      return NextResponse.json(
        { success: false, error: 'Only teachers can edit grading results' },
        { status: 403 }
      )
    }

    // Verify the user owns this grading result
    const { data: result, error: fetchError } = await supabase
      .from('grading_results')
      .select('user_id, student_first_name, student_last_name, student_user_id, class_name, class_period, exam_title')
      .eq('id', id)
      .single()

    if (fetchError || !result) {
      return NextResponse.json(
        { success: false, error: 'Grading result not found' },
        { status: 404 }
      )
    }

    if (result.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to edit this grading result' },
        { status: 403 }
      )
    }

    // Build update object with only provided fields
    const updateData: Record<string, string | null> = {}

    if ('studentFirstName' in body) {
      updateData.student_first_name = body.studentFirstName === '' ? null : body.studentFirstName ?? null
    }
    if ('studentLastName' in body) {
      updateData.student_last_name = body.studentLastName === '' ? null : body.studentLastName ?? null
    }
    if ('className' in body) {
      updateData.class_name = body.className === '' ? null : body.className ?? null
    }
    if ('classPeriod' in body) {
      updateData.class_period = body.classPeriod === '' ? null : body.classPeriod ?? null
    }
    if ('examTitle' in body) {
      updateData.exam_title = body.examTitle === '' ? null : body.examTitle ?? null
    }
    if ('studentUserId' in body) {
      updateData.student_user_id = body.studentUserId === '' ? null : body.studentUserId ?? null
    }

    // Also update student_name if first/last name changed
    if ('studentFirstName' in body || 'studentLastName' in body) {
      const firstName = 'studentFirstName' in body
        ? (body.studentFirstName || '')
        : (result.student_first_name || '')
      const lastName = 'studentLastName' in body
        ? (body.studentLastName || '')
        : (result.student_last_name || '')
      updateData.student_name = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown Student'
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Add updated_at timestamp
    const updatePayload = {
      ...updateData,
      updated_at: new Date().toISOString()
    }

    const { data: updatedResult, error: updateError } = await supabase
      .from('grading_results')
      .update(updatePayload)
      .eq('id', id)
      .select('id, student_name, student_first_name, student_last_name, student_user_id, class_name, class_period, exam_title, updated_at')
      .single()

    if (updateError) {
      console.error('Error updating grading result:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update grading result' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedResult.id,
        studentName: updatedResult.student_name,
        studentFirstName: updatedResult.student_first_name,
        studentLastName: updatedResult.student_last_name,
        studentUserId: updatedResult.student_user_id,
        className: updatedResult.class_name,
        classPeriod: updatedResult.class_period,
        examTitle: updatedResult.exam_title,
        updatedAt: updatedResult.updated_at
      }
    })

  } catch (error) {
    console.error('Error in PATCH /api/grading-results/[id]:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get authenticated user from cookies
    let userId: string | null = null
    const cookieUser = await getAuthenticatedUser(request)

    if (cookieUser) {
      userId = cookieUser.id
    } else {
      // Fall back to body userId for backwards compatibility
      try {
        const body = await request.json()
        userId = body.userId
      } catch {
        // No body provided
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Use admin client for deletion (bypasses RLS)
    const supabase = createAdminClient()

    // Verify the user owns this grading result
    const { data: result, error: fetchError } = await supabase
      .from('grading_results')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !result) {
      return NextResponse.json(
        { error: 'Grading result not found' },
        { status: 404 }
      )
    }

    if (result.user_id !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this grading result' },
        { status: 403 }
      )
    }

    // Delete the grading result
    const { error: deleteError } = await supabase
      .from('grading_results')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting grading result:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete grading result' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/grading-results/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
