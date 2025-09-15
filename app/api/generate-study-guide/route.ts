import { NextRequest, NextResponse } from 'next/server'
import { ClaudeService } from '@/lib/claude-api'
import { PDFShiftPDFGenerator } from '@/lib/pdfshift-pdf-generator'
import { FileProcessor } from '@/lib/file-processing'
import { StudyGuideRequest, StudyGuideResponse, ApiResponse } from '@/types'
import { storePDF } from '@/app/api/pdf/[filename]/route'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<StudyGuideResponse>>> {
  const startTime = Date.now()
  
  try {
    console.log('🚀 Study guide generation started')
    const body: StudyGuideRequest = await request.json()
    
    console.log('📝 API Request received:', {
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
    console.log('📁 Starting file processing...')
    const fileProcessingStart = Date.now()
    let processedFiles;
    if (body.cloudinaryFiles && body.cloudinaryFiles.length > 0) {
      // Process files from Cloudinary URLs
      console.log('☁️ Processing files from Cloudinary URLs...', body.cloudinaryFiles);
      processedFiles = await Promise.all(
        body.cloudinaryFiles.map(async (cloudinaryFile) => {
          console.log('📄 Processing Cloudinary file:', cloudinaryFile.filename);
          return await FileProcessor.processFileFromUrl(cloudinaryFile.url, cloudinaryFile.filename);
        })
      );
      console.log('✅ Processed files from Cloudinary:', processedFiles);
    } else {
      // Use existing files (fallback for direct upload)
      console.log('📄 Using direct upload files:', body.files);
      processedFiles = body.files!;
    }
    const fileProcessingTime = Date.now() - fileProcessingStart
    console.log(`⏱️ File processing completed in ${fileProcessingTime}ms`)

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

    // Use the content as-is without adding fallback notes
    let finalContent = combinedContent

    // Generate study guide using Claude
    console.log('🤖 Starting Claude API call...')
    const claudeStart = Date.now()
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
    const claudeTime = Date.now() - claudeStart
    console.log(`⏱️ Claude API call completed in ${claudeTime}ms`)

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

    // Generate PDF using PDFShift HTML-to-PDF service
    console.log('📄 Starting PDF generation...')
    const pdfStart = Date.now()
    
    let pdfBuffer: Buffer
    try {
      pdfBuffer = await PDFShiftPDFGenerator.generatePDF(studyGuide)
      const pdfTime = Date.now() - pdfStart
      console.log(`✅ PDF generation completed in ${pdfTime}ms`)
    } catch (pdfError) {
      console.error('❌ PDF generation failed:', pdfError)
      throw new Error(`PDF generation failed: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`)
    }

    // Store PDF in memory for Vercel deployment
    storePDF(studyGuideId, pdfBuffer)
    
    // Create base64 data URL as fallback
    const pdfBase64 = pdfBuffer.toString('base64')
    const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`
    
    // Create API URL for the PDF
    const pdfUrl = `/api/pdf/${studyGuideId}.pdf`

    // Add PDF URL to response (with fallback to base64)
    const studyGuideWithPdf = {
      ...studyGuide,
      pdfUrl: pdfUrl,
      pdfDataUrl: `data:application/pdf;base64,${pdfBuffer.toString('base64')}` // Fallback
    }

    const totalTime = Date.now() - startTime
    console.log(`🎉 Study guide generation completed successfully in ${totalTime}ms`)
    
    return NextResponse.json({
      success: true,
      data: studyGuideWithPdf,
      message: 'Study guide generated successfully'
    })

  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error(`❌ Study guide generation error after ${totalTime}ms:`, error)
    
    // Handle timeout specifically
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json({
        success: false,
        error: 'Request timeout - the PDF generation took too long. Try with a smaller file or contact support.'
      }, { status: 504 })
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate study guide'
    }, { status: 500 })
  }
}
