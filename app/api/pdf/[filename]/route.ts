import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

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
    
    const pdfPath = join(process.cwd(), 'public', 'generated-pdfs', filename)
    
    // Check if file exists
    if (!existsSync(pdfPath)) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
    }
    
    // Read the PDF file
    const pdfBuffer = await readFile(pdfPath)
    
    // Return the PDF with proper headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    })
    
  } catch (error) {
    console.error('PDF serving error:', error)
    return NextResponse.json({ error: 'Failed to serve PDF' }, { status: 500 })
  }
}
