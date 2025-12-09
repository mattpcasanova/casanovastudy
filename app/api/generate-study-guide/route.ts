import { NextRequest, NextResponse } from 'next/server'
import { ClaudeService } from '@/lib/claude-api'
import { FileProcessor } from '@/lib/file-processing'
import { StudyGuideRequest, StudyGuideResponse, ApiResponse } from '@/types'
import { supabase } from '@/lib/supabase'

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

    // Save to Supabase
    console.log('💾 Saving to Supabase...')
    const supabaseStart = Date.now()

    const { data: savedGuide, error: supabaseError } = await supabase
      .from('study_guides')
      .insert({
        title: body.studyGuideName,
        subject: body.subject,
        grade_level: body.gradeLevel,
        format: body.format,
        content: claudeResponse.content,
        topic_focus: body.topicFocus,
        difficulty_level: body.difficultyLevel,
        additional_instructions: body.additionalInstructions,
        file_count: body.cloudinaryFiles?.length || body.files?.length || 0,
        token_usage: claudeResponse.usage
      })
      .select()
      .single()

    if (supabaseError || !savedGuide) {
      console.error('❌ Supabase save failed:', supabaseError)
      throw new Error(`Failed to save study guide: ${supabaseError?.message || 'Unknown error'}`)
    }

    const supabaseTime = Date.now() - supabaseStart
    console.log(`✅ Saved to Supabase in ${supabaseTime}ms`)

    // Create study guide response
    const studyGuideResponse: StudyGuideResponse = {
      id: savedGuide.id,
      title: savedGuide.title,
      content: savedGuide.content,
      format: savedGuide.format,
      generatedAt: new Date(savedGuide.created_at),
      fileCount: savedGuide.file_count,
      subject: savedGuide.subject,
      gradeLevel: savedGuide.grade_level,
      tokenUsage: savedGuide.token_usage,
      studyGuideUrl: `/study-guide/${savedGuide.id}`
    }

    const totalTime = Date.now() - startTime
    console.log(`🎉 Study guide generation completed successfully in ${totalTime}ms`)

    return NextResponse.json({
      success: true,
      data: studyGuideResponse,
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
