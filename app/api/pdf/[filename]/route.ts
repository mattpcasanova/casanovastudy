import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for PDFs (in production, you'd use a database or cloud storage)
const pdfStorage = new Map<string, Buffer>()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    
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
      // Log all available keys for debugging
      const availableKeys = Array.from(pdfStorage.keys())
      console.log('Available PDF keys in storage:', availableKeys)
      console.log('Looking for key:', studyGuideId)
      console.log('Key match:', availableKeys.includes(studyGuideId))
      
      return NextResponse.json({ 
        error: 'PDF not found in storage',
        debug: {
          requestedKey: studyGuideId,
          availableKeys: availableKeys,
          storageSize: pdfStorage.size
        }
      }, { status: 404 })
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
  if (!studyGuideId || !pdfBuffer) {
    console.error('❌ Invalid storage request:', {
      studyGuideId: studyGuideId,
      hasBuffer: !!pdfBuffer,
      bufferLength: pdfBuffer?.length || 0
    })
    throw new Error('Invalid PDF storage parameters')
  }
  
  console.log('📦 Storing PDF:', {
    key: studyGuideId,
    size: pdfBuffer.length,
    isBuffer: Buffer.isBuffer(pdfBuffer)
  })
  
  pdfStorage.set(studyGuideId, pdfBuffer)
  
  // Verify it was stored
  const stored = pdfStorage.get(studyGuideId)
  if (!stored) {
    console.error('❌ Failed to store PDF - not found after storage attempt')
    throw new Error('Failed to store PDF in memory')
  }
  
  console.log('✅ PDF stored successfully:', {
    key: studyGuideId,
    storageSize: pdfStorage.size,
    storedSize: stored.length
  })
}
