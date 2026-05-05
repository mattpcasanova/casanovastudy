import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createAdminClient } from '@/lib/supabase-server'
import { runGradingPipeline, type FileMeta } from '@/lib/grade-exam-pipeline'

export const maxDuration = 300

const VALID_DOC_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const VALID_TYPES = [...VALID_DOC_TYPES, ...VALID_IMAGE_TYPES]
const VALID_EXTENSIONS = ['pdf', 'docx', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const formData = await request.formData()

    // Auth: try cookie session first, fall back to userId field for internal calls
    let userId: string | null = null
    const cookieUser = await getAuthenticatedUser(request)
    if (cookieUser) {
      userId = cookieUser.id
    } else {
      const formUserId = formData.get('userId') as string | null
      if (formUserId) userId = formUserId
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'You must be logged in to use the grading feature' }, { status: 401 })
    }

    // Determine user type (teacher vs student affects grading tone/temperature)
    const serverSupabase = createAdminClient()
    const { data: userProfile, error: profileError } = await serverSupabase
      .from('user_profiles')
      .select('user_type')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ success: false, error: 'Failed to verify user profile' }, { status: 500 })
    }

    const userType = userProfile.user_type as 'teacher' | 'student'

    const markSchemeFile = formData.get('markScheme') as File | null
    const studentExamFiles = formData.getAll('studentExam') as File[]
    const additionalComments = formData.get('additionalComments') as string | null

    if (studentExamFiles.length === 0) {
      return NextResponse.json({ success: false, error: 'Student exam file is required' }, { status: 400 })
    }

    // Validate mark scheme
    if (markSchemeFile && !VALID_DOC_TYPES.includes(markSchemeFile.type)) {
      return NextResponse.json({
        success: false,
        error: `Invalid mark scheme file type: ${markSchemeFile.type}. Please upload a PDF or DOCX file.`
      }, { status: 400 })
    }

    // Validate student exam files
    for (const file of studentExamFiles) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!VALID_TYPES.includes(file.type) && !(ext && VALID_EXTENSIONS.includes(ext))) {
        return NextResponse.json({
          success: false,
          error: `Invalid file type: ${file.name}. Please upload PDF, DOCX, or image files.`
        }, { status: 400 })
      }
    }

    // Convert File objects to buffer form for the pipeline
    const toFileMeta = async (f: File): Promise<FileMeta> => ({
      buffer: Buffer.from(await f.arrayBuffer()),
      name: f.name,
      type: f.type,
    })

    const markScheme = markSchemeFile ? await toFileMeta(markSchemeFile) : undefined
    const studentFiles = await Promise.all(studentExamFiles.map(toFileMeta))

    const result = await runGradingPipeline({
      userId,
      userType,
      markSchemeFile: markScheme,
      studentFiles,
      additionalComments: additionalComments || undefined,
    })

    const totalTime = Date.now() - startTime
    console.log(`🎉 Exam grading completed in ${totalTime}ms, result ID: ${result.id}`)

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Exam graded successfully',
    })

  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error(`❌ Exam grading error after ${totalTime}ms:`, error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to grade exam',
    }, { status: 500 })
  }
}
