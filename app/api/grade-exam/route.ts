import { NextRequest, NextResponse } from 'next/server'
import { FileProcessor } from '@/lib/file-processing'
import { ClaudeService } from '@/lib/claude-api'
import { PDFShiftPDFGenerator } from '@/lib/pdfshift-pdf-generator'
import { storePDF } from '@/app/api/pdf/[filename]/route'
import { supabase } from '@/lib/supabase'

interface GradingResult {
  pdfUrl: string
  pdfDataUrl?: string // Base64 data URL as fallback for downloads
  totalMarks: number
  totalPossibleMarks: number
  gradeBreakdown: Array<{
    questionNumber: string
    marksAwarded: number
    marksPossible: number
    explanation: string
  }>
  fullResponse?: string // Full Claude response for easy copying
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  
  try {
    console.log('📝 Starting exam grading process...')
    
    const formData = await request.formData()
    const markSchemeFile = formData.get('markScheme') as File | null
    const studentExamFile = formData.get('studentExam') as File | null
    const additionalComments = formData.get('additionalComments') as string | null

    console.log('Additional comments received:', additionalComments ? `"${additionalComments}"` : 'None')

    if (!markSchemeFile || !studentExamFile) {
      console.error('❌ Missing files:', {
        hasMarkScheme: !!markSchemeFile,
        hasStudentExam: !!studentExamFile
      })
      return NextResponse.json({
        success: false,
        error: 'Both mark scheme and student exam PDFs are required'
      }, { status: 400 })
    }

    // Validate file types
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!validTypes.includes(markSchemeFile.type)) {
      console.error('❌ Invalid mark scheme file type:', markSchemeFile.type)
      return NextResponse.json({
        success: false,
        error: `Invalid mark scheme file type: ${markSchemeFile.type}. Please upload a PDF or DOCX file.`
      }, { status: 400 })
    }
    if (!validTypes.includes(studentExamFile.type)) {
      console.error('❌ Invalid student exam file type:', studentExamFile.type)
      return NextResponse.json({
        success: false,
        error: `Invalid student exam file type: ${studentExamFile.type}. Please upload a PDF or DOCX file.`
      }, { status: 400 })
    }

    // Process both files - extract text first (same as study guide generator)
    console.log('📄 Processing mark scheme file...')
    const markSchemeProcessed = await FileProcessor.processFile(markSchemeFile)
    console.log('Mark scheme processing result:', {
      name: markSchemeProcessed.name,
      type: markSchemeProcessed.type,
      contentLength: markSchemeProcessed.content.length,
      originalSize: markSchemeProcessed.originalSize,
      processedSize: markSchemeProcessed.processedSize
    })
    
    console.log('📄 Processing student exam file...')
    const studentExamProcessed = await FileProcessor.processFile(studentExamFile)
    console.log('Student exam processing result:', {
      name: studentExamProcessed.name,
      type: studentExamProcessed.type,
      contentLength: studentExamProcessed.content.length,
      originalSize: studentExamProcessed.originalSize,
      processedSize: studentExamProcessed.processedSize
    })
    
    // Check if content extraction was successful
    const markSchemeContent = markSchemeProcessed.content.trim()
    const studentExamContent = studentExamProcessed.content.trim()
    
    // Check if we got the fallback message (indicates extraction failed)
    const isFallbackMessage = (content: string) => {
      return content.includes('PDF Document:') && 
             content.includes('Content:') && 
             content.includes('Status: Text extraction completed')
    }
    
    // For exam grading, ALWAYS use vision API if we have PDFs
    // Student exams are often handwritten, so we need to read images
    const markSchemeNeedsVision = markSchemeFile.type === 'application/pdf'
    const studentExamNeedsVision = studentExamFile.type === 'application/pdf'
    
    console.log('📸 Using Claude Vision API for exam grading')
    console.log('Mark scheme will use images:', markSchemeNeedsVision)
    console.log('Student exam will use images:', studentExamNeedsVision)
    console.log('Text content lengths:', {
      markScheme: markSchemeContent.length,
      studentExam: studentExamContent.length
    })

