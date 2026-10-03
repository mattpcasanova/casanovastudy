import { NextRequest, NextResponse } from 'next/server'
import { ClaudeService } from '@/lib/claude-api'
import { getRequestUser } from '@/lib/request-user'

// Caps on what gets sent to the model (a quiz question and a student's answer are short).
const MAX_QUESTION = 4000
const MAX_ANSWER = 3000

interface ScoreRequest {
  question: string
  sampleAnswer: string
  studentAnswer: string
  subject: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Signed-in only: signed-out viewers of a shared quiz still see the model answer, just no AI score.
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ success: false, error: 'Sign in to have your answer checked.' }, { status: 401 })

  try {
    const body: ScoreRequest = await request.json()
    const { question, sampleAnswer, studentAnswer, subject } = body

    if (!question || !sampleAnswer || !studentAnswer) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: question, sampleAnswer, studentAnswer'
      }, { status: 400 })
    }
    if (question.length > MAX_QUESTION || sampleAnswer.length > MAX_QUESTION || studentAnswer.length > MAX_ANSWER) {
      return NextResponse.json({ success: false, error: 'That answer is too long to check.' }, { status: 400 })
    }

    const claudeService = new ClaudeService()
    const result = await claudeService.gradeShortAnswer({
      question,
      sampleAnswer,
      studentAnswer,
      subject,
    })

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Score short answer error:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to score answer'
    }, { status: 500 })
  }
}
