import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getRequestUser } from '@/lib/request-user'

interface GradeBreakdownItem {
  questionNumber: string
  marksAwarded: number
  marksPossible: number
  explanation: string
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const body = await request.json()
    const { gradeBreakdown } = body as { gradeBreakdown: GradeBreakdownItem[] }

    // Identity comes only from the caller's session (never a body userId).
    const userId: string | null = (await getRequestUser(request))?.id ?? null

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verified above; the admin client does the owner-checked update below.
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

    // Verify user owns this grading result
    const { data: gradingResult, error: fetchError } = await supabase
      .from('grading_results')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !gradingResult) {
      return NextResponse.json(
        { success: false, error: 'Grading result not found' },
        { status: 404 }
      )
    }

    if (gradingResult.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to edit this grading result' },
        { status: 403 }
      )
    }

    if (!gradeBreakdown || !Array.isArray(gradeBreakdown)) {
      return NextResponse.json(
        { success: false, error: 'Invalid grade breakdown data' },
        { status: 400 }
      )
    }

    // Validate each item
    for (const item of gradeBreakdown) {
      if (typeof item.marksAwarded !== 'number' || item.marksAwarded < 0) {
        return NextResponse.json(
          { success: false, error: `Invalid marks awarded for question ${item.questionNumber}` },
          { status: 400 }
        )
      }
      if (item.marksAwarded > item.marksPossible) {
        return NextResponse.json(
          { success: false, error: `Marks awarded cannot exceed marks possible for question ${item.questionNumber}` },
          { status: 400 }
        )
      }
    }

    // Recalculate totals
    const totalMarks = gradeBreakdown.reduce((sum, item) => sum + item.marksAwarded, 0)
    const totalPossibleMarks = gradeBreakdown.reduce((sum, item) => sum + item.marksPossible, 0)
    const percentage = totalPossibleMarks > 0 ? (totalMarks / totalPossibleMarks) * 100 : 0

    // Calculate letter grade (American grading scale)
    let grade = 'F'
    if (percentage >= 90) grade = 'A'
    else if (percentage >= 80) grade = 'B'
    else if (percentage >= 70) grade = 'C'
    else if (percentage >= 60) grade = 'D'

    // Update database
    const { error: updateError } = await supabase
      .from('grading_results')
      .update({
        grade_breakdown: gradeBreakdown,
        total_marks: totalMarks,
        total_possible_marks: totalPossibleMarks,
        percentage: parseFloat(percentage.toFixed(2)),
        grade: grade,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating grading result:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to save changes' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        totalMarks,
        totalPossibleMarks,
        percentage: parseFloat(percentage.toFixed(2)),
        grade,
        gradeBreakdown
      }
    })

  } catch (error) {
    console.error('Edit grading result error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET handler to fetch a grading result by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Use admin client to bypass RLS for public read access
    const supabase = createAdminClient()

    const { data: gradingResult, error } = await supabase
      .from('grading_results')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !gradingResult) {
      return NextResponse.json(
        { success: false, error: 'Grading result not found' },
        { status: 404 }
      )
    }

    // Ownership (shows edit controls) comes from the session, not a query param.
    const requestUserId = (await getRequestUser(request))?.id ?? null

    return NextResponse.json({
      success: true,
      data: {
        id: gradingResult.id,
        studentName: gradingResult.student_name,
        answerSheetFilename: gradingResult.answer_sheet_filename,
        studentExamFilename: gradingResult.student_exam_filename,
        totalMarks: gradingResult.total_marks,
        totalPossibleMarks: gradingResult.total_possible_marks,
        percentage: gradingResult.percentage,
        grade: gradingResult.grade,
        content: gradingResult.content,
        gradeBreakdown: gradingResult.grade_breakdown,
        additionalComments: gradingResult.additional_comments,
        pdfUrl: gradingResult.pdf_url,
        createdAt: gradingResult.created_at,
        updatedAt: gradingResult.updated_at,
        isOwner: requestUserId === gradingResult.user_id
      }
    })

  } catch (error) {
    console.error('Get grading result error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