    // Use Claude to analyze and grade
    console.log('🤖 Calling Claude API for grading analysis...')
    const claudeService = new ClaudeService()
    
    // Call Claude - use images if text extraction was insufficient
    const claudeResponse = await claudeService.gradeExamWithImages({
      markSchemeText: markSchemeContent,
      studentExamText: studentExamContent,
      markSchemeImages: undefined, // Will be converted on server if needed
      studentExamImages: undefined, // Will be converted on server if needed
      markSchemeFile: markSchemeNeedsVision ? {
        buffer: Buffer.from(await markSchemeFile.arrayBuffer()),
        name: markSchemeFile.name,
        type: markSchemeFile.type
      } : undefined,
      studentExamFile: studentExamNeedsVision ? {
        buffer: Buffer.from(await studentExamFile.arrayBuffer()),
        name: studentExamFile.name,
        type: studentExamFile.type
      } : undefined,
      additionalComments: additionalComments || undefined
    })

    // Parse Claude's response to extract grading information
    const gradingContent = claudeResponse.content
    console.log('✅ Claude analysis complete, parsing results...')
    console.log('📄 Claude response length:', gradingContent.length)
    console.log('📄 Claude response preview:', gradingContent.substring(0, 1000))
    
    // Check if Claude is saying it can't read the content
    if (gradingContent.toLowerCase().includes('cannot read') || 
        gradingContent.toLowerCase().includes('cannot see') ||
        gradingContent.toLowerCase().includes('please share') ||
        gradingContent.toLowerCase().includes('could you please provide')) {
      console.error('❌ Claude is indicating it cannot read the PDF content!')
      console.error('Full Claude response:', gradingContent)
      console.error('Debug info:', {
        hasMarkSchemeImages: !!markSchemeNeedsVision,
        hasStudentExamImages: !!studentExamNeedsVision,
        markSchemeFileProvided: !!markSchemeFile,
        studentExamFileProvided: !!studentExamFile
      })
      return NextResponse.json({
        success: false,
        error: 'Failed to process the exam PDFs. This may be a temporary issue with the PDF conversion. Please try again, or ensure your PDFs are clear and readable.'
      }, { status: 500 })
    }

    // Parse the grading breakdown from Claude's response
    const gradeBreakdown = parseGradingBreakdown(gradingContent)
    console.log('📊 Parsed breakdown:', JSON.stringify(gradeBreakdown, null, 2))
    
    // Try to extract totals from Claude's response (look for "Total: X/Y" or "Total Mark: X/Y")
    let totalMarks = gradeBreakdown.reduce((sum, item) => sum + item.marksAwarded, 0)
    let totalPossibleMarks = gradeBreakdown.reduce((sum, item) => sum + item.marksPossible, 0)
    
