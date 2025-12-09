import { NextRequest, NextResponse } from 'next/server'
import { ClaudeService } from '@/lib/claude-api'

interface ScoreRequest {
  question: string
  sampleAnswer: string
  studentAnswer: string
  subject: string
}

interface ScoreResult {
  score: number // 0-100
  feedback: string
  isCorrect: boolean
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

    // Use Claude to score the short answer
    const claudeService = new ClaudeService()

    const prompt = `You are grading a short answer question for a ${subject} study guide quiz.

Question: ${question}

Sample Answer (what we're looking for): ${sampleAnswer}

Student's Answer: ${studentAnswer}

Please evaluate the student's answer and provide:
1. A score from 0-100 (where 80+ is correct, 50-79 is partial credit, <50 is incorrect)
2. Brief constructive feedback (1-2 sentences)

Your response MUST follow this EXACT format:
SCORE: [number 0-100]
FEEDBACK: [your feedback here]

Be fair but reasonable - if the student captures the key concepts from the sample answer, give them credit even if wording differs. Focus on understanding, not exact phrasing.`

    const response = await claudeService.generateContent(prompt, {
      max_tokens: 500,
      temperature: 0.3 // Lower temperature for more consistent grading
    })

    // Parse Claude's response
    const scoreMatch = response.content.match(/SCORE:\s*(\d+)/i)
    const feedbackMatch = response.content.match(/FEEDBACK:\s*(.+?)(?:\n\n|$)/is)

    if (!scoreMatch || !feedbackMatch) {
      console.error('Failed to parse Claude response:', response.content)
      return NextResponse.json({
        success: false,
        error: 'Failed to parse scoring response'
      }, { status: 500 })
    }

    const score = parseInt(scoreMatch[1], 10)
    const feedback = feedbackMatch[1].trim()
    const isCorrect = score >= 80

    const result: ScoreResult = {
      score,
      feedback,
      isCorrect
    }

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
