import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase-server'

// GET - Get teacher profile and their guides (guides only visible if in relationship)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teacherId } = await params

    if (!teacherId) {
      return NextResponse.json(
        { error: 'Teacher ID is required' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient(request)

    // Get teacher profile
    const { data: teacher, error: teacherError } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name, display_name, bio, user_type, created_at')
      .eq('id', teacherId)
      .single()

    if (teacherError || !teacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      )
    }

    if (teacher.user_type !== 'teacher') {
      return NextResponse.json(
        { error: 'This user is not a teacher' },
        { status: 400 }
      )
    }

    const user = await getAuthenticatedUser(request)
    const isSelf = user?.id === teacherId

    // Check if current user has a relationship with this teacher
    let hasRelationship = false
    if (user && user.id !== teacherId) {
      const { data: followData } = await supabase
        .from('teacher_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('teacher_id', teacherId)
        .maybeSingle()
      hasRelationship = !!followData
    }

    // Get guide count (all guides for this teacher)
    const { count: guideCount } = await supabase
      .from('study_guides')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', teacherId)

    // Get student count (number of students in relationship)
    const { count: studentCount } = await supabase
      .from('teacher_follows')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', teacherId)

    // Only show guides if user is the teacher themselves or has a relationship
    let guides: Array<{
      id: string
      title: string
      subject: string
      grade_level: string
      format: string
      topic_focus: string | null
      difficulty_level: string | null
      file_count: number
      created_at: string
    }> = []

    if (isSelf || hasRelationship) {
      const { data: guidesData, error: guidesError } = await supabase
        .from('study_guides')
        .select('id, title, subject, grade_level, format, topic_focus, difficulty_level, file_count, created_at')
        .eq('user_id', teacherId)
        .order('created_at', { ascending: false })

      if (guidesError) {
        console.error('Error fetching guides:', guidesError)
      }
      guides = guidesData || []
    }

    return NextResponse.json({
      teacher: {
        ...teacher,
        guideCount: guideCount || 0,
        studentCount: studentCount || 0
      },
      guides,
      hasRelationship,
      isSelf
    })
  } catch (error) {
    console.error('Get teacher profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
