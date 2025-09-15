import { NextRequest, NextResponse } from 'next/server'
import { ClaudeService } from '@/lib/claude-api'
import { PDFGeneratorHybrid } from '@/lib/pdf-generator-hybrid'
import { FileProcessor } from '@/lib/file-processing'
import { StudyGuideRequest, StudyGuideResponse, ApiResponse } from '@/types'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<StudyGuideResponse>>> {
  try {
    const body: StudyGuideRequest = await request.json()
    
    console.log('API Request received:', {
      studyGuideName: body.studyGuideName,
      subject: body.subject,
      gradeLevel: body.gradeLevel,
      format: body.format,
      fileCount: body.files?.length || body.cloudinaryFiles?.length || 0
    })
    
    // Validate request - check for either files or cloudinaryFiles
    if ((!body.files || body.files.length === 0) && (!body.cloudinaryFiles || body.cloudinaryFiles.length === 0)) {
      console.log('Validation failed: No files provided')
      return NextResponse.json({
        success: false,
        error: 'No files provided'
      }, { status: 400 })
    }

    if (!body.studyGuideName || !body.subject || !body.gradeLevel || !body.format) {
      console.log('Validation failed: Missing required fields', {
        studyGuideName: !!body.studyGuideName,
        subject: !!body.subject,
        gradeLevel: !!body.gradeLevel,
        format: !!body.format
      })
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: studyGuideName, subject, gradeLevel, format'
      }, { status: 400 })
    }

    // Process files - either from direct upload or Cloudinary
    let processedFiles;
    if (body.cloudinaryFiles && body.cloudinaryFiles.length > 0) {
      // Process files from Cloudinary URLs
      console.log('Processing files from Cloudinary URLs...', body.cloudinaryFiles);
      processedFiles = await Promise.all(
        body.cloudinaryFiles.map(async (cloudinaryFile) => {
          console.log('Processing Cloudinary file:', cloudinaryFile.filename);
          return await FileProcessor.processFileFromUrl(cloudinaryFile.url, cloudinaryFile.filename);
        })
      );
      console.log('Processed files from Cloudinary:', processedFiles);
    } else {
      // Use existing files (fallback for direct upload)
      console.log('Using direct upload files:', body.files);
      processedFiles = body.files!;
    }

    // Combine all file content
    const combinedContent = processedFiles
      .map(file => `--- ${file.name} ---\n${file.content}`)
      .join('\n\n')

    // Check if content extraction was limited
    const totalContentLength = combinedContent.length
    const hasLimitedContent = totalContentLength < 100 || processedFiles.some(file => file.content.length < 50)
    
    console.log('Content extraction stats:', {
      totalLength: totalContentLength,
      fileCount: processedFiles.length,
      hasLimitedContent,
      fileLengths: processedFiles.map(f => ({ name: f.name, length: f.content.length }))
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
      title: body.studyGuideName,
      content: claudeResponse.content,
      format: body.format,
      generatedAt: new Date(),
      fileCount: body.cloudinaryFiles?.length || body.files?.length || 0,
      subject: body.subject,
      gradeLevel: body.gradeLevel,
      tokenUsage: claudeResponse.usage
    }

    // Generate PDF using hybrid approach (Puppeteer locally, fallback for serverless)
    const pdfBuffer = await PDFGeneratorHybrid.generatePDF(studyGuide)

    // Convert PDF buffer to base64 for transmission
    const pdfBase64 = pdfBuffer.toString('base64')
    const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`

    // Add PDF data to response
    const studyGuideWithPdf = {
      ...studyGuide,
      pdfDataUrl: pdfDataUrl
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
