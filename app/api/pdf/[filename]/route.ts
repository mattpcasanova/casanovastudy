import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for PDFs (in production, you'd use a database or cloud storage)
const pdfStorage = new Map<string, Buffer>()

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename
    
    // Validate filename to prevent directory traversal attacks
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }
    
    // Ensure it's a PDF file
    if (!filename.endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }
    
    // Extract study guide ID from filename
    const studyGuideId = filename.replace('.pdf', '')
    
    // Check if PDF exists in memory storage
    const pdfBuffer = pdfStorage.get(studyGuideId)
    
    console.log('PDF request for:', studyGuideId)
    console.log('PDF found in storage:', !!pdfBuffer)
    console.log('Storage size:', pdfStorage.size)
    
    if (!pdfBuffer) {
      return NextResponse.json({ error: 'PDF not found in storage' }, { status: 404 })
    }
    
    // Return the PDF with proper headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })
    
  } catch (error) {
    console.error('PDF serving error:', error)
    return NextResponse.json({ error: 'Failed to serve PDF' }, { status: 500 })
  }
}

// Function to store PDF in memory (called from generate-study-guide)
export function storePDF(studyGuideId: string, pdfBuffer: Buffer) {
  console.log('Storing PDF for:', studyGuideId, 'Size:', pdfBuffer.length)
  pdfStorage.set(studyGuideId, pdfBuffer)
  console.log('Storage size after storing:', pdfStorage.size)
}