    // Look for overall totals in the response (multiple patterns)
    const totalPatterns = [
      /Total\s+(?:Mark|Marks)?[:\s]+(\d+)\s*\/\s*(\d+)/i,
      /Overall.*?(\d+)\s*\/\s*(\d+)\s*(?:marks?|points?)/i,
      /Total.*?(\d+)\s*\/\s*(\d+)\s*(?:marks?|points?)/i,
      /(\d+)\s*\/\s*(\d+)\s*(?:marks?|points?)\s*\([^)]*%\)/i, // "35/60 marks (58%)"
    ]
    
    for (const pattern of totalPatterns) {
      const totalMatch = gradingContent.match(pattern)
      if (totalMatch) {
        const foundTotal = parseInt(totalMatch[1], 10)
        const foundPossible = parseInt(totalMatch[2], 10)
        // Use this if it's larger than what we calculated (more likely to be correct)
        if (foundPossible > totalPossibleMarks && foundTotal >= 0 && foundPossible > 0) {
          totalMarks = foundTotal
          totalPossibleMarks = foundPossible
          console.log('📈 Found totals in response:', { totalMarks, totalPossibleMarks, pattern: pattern.toString() })
          break
        }
      }
    }
    
    // If we still don't have good totals, try to sum question totals
    if (totalPossibleMarks === 0) {
      const questionTotals = gradingContent.matchAll(/Question\s+\d+\s+Total[:\s]+(\d+)\s*\/\s*(\d+)/gi)
      let sumAwarded = 0
      let sumPossible = 0
      for (const match of questionTotals) {
        sumAwarded += parseInt(match[1], 10)
        sumPossible += parseInt(match[2], 10)
      }
      if (sumPossible > 0) {
        totalMarks = sumAwarded
        totalPossibleMarks = sumPossible
        console.log('📈 Calculated totals from question totals:', { totalMarks, totalPossibleMarks })
      }
    }
    
    console.log('📈 Final totals:', { totalMarks, totalPossibleMarks, breakdownCount: gradeBreakdown.length })

    // Generate PDF from the already-generated results using PDFShift
    console.log('📄 Generating graded PDF from results...')
    const gradingId = `graded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const pdfContent = generateGradingPDFContent(
      gradingContent,
      totalMarks,
      totalPossibleMarks,
      gradeBreakdown,
      markSchemeFile.name,
      studentExamFile.name,
      additionalComments || undefined
    )

    // Generate PDF using PDFShift (already working on other pages)
    const pdfBuffer = await PDFShiftPDFGenerator.generatePDF({
      id: gradingId,
      title: `Graded Exam - ${studentExamFile.name}`,
      content: pdfContent,
      format: 'summary',
      generatedAt: new Date(),
      fileCount: 2,
      subject: 'AICE Business',
      gradeLevel: 'AICE Level',
      tokenUsage: claudeResponse.usage
    })

    // Validate PDF buffer before storing
    if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      console.error('❌ Invalid PDF buffer generated:', {
        isBuffer: Buffer.isBuffer(pdfBuffer),
        length: pdfBuffer?.length || 0,
        type: typeof pdfBuffer
      })
      throw new Error('Failed to generate valid PDF buffer')
    }

    console.log('✅ PDF buffer generated successfully:', {
      size: pdfBuffer.length,
      gradingId: gradingId
    })

    // Store PDF - store without .pdf extension (route strips it)
    storePDF(gradingId, pdfBuffer)
    console.log('✅ PDF stored with key:', gradingId)

    // Create base64 data URL as fallback (for serverless environments where in-memory storage may not persist)
    const pdfBase64 = pdfBuffer.toString('base64')
    const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`

    const pdfUrl = `/api/pdf/${gradingId}.pdf`

    // Calculate percentage and grade
    const percentage = totalPossibleMarks > 0 ? (totalMarks / totalPossibleMarks) * 100 : 0
    let grade = 'F'
    if (percentage >= 90) grade = 'A*'
    else if (percentage >= 80) grade = 'A'
    else if (percentage >= 70) grade = 'B'
    else if (percentage >= 60) grade = 'C'
    else if (percentage >= 50) grade = 'D'
    else if (percentage >= 40) grade = 'E'

    // Extract student name from filename
    const studentName = studentExamFile.name.replace(/\.(pdf|docx|pptx|txt)$/i, '').replace(/_/g, ' ')

    // Save to Supabase
    console.log('💾 Saving grading results to database...')
    const { data: savedGrading, error: supabaseError } = await supabase
      .from('grading_results')
      .insert({
        student_name: studentName,
        answer_sheet_filename: markSchemeFile?.name || null,
        student_exam_filename: studentExamFile.name,
        total_marks: totalMarks,
        total_possible_marks: totalPossibleMarks,
        percentage: parseFloat(percentage.toFixed(2)),
        grade: grade,
        content: gradingContent,
        grade_breakdown: gradeBreakdown,
        additional_comments: additionalComments || null,
        pdf_url: pdfUrl,
        token_usage: claudeResponse.usage
      })
      .select()
      .single()

    if (supabaseError || !savedGrading) {
      console.error('⚠️ Failed to save to database:', supabaseError?.message)
      // Don't fail the request if database save fails - still return the result
      // But log the error for debugging
    } else {
      console.log('✅ Grading results saved to database with ID:', savedGrading.id)
    }

    const result: GradingResult = {
      pdfUrl,
      pdfDataUrl, // Add base64 fallback for reliable downloads
      totalMarks,
      totalPossibleMarks,
      gradeBreakdown,
      fullResponse: gradingContent // Keep the full response for copying
    }

    const totalTime = Date.now() - startTime
    console.log(`🎉 Exam grading completed successfully in ${totalTime}ms`)

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Exam graded successfully'
    })

  } catch (error) {
    const totalTime = Date.now() - startTime
    console.error(`❌ Exam grading error after ${totalTime}ms:`, error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to grade exam'
    }, { status: 500 })
  }
}

