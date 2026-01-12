import { NextRequest, NextResponse } from 'next/server'
import { FileProcessor } from '@/lib/file-processing'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''

    // Check if this is a JSON request (URL-based) or FormData (direct upload)
    if (contentType.includes('application/json')) {
      // URL-based extraction (from Cloudinary) - same as home page uses
      const body = await request.json()
      const { url, filename } = body

      if (!url) {
        return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
      }

      console.log(`📄 Processing file from URL: ${filename || 'unknown'} - ${url.slice(0, 100)}...`)

      // Use the same method as home page - processFileFromUrl
      const processedFile = await FileProcessor.processFileFromUrl(url, filename || 'document')

      if (!processedFile.content || processedFile.content.trim().length < 50) {
        return NextResponse.json(
          { error: 'Could not extract meaningful text from the file. Please try a different file.' },
          { status: 400 }
        )
      }

      console.log(`✅ Extracted ${processedFile.content.length} characters from ${filename || 'URL'}`)

      return NextResponse.json({
        text: processedFile.content,
        filename: filename || 'document',
        type: processedFile.type,
        originalSize: processedFile.originalSize,
        processedSize: processedFile.processedSize
      })
    }

    // FormData-based extraction (direct upload) - legacy support
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size (20MB max - match home page)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be less than 20MB' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain'
    ]
    const extension = file.name.split('.').pop()?.toLowerCase()

    if (!allowedTypes.includes(file.type) && !['pdf', 'docx', 'pptx', 'txt'].includes(extension || '')) {
      return NextResponse.json({ error: 'Unsupported file type. Please upload PDF, DOCX, PPTX, or TXT.' }, { status: 400 })
    }

    console.log(`📄 Processing file: ${file.name} (${file.type}, ${Math.round(file.size / 1024)}KB)`)

    // Process the file
    const processedFile = await FileProcessor.processFile(file)

    if (!processedFile.content || processedFile.content.trim().length < 50) {
      return NextResponse.json(
        { error: 'Could not extract meaningful text from the file. Please try a different file.' },
        { status: 400 }
      )
    }

    console.log(`✅ Extracted ${processedFile.content.length} characters from ${file.name}`)

    return NextResponse.json({
      text: processedFile.content,
      filename: file.name,
      type: processedFile.type,
      originalSize: processedFile.originalSize,
      processedSize: processedFile.processedSize
    })

  } catch (error) {
    console.error('Text extraction error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to process file'
    // Use 400 for user-actionable errors (like unsupported PDF format)
    const status = errorMessage.includes('Could not extract') ? 400 : 500
    return NextResponse.json({ error: errorMessage }, { status })
  }
}
