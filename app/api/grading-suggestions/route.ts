import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createAdminClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/grading-suggestions
 * Returns unique values from previous grading results for autocomplete
 * Query params:
 *   - field: 'studentFirstName' | 'studentLastName' | 'className' | 'classPeriod' | 'examTitle'
 *   - userId: user ID (fallback when cookie auth isn't available)
 *   - query: optional search string to filter results
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const field = searchParams.get('field')
    const query = searchParams.get('query')?.toLowerCase() || ''

    // Try cookie-based auth first, fall back to userId query param
    let userId: string | null = null
    const cookieUser = await getAuthenticatedUser(request)

    if (cookieUser) {
      userId = cookieUser.id
    } else {
      // Fall back to userId query param (for localStorage-based auth)
      userId = searchParams.get('userId')
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Map field names to database columns
    const fieldMap: Record<string, string> = {
      studentFirstName: 'student_first_name',
      studentLastName: 'student_last_name',
      className: 'class_name',
      classPeriod: 'class_period',
      examTitle: 'exam_title'
    }

    const dbColumn = field ? fieldMap[field] : null

    if (!dbColumn) {
      return NextResponse.json({ error: 'Invalid field parameter' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch distinct non-null values for this field from user's grading results
    const { data, error } = await supabase
      .from('grading_results')
      .select(dbColumn)
      .eq('user_id', userId)
      .not(dbColumn, 'is', null)
      .order(dbColumn, { ascending: true })

    if (error) {
      console.error('Error fetching suggestions:', error)
      return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 })
    }

    // Extract unique values from grading results
    const gradingValues = data
      .map((row: Record<string, string | null>) => row[dbColumn])
      .filter((val): val is string => val !== null && val.trim() !== '')

    // For className and classPeriod, also fetch from student_classes
    let studentClassValues: string[] = []
    if (field === 'className' || field === 'classPeriod') {
      const studentClassColumn = field === 'className' ? 'class_name' : 'class_period'
      const { data: classData, error: classError } = await supabase
        .from('student_classes')
        .select(studentClassColumn)
        .eq('teacher_id', userId)
        .not(studentClassColumn, 'is', null)

      if (!classError && classData) {
        studentClassValues = classData
          .map((row: Record<string, string | null>) => row[studentClassColumn])
          .filter((val): val is string => val !== null && val.trim() !== '')
      }
    }

    // Combine and deduplicate values from both sources
    const uniqueValues = [...new Set([...gradingValues, ...studentClassValues])].sort()

    // Filter by query if provided
    const filteredValues = query
      ? uniqueValues.filter(val => val.toLowerCase().includes(query))
      : uniqueValues

    // Limit to 20 suggestions
    const suggestions = filteredValues.slice(0, 20)

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Grading suggestions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