function parseGradingBreakdown(content: string): Array<{
  questionNumber: string
  marksAwarded: number
  marksPossible: number
  explanation: string
}> {
  const breakdown: Array<{
    questionNumber: string
    marksAwarded: number
    marksPossible: number
    explanation: string
  }> = []

  console.log('🔍 Starting parsing, content length:', content.length)

  // Method 1: Look for "Mark: X/Y - [explanation]" format (the format Claude produces naturally)
  let matchCount = 0
  let questionContext = '1' // Track which question we're in

  // First, try to extract question context from lines before marks
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Look for question headers like "Question 1 - CCT (Total: 18 marks)"
    const questionHeaderMatch = line.match(/Question\s*(\d+)\s*-\s*[^(]+\(Total:\s*(\d+)/i)
    if (questionHeaderMatch) {
      questionContext = questionHeaderMatch[1]
    }
    
    // Look for sub-question identifiers like "1(a)(i) - Identify one reason [1 mark]"
    // Pattern: number followed by optional (letter) and optional (letter) with dash
    const subQuestionMatch = line.match(/(\d+(?:\([a-z]+\))*(?:\([a-z]+\))?)\s*-\s*/i)
    if (subQuestionMatch) {
      questionContext = subQuestionMatch[1]
    }
    
    // Alternative: just "1(a)(i)" or "2(a)" at start of line
    const altSubQuestionMatch = line.match(/^(\d+(?:\([a-z]+\))*(?:\([a-z]+\))?)[\s\-]/i)
    if (altSubQuestionMatch && !line.includes('Mark:')) {
      questionContext = altSubQuestionMatch[1]
    }
    
    // Look for "Mark: X/Y - explanation" pattern
    const markMatch = line.match(/Mark:\s*(\d+)\s*\/\s*(\d+)\s*-\s*(.+)/i)
    if (markMatch) {
      matchCount++
      
      // Try to get more context from previous lines if explanation is short
      let fullExplanation = markMatch[3].trim()
      if (fullExplanation.length < 50 && i + 1 < lines.length) {
        // Look ahead for continuation
        let j = i + 1
        while (j < lines.length && j < i + 3 && !lines[j].match(/Mark:|Question|^\d+[\(\)]/)) {
          if (lines[j].trim() && !lines[j].match(/^[-=*#\s]+$/)) {
            fullExplanation += ' ' + lines[j].trim()
          }
          j++
        }
      }
      
      breakdown.push({
        questionNumber: questionContext,
        marksAwarded: parseInt(markMatch[1], 10),
        marksPossible: parseInt(markMatch[2], 10),
        explanation: fullExplanation
      })
    }
  }

  console.log(`Method 1 (Mark: X/Y format): Found ${matchCount} marks`)

  // Method 1b: Also look for structured format (QUESTION: ... MARKS_AWARDED: ... etc.)
  if (breakdown.length === 0) {
    const structuredPattern = /QUESTION:\s*(.+?)\s*MARKS_AWARDED:\s*(\d+)\s*MARKS_POSSIBLE:\s*(\d+)\s*EXPLANATION:\s*(.+?)(?=QUESTION:|$)/gis
    let structuredMatch

    while ((structuredMatch = structuredPattern.exec(content)) !== null) {
      breakdown.push({
        questionNumber: structuredMatch[1].trim(),
        marksAwarded: parseInt(structuredMatch[2], 10),
        marksPossible: parseInt(structuredMatch[3], 10),
        explanation: structuredMatch[4].trim()
      })
    }
    console.log(`Method 1b (structured): Found ${breakdown.length} questions`)
  }

  // Method 2: Look for variations of the format (case-insensitive, with different spacing)
  if (breakdown.length === 0) {
    const flexiblePattern = /(?:Question|QUESTION|Q):\s*(.+?)\s*(?:Marks\s*Awarded|MARKS_AWARDED|Marks):\s*(\d+)\s*(?:out\s*of|\/|Marks\s*Possible|MARKS_POSSIBLE):\s*(\d+)\s*(?:Explanation|EXPLANATION)?\s*(.+?)(?=(?:Question|QUESTION|Q):|$)/gis
    let flexibleMatch
    
    while ((flexibleMatch = flexiblePattern.exec(content)) !== null) {
      breakdown.push({
        questionNumber: flexibleMatch[1].trim(),
        marksAwarded: parseInt(flexibleMatch[2], 10),
        marksPossible: parseInt(flexibleMatch[3], 10),
        explanation: flexibleMatch[4] ? flexibleMatch[4].trim() : 'No explanation provided'
      })
    }
    console.log(`Method 2 (flexible): Found ${breakdown.length} questions`)
  }

  // Method 3: Look for question patterns with marks in various formats
  if (breakdown.length === 0) {
    const lines = content.split('\n')
    let currentQuestion: any = null
    let questionCounter = 1

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Look for question indicators (multiple patterns)
      const questionMatch = line.match(/(?:question|Question|QUESTION|Q|Part)\s*[:\s]*(\d+|[a-z]|\d+[a-z]?)/i) ||
                           line.match(/^(\d+)[\.\)]\s*[A-Z]/) ||
                           line.match(/^([a-z])[\.\)]\s*[A-Z]/i)
      
      if (questionMatch) {
        // Save previous question if it has marks
        if (currentQuestion && (currentQuestion.marksPossible > 0 || currentQuestion.explanation.length > 10)) {
          breakdown.push(currentQuestion)
        }
        
        currentQuestion = {
          questionNumber: questionMatch[1] || String(questionCounter),
          marksAwarded: 0,
          marksPossible: 0,
          explanation: line + ' '
        }
        questionCounter++
        continue
      }

      // Look for marks in various formats
      if (currentQuestion) {
        // Pattern 1: "Mark: X/Y - explanation" (preferred format)
        const markFormatMatch = line.match(/Mark:\s*(\d+)\s*\/\s*(\d+)\s*-\s*(.+)/i)
        if (markFormatMatch) {
          currentQuestion.marksAwarded = parseInt(markFormatMatch[1], 10)
          currentQuestion.marksPossible = parseInt(markFormatMatch[2], 10)
          currentQuestion.explanation = markFormatMatch[3].trim()
          continue
        }
        
        // Pattern 2: Other mark formats
        const marksPatterns = [
          /(\d+)\s*\/\s*(\d+)\s*(?:marks?|points?|pts?)?/i,
          /(\d+)\s*out\s*of\s*(\d+)\s*(?:marks?|points?|pts?)?/i,
          /(?:marks?|points?|pts?)[:\s]+(\d+)\s*\/\s*(\d+)/i,
          /(?:marks?|points?|pts?)[:\s]+(\d+)\s*out\s*of\s*(\d+)/i,
          /award(?:ed)?[:\s]+(\d+)\s*(?:out\s*of|\/|\s+of)\s*(\d+)/i,
          /(?:total|maximum|max)\s*(?:marks?|points?)[:\s]+(\d+)/i,
        ]

        for (const pattern of marksPatterns) {
          const marksMatch = line.match(pattern)
          if (marksMatch) {
            if (marksMatch[2]) {
              // Has both marks awarded and possible
              currentQuestion.marksAwarded = parseInt(marksMatch[1], 10)
              currentQuestion.marksPossible = parseInt(marksMatch[2], 10)
            } else if (pattern.toString().includes('total|maximum|max')) {
              // Only has possible marks
              currentQuestion.marksPossible = parseInt(marksMatch[1], 10)
            }
            break
          }
        }
      }

      // Accumulate explanation text
      if (currentQuestion && line.length > 5 && !line.match(/^[-=*#\s]+$/)) {
        // Skip lines that are just separators
        if (!line.match(/^(QUESTION|MARKS|EXPLANATION|---|===)/i)) {
          currentQuestion.explanation += line + ' '
        }
      }
    }

    // Add the last question
    if (currentQuestion && (currentQuestion.marksPossible > 0 || currentQuestion.explanation.length > 10)) {
      breakdown.push(currentQuestion)
    }

    console.log(`Method 3 (line-by-line): Found ${breakdown.length} questions`)
  }

  // Method 4: Extract from mark scheme format patterns (e.g., "1. [5 marks]")
  if (breakdown.length === 0) {
    // Look for numbered items with marks in parentheses or brackets
    const markSchemePattern = /(?:^|\n)\s*(\d+[a-z]?|[a-z])[\.\)]\s*(?:\(|\[)?.*?(\d+)\s*(?:marks?|points?|pts?)(?:\)|\])?/gi
    const matches = content.matchAll(markSchemePattern)
    
    for (const match of matches) {
      const questionNum = match[1]
      const marksPossible = parseInt(match[2], 10)
      
      // Try to find corresponding answer in student exam
      const questionSection = content.substring(Math.max(0, match.index! - 200), match.index! + 500)
      
      breakdown.push({
        questionNumber: questionNum,
        marksAwarded: 0, // Will need to be determined from student answer
        marksPossible: marksPossible,
        explanation: questionSection.substring(0, 200) + '...'
      })
    }
    
    console.log(`Method 4 (mark scheme pattern): Found ${breakdown.length} questions`)
  }

  // If still no breakdown, create a fallback entry with the full content
  if (breakdown.length === 0) {
    console.log('⚠️ No questions parsed, creating fallback entry')
    breakdown.push({
      questionNumber: '1',
      marksAwarded: 0,
      marksPossible: 0,
      explanation: content.substring(0, 500) + (content.length > 500 ? '...' : '')
    })
  }

  // Clean up explanations (remove excessive whitespace)
  breakdown.forEach(item => {
    item.explanation = item.explanation.replace(/\s+/g, ' ').trim()
    if (item.explanation.length > 500) {
      item.explanation = item.explanation.substring(0, 500) + '...'
    }
  })

  console.log(`✅ Final breakdown: ${breakdown.length} questions parsed`)
  return breakdown
}

function generateGradingPDFContent(
  gradingContent: string,
  totalMarks: number,
  totalPossibleMarks: number,
  gradeBreakdown: Array<{
    questionNumber: string
    marksAwarded: number
    marksPossible: number
    explanation: string
  }>,
  markSchemeName: string,
  studentExamName: string,
  additionalComments?: string
): string {
  const percentage = totalPossibleMarks > 0 ? ((totalMarks / totalPossibleMarks) * 100).toFixed(1) : '0'
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  // Determine grade
  let grade = 'F'
  let gradeColor = '#dc2626'
  const percentNum = parseFloat(percentage)
  if (percentNum >= 90) { grade = 'A*'; gradeColor = '#059669'; }
  else if (percentNum >= 80) { grade = 'A'; gradeColor = '#10b981'; }
  else if (percentNum >= 70) { grade = 'B'; gradeColor = '#3b82f6'; }
  else if (percentNum >= 60) { grade = 'C'; gradeColor = '#f59e0b'; }
  else if (percentNum >= 50) { grade = 'D'; gradeColor = '#f97316'; }
  else if (percentNum >= 40) { grade = 'E'; gradeColor = '#ef4444'; }

  const studentName = studentExamName.replace(/\.(pdf|docx)$/i, '').replace(/_/g, ' ')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  color: #111827;
  line-height: 1.5;
  padding: 24px;
  background: #fff;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  margin-bottom: 24px;
  border-bottom: 2px solid #e5e7eb;
}
.student-name {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
}
.date {
  font-size: 13px;
  color: #6b7280;
}
.score-banner {
  background: linear-gradient(135deg, ${gradeColor}15 0%, ${gradeColor}08 100%);
  border-left: 4px solid ${gradeColor};
  padding: 20px 24px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.score-main {
  display: flex;
  gap: 24px;
  align-items: center;
}
.grade-box {
  font-size: 48px;
  font-weight: 800;
  color: ${gradeColor};
  line-height: 1;
  min-width: 70px;
  text-align: center;
}
.score-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.score-points {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}
.score-percent {
  font-size: 15px;
  color: #6b7280;
}
.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin: 24px 0 12px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid #e5e7eb;
}
.question {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 14px 16px;
  margin-bottom: 10px;
}
.q-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.q-number {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
}
.q-score {
  font-size: 13px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
  white-space: nowrap;
}
.q-feedback {
  font-size: 13px;
  color: #374151;
  line-height: 1.5;
}
.summary {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 2px solid #e5e7eb;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.summary-box {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 14px;
}
.summary-title {
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}
.summary-list {
  font-size: 13px;
  color: #374151;
  line-height: 1.6;
}
.summary-list li {
  margin-bottom: 4px;
}
.footer {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  text-align: center;
  font-size: 11px;
  color: #9ca3af;
}
</style>
</head>
<body>

<div class="header">
  <div class="student-name">${studentName}</div>
  <div class="date">${currentDate}</div>
</div>

<div class="score-banner">
  <div class="score-main">
    <div class="grade-box">${grade}</div>
    <div class="score-info">
      <div class="score-points">${totalMarks} / ${totalPossibleMarks} marks</div>
      <div class="score-percent">${percentage}% • AICE Business Exam</div>
    </div>
  </div>
</div>

<div class="section-title">Question Breakdown</div>

${gradeBreakdown.map((item) => {
  const qPercent = item.marksPossible > 0 ? ((item.marksAwarded / item.marksPossible) * 100) : 0;
  let color = '#dc2626';
  let bg = '#dc262615';
  if (qPercent >= 80) { color = '#059669'; bg = '#05966915'; }
  else if (qPercent >= 60) { color = '#3b82f6'; bg = '#3b82f615'; }
  else if (qPercent >= 40) { color = '#f59e0b'; bg = '#f59e0b15'; }

  return `<div class="question">
  <div class="q-header">
    <div class="q-number">Question ${item.questionNumber}</div>
    <div class="q-score" style="background: ${bg}; color: ${color};">${item.marksAwarded}/${item.marksPossible} (${qPercent.toFixed(0)}%)</div>
  </div>
  <div class="q-feedback">${item.explanation}</div>
</div>`;
}).join('')}

<div class="summary">
  <div class="summary-box">
    <div class="summary-title">Strengths</div>
    <ul class="summary-list">
      ${gradeBreakdown.filter(q => (q.marksAwarded / q.marksPossible) >= 0.7).slice(0, 3)
        .map(q => `<li>Question ${q.questionNumber}</li>`).join('') ||
        '<li>Keep building on fundamentals</li>'}
    </ul>
  </div>
  <div class="summary-box">
    <div class="summary-title">Focus Areas</div>
    <ul class="summary-list">
      ${gradeBreakdown.filter(q => (q.marksAwarded / q.marksPossible) < 0.5).slice(0, 3)
        .map(q => `<li>Question ${q.questionNumber}</li>`).join('') ||
        '<li>Maintain strong performance</li>'}
    </ul>
  </div>
</div>

<div class="footer">
  CasanovaStudy Exam Grader • ${currentDate}
</div>

</body>
</html>`;
}

