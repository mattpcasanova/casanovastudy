import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createAdminClient } from '@/lib/supabase-server'

interface BulkUpdateBody {
  userId?: string
  ids: string[]
  className?: string | null
  classPeriod?: string | null
  examTitle?: string | null
}

export async function PATCH(request: NextRequest) {
  try {
    const body: BulkUpdateBody = await request.json()

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

    const { ids, className, classPeriod, examTitle } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No report IDs provided' },
        { status: 400 }
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

    // Verify user owns ALL grading results
    const { data: results, error: fetchError } = await supabase
      .from('grading_results')
      .select('id, user_id')
      .in('id', ids)

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: 'Failed to verify report ownership' },
        { status: 500 }
      )
    }

    // Check all requested IDs were found
    if (!results || results.length !== ids.length) {
      return NextResponse.json(
        { success: false, error: 'One or more reports not found' },
        { status: 404 }
      )
    }

    // Check user owns all reports
    const unauthorizedReports = results.filter(r => r.user_id !== userId)
    if (unauthorizedReports.length > 0) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to edit one or more of these reports' },
        { status: 403 }
      )
    }

    // Build update object - only include fields that were explicitly provided and have values
    const updateData: Record<string, string | null> = {}
    let hasUpdates = false

    // For bulk edit, only update if a non-empty value is provided
    // Empty string means "don't change" unlike single edit where it means "clear"
    if (className !== undefined && className !== null && className !== '') {
      updateData.class_name = className
      hasUpdates = true
    }
    if (classPeriod !== undefined && classPeriod !== null && classPeriod !== '') {
      updateData.class_period = classPeriod
      hasUpdates = true
    }
    if (examTitle !== undefined && examTitle !== null && examTitle !== '') {
      updateData.exam_title = examTitle
      hasUpdates = true
    }

    if (!hasUpdates) {
      return NextResponse.json(
        { success: false, error: 'No fields to update. Provide at least one non-empty field.' },
        { status: 400 }
      )
    }

    // Add updated_at timestamp
    const updatePayload = {
      ...updateData,
      updated_at: new Date().toISOString()
    }

    // Update all reports
    const { error: updateError, count } = await supabase
      .from('grading_results')
      .update(updatePayload)
      .in('id', ids)

    if (updateError) {
      console.error('Error bulk updating grading results:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update grading results' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      updatedCount: count ?? ids.length,
      data: {
        className: updateData.class_name,
        classPeriod: updateData.class_period,
        examTitle: updateData.exam_title
      }
    })

  } catch (error) {
    console.error('Error in PATCH /api/grading-results/bulk:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
