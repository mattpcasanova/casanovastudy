import { NextRequest, NextResponse } from 'next/server'
import { EmailService } from '@/lib/email-service'
import { EmailRequest, ApiResponse } from '@/types'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body: EmailRequest = await request.json()
    
    // Validate request
    if (!body.to || !body.subject || !body.studyGuideId || !body.htmlContent) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: to, subject, studyGuideId, htmlContent'
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.to)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format'
      }, { status: 400 })
    }

    // Send email
    const emailService = new EmailService()
    const emailSent = await emailService.sendStudyGuide(body)

    if (!emailSent) {
      return NextResponse.json({
        success: false,
        error: 'Failed to send email'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully'
    })

  } catch (error) {
    console.error('Email sending error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    }, { status: 500 })
  }
}
