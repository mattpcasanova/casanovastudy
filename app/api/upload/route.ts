import { NextRequest, NextResponse } from 'next/server'
import { FileProcessor } from '@/lib/file-processing'
import { ApiResponse, FileUploadResponse } from '@/types'

// Configure API route for larger file uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<FileUploadResponse>>> {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No files provided'
      }, { status: 400 })
    }

    // Process files
    const processedFiles = await FileProcessor.processMultipleFiles(files)
    
    const totalSize = processedFiles.reduce((sum, file) => sum + file.size, 0)

    return NextResponse.json({
      success: true,
      data: {
        files: processedFiles,
        totalSize,
        processedCount: processedFiles.length
      },
      message: `Successfully processed ${processedFiles.length} file(s)`
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process files'
    }, { status: 500 })
  }
}
