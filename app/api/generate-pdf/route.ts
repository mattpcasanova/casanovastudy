import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { PDFShiftPDFGenerator } from '@/lib/pdfshift-pdf-generator'
import { StudyGuideResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const { studyGuideId } = await request.json()

    if (!studyGuideId) {
      return NextResponse.json(
        { success: false, error: 'Study guide ID is required' },
        { status: 400 }
      )
    }

    // Fetch study guide from Supabase
    const { data: studyGuide, error } = await supabase
      .from('study_guides')
      .select('*')
      .eq('id', studyGuideId)
      .single()

    if (error || !studyGuide) {
      return NextResponse.json(
        { success: false, error: 'Study guide not found' },
        { status: 404 }
      )
    }

    // Convert to StudyGuideResponse format
    const studyGuideResponse: StudyGuideResponse = {
      id: studyGuide.id,
      title: studyGuide.title,
      content: studyGuide.content,
      format: studyGuide.format,
      generatedAt: new Date(studyGuide.created_at),
      fileCount: studyGuide.file_count,
      subject: studyGuide.subject,
      gradeLevel: studyGuide.grade_level,
      tokenUsage: studyGuide.token_usage
    }

    // Generate PDF
    console.log('📄 Generating PDF on-demand for:', studyGuideId)
    const pdfBuffer = await PDFShiftPDFGenerator.generatePDF(studyGuideResponse)

    // Return PDF as download
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${studyGuide.title}.pdf"`
      }
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate PDF'
      },
      { status: 500 }
    )
  }
}
