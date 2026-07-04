import { NextRequest, NextResponse } from 'next/server'
import { ClaudeService } from '@/lib/claude-api'

interface ScoreRequest {
  question: string
  sampleAnswer: string
  studentAnswer: string
  subject: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: ScoreRequest = await request.json()
    const { question, sampleAnswer, studentAnswer, subject } = body

    if (!question || !sampleAnswer || !studentAnswer) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: question, sampleAnswer, studentAnswer'
      }, { status: 400 })
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
