import { NextRequest, NextResponse } from 'next/server'
import { ClaudeService } from '@/lib/claude-api'
import { PDFGenerator } from '@/lib/pdf-generator'
import { StudyGuideRequest, StudyGuideResponse, ApiResponse } from '@/types'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<StudyGuideResponse>>> {
  try {
    const body: StudyGuideRequest = await request.json()
    
    // Validate request
    if (!body.files || body.files.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No files provided'
      }, { status: 400 })
    }

    if (!body.subject || !body.gradeLevel || !body.format) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: subject, gradeLevel, format'
      }, { status: 400 })
    }

    // Combine all file content
    const combinedContent = body.files
      .map(file => `--- ${file.name} ---\n${file.content}`)
      .join('\n\n')

    // Check if content extraction was limited
    const totalContentLength = combinedContent.length
    const hasLimitedContent = totalContentLength < 100 || body.files.some(file => file.content.length < 50)
    
    console.log('Content extraction stats:', {
      totalLength: totalContentLength,
      fileCount: body.files.length,
      hasLimitedContent,
      fileLengths: body.files.map(f => ({ name: f.name, length: f.content.length }))
    })

    // Add fallback note if content is limited
    let finalContent = combinedContent
    if (hasLimitedContent) {
      finalContent += `\n\nNote: Text extraction from PDF was limited. Please create a study guide based on available content and include general study tips for ${body.subject} topics when specific content is insufficient.`
    }

    // Generate study guide using Claude
    const claudeService = new ClaudeService()
    const claudeResponse = await claudeService.generateStudyGuide({
      content: finalContent,
      subject: body.subject,
      gradeLevel: body.gradeLevel,
      format: body.format,
      topicFocus: body.topicFocus,
      difficultyLevel: body.difficultyLevel,
      additionalInstructions: body.additionalInstructions
    })

    // Create study guide response
    const studyGuideId = `sg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const studyGuide: StudyGuideResponse = {
      id: studyGuideId,
      title: `${body.subject} Study Guide - ${body.format}`,
      content: claudeResponse.content,
      format: body.format,
      generatedAt: new Date(),
      fileCount: body.files.length,
      subject: body.subject,
      gradeLevel: body.gradeLevel,
      tokenUsage: claudeResponse.usage
    }

    // Generate PDF
    const pdfBuffer = await PDFGenerator.generatePDF(studyGuide)
    
    // Ensure output directory exists
    const outputDir = join(process.cwd(), 'public', 'study-guides')
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true })
    }

    // Save PDF to file
    const pdfPath = join(outputDir, `${studyGuideId}.pdf`)
    await writeFile(pdfPath, pdfBuffer)

    // Add PDF URL to response
    const studyGuideWithPdf = {
      ...studyGuide,
      pdfUrl: `/study-guides/${studyGuideId}.pdf`
    }

    return NextResponse.json({
      success: true,
      data: studyGuideWithPdf,
      message: 'Study guide generated successfully'
    })

  } catch (error) {
    console.error('Study guide generation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate study guide'
    }, { status: 500 })
  }
}
