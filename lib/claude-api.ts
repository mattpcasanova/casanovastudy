import Anthropic from '@anthropic-ai/sdk'
import { ClaudeApiRequest, ClaudeApiResponse, StudyGuideFormat } from '@/types'

export class ClaudeService {
  private anthropic: Anthropic

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required')
    }

    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }

  async generateStudyGuide(request: ClaudeApiRequest): Promise<ClaudeApiResponse> {
    try {
      const prompt = this.buildPrompt(request)

      // Estimate input tokens (rough approximation: 1 token ≈ 4 characters)
      const estimatedInputTokens = Math.ceil(prompt.length / 4)

      console.log('📊 Token Usage Analysis:', {
        promptLength: prompt.length,
        estimatedInputTokens,
        maxOutputTokens: 4000,
        totalEstimatedTokens: estimatedInputTokens + 4000,
        contentPreview: prompt.substring(0, 200) + '...'
      })

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      const content = response.content[0]
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude API')
      }

      // Log actual token usage
      const actualUsage = {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens
      }

      console.log('✅ Actual Token Usage:', {
        inputTokens: actualUsage.input_tokens,
        outputTokens: actualUsage.output_tokens,
        totalTokens: actualUsage.total_tokens,
        costEstimate: `~$${(actualUsage.total_tokens * 0.000015).toFixed(4)}` // Rough cost estimate
      })

      return {
        content: content.text,
        usage: actualUsage
      }
    } catch (error) {
      console.error('Claude API error:', error)
      throw new Error(`Failed to generate study guide: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async *generateStudyGuideStream(request: ClaudeApiRequest): AsyncGenerator<string, { content: string; usage: any }, undefined> {
    try {
      const prompt = this.buildPrompt(request)

      console.log('📊 Starting streaming generation...')

      const stream = await this.anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      let fullContent = ''

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const text = chunk.delta.text
          fullContent += text
          yield text
        }
      }

      const finalMessage = await stream.finalMessage()
      const actualUsage = {
        input_tokens: finalMessage.usage.input_tokens,
        output_tokens: finalMessage.usage.output_tokens,
        total_tokens: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens
      }

      console.log('✅ Streaming Complete - Token Usage:', actualUsage)

      return {
        content: fullContent,
        usage: actualUsage
      }
    } catch (error) {
      console.error('Claude API streaming error:', error)
      throw new Error(`Failed to generate study guide: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private buildPrompt(request: ClaudeApiRequest): string {
    const { content, subject, gradeLevel, format, topicFocus, difficultyLevel, additionalInstructions } = request

    const formatInstructions = this.getFormatInstructions(format as any)
    const difficultyInstructions = this.getDifficultyInstructions(difficultyLevel)

      return `You are an expert educational content creator specializing in creating exam-focused study guides for ${gradeLevel} students.

TASK: Create a study guide using ONLY the content provided in the source materials. You may add analogies, explanations, and expansions to help clarify the provided content, but do not introduce new concepts, formulas, or information not mentioned in the provided PDFs.

CRITICAL REQUIREMENTS:
1. USE ONLY PROVIDED CONTENT: Base all content on concepts, terms, and information from the source materials
2. ALWAYS INCLUDE LEARNING OBJECTIVES: Create learning objectives based on the content, even if not explicitly stated in the source
3. NO EXTERNAL KNOWLEDGE: Do not add new concepts, formulas, or examples not found in the provided PDFs
4. ALLOW CLARIFICATIONS: You may add analogies, explanations, and expansions to help explain the provided content
5. CREATE CLEAR HIERARCHY: Always organize content into 🔴 ESSENTIAL, 🟡 IMPORTANT, and 🟢 SUPPORTING sections

SUBJECT: ${subject}
GRADE LEVEL: ${gradeLevel}
FORMAT: ${format}
${topicFocus ? `TOPIC FOCUS: ${topicFocus}` : ''}
${difficultyLevel ? `DIFFICULTY LEVEL: ${difficultyLevel}` : ''}

${additionalInstructions ? `STYLE REQUIREMENTS: ${additionalInstructions}` : ''}

${formatInstructions}

${difficultyInstructions}

COURSE MATERIALS TO ANALYZE:
${content}

STUDY GUIDE STRUCTURE REQUIREMENTS:

1. LEARNING OBJECTIVES SECTION (Always Required)
   - Create learning objectives based on the content provided
   - If "Learning Intentions" or similar sections exist, use those
   - If not explicitly stated, infer objectives from the content topics
   - Always include 3-5 clear, measurable learning objectives

2. CONTENT PRIORITIZATION SYSTEM (Always Required)
   - 🔴 ESSENTIAL: Core concepts, key definitions, and fundamental principles from the source materials
   - 🟡 IMPORTANT: Examples, applications, and practical relationships from the provided PDFs
   - 🟢 SUPPORTING: Additional context, background information, and extended details from the source materials
   - Always organize content into these three priority levels with clear section headers

3. ACTIVE LEARNING ELEMENTS (Based on Source Content Only)
   - Questions: Create questions about concepts from the source materials (may include analogies to help explain)
   - Key Term Boxes: Highlight terms and definitions from the provided PDFs (may add clarifications and analogies)
   - Connection Points: "This relates to..." "Remember that..." "Compare with..."
   - Visual Cues: Use symbols, arrows, and formatting to show relationships

4. EXAM OPTIMIZATION
   - Focus on concepts students need to recall, not just understand
   - Include common exam question patterns
   - Highlight frequently tested relationships and formulas
   - Create comparison tables for contrasting concepts
   - Use process flowcharts for sequential concepts

SPECIAL INSTRUCTIONS FOR POWERPOINT PDFs:
If the content appears to be from PowerPoint presentations and contains some garbled or encoded text, please:
1. Focus on the readable, clear text portions
2. Extract key concepts, definitions, and important points from the readable content
3. If you can identify slide breaks or sections, organize the content accordingly
4. Look specifically for learning objectives, bullet points, and key terms
5. Create a study guide that captures the educational value from the readable portions
6. When content is limited, provide general study guidance for the subject area

FORMATTING GUIDELINES:
- Use clear headings and subheadings
- Include visual separators between sections
- Use bullet points and numbered lists for clarity
- Highlight key terms in bold or with callout boxes
- Create tables for comparisons
- Use arrows and symbols to show relationships
- Include space for student notes

Create a study guide that:
1. Starts with clear learning objectives from the source material
2. Organizes content by priority (Essential → Important → Supporting)
3. Includes active learning elements throughout
4. Is optimized for exam preparation and retention
5. Uses visual cues and clear formatting
6. Focuses on what students need to know for exams
7. Is appropriate for ${gradeLevel} students
8. Follows the ${format} format exactly

IMPORTANT: Base all content on what is mentioned in the provided source materials. You may add analogies, explanations, and clarifications to help students understand the provided content, but do not introduce new concepts, formulas, or information not found in the PDFs. If a concept is not mentioned in the source materials, do not include it in the study guide.

Make sure the study guide is ready for students to use immediately for studying and review.`
  }

  private getFormatInstructions(format: StudyGuideFormat): string {
    const instructions = {
      'outline': 'Create a detailed hierarchical outline using ONLY content from the source materials. Always start with Learning Objectives, then organize content into 🔴 ESSENTIAL, 🟡 IMPORTANT, and 🟢 SUPPORTING sections. Use clear numbering and indentation. Only include concepts explicitly mentioned in the provided PDFs.',
      'flashcards': 'Create question-answer pairs using ONLY concepts from the source materials. Always organize into 🔴 ESSENTIAL, 🟡 IMPORTANT, and 🟢 SUPPORTING sections. Format as "Q: [question] A: [answer]". Only create questions about topics explicitly mentioned in the provided PDFs.',
      'quiz': `Create a comprehensive quiz using ONLY content from the source materials. Always organize content into 🔴 ESSENTIAL, 🟡 IMPORTANT, and 🟢 SUPPORTING sections.

CRITICAL FORMATTING REQUIREMENTS FOR QUIZ QUESTIONS:
- Multiple Choice Questions: Start each with "MC_QUESTION:" (NO markdown formatting, just plain text) followed by the question text, then list options as "A) option", "B) option", etc. Include "Correct Answer: X" on a new line.
- True/False Questions: Start each with "TF_QUESTION:" (NO markdown formatting, just plain text) followed by the question text. Include "Answer: True" or "Answer: False" on a new line.
- Short Answer Questions: Start each with "SA_QUESTION:" (NO markdown formatting, just plain text) followed by the question text. CRITICAL: You MUST include "Sample Answer:" on a new line followed by a complete, detailed example answer that a student should give. This sample answer should be specific to the question and based on the source material.

EXAMPLE FORMAT (EXACTLY AS SHOWN):
MC_QUESTION: Which factor most directly affects solubility?
A) The color of the solution
B) The temperature of the water
C) The volume of the container
D) The time of day
Correct Answer: B

TF_QUESTION: Stirring increases the rate of dissolving but not the total amount that can dissolve.
Answer: True

SA_QUESTION: Explain what happens when salt dissolves in water.
Sample Answer: When salt (sodium chloride) dissolves in water, the polar water molecules surround the sodium and chloride ions. The positive end of water molecules attracts chloride ions while the negative end attracts sodium ions, breaking apart the ionic bonds and dispersing the ions throughout the solution. This process is called dissociation.

IMPORTANT:
- Do NOT use **bold** formatting around the prefixes. Use exactly MC_QUESTION:, TF_QUESTION:, SA_QUESTION: as plain text.
- Every short answer question MUST have a detailed, specific sample answer based on the source material content.

Include: 1) Multiple choice questions (5-7 questions), 2) True/False questions (3-5 questions), 3) Short answer questions (2-3 questions). Only test knowledge that is explicitly mentioned in the source materials.`,
      'summary': 'Create a summary using ONLY content from the source materials. Always organize into 🔴 ESSENTIAL, 🟡 IMPORTANT, and 🟢 SUPPORTING sections. Capture key concepts and main ideas that are explicitly mentioned in the provided PDFs. Do not add external knowledge or concepts not found in the source.',
    }
    return instructions[format] || instructions.summary
  }

  private getDifficultyInstructions(difficultyLevel?: string): string {
    if (!difficultyLevel) return ''

    const instructions = {
      'beginner': 'Use simple language and basic concepts. Focus on fundamental understanding and provide clear explanations.',
      'intermediate': 'Use moderate complexity with some advanced concepts. Balance foundational knowledge with deeper understanding.',
      'advanced': 'Use sophisticated language and complex concepts. Focus on deep understanding, critical thinking, and application.'
    }
    return instructions[difficultyLevel as keyof typeof instructions] || ''
  }

  /**
   * Grade an exam with images (from client-side conversion or server-side)
   * This is the simplest approach - just use the images provided
   */
  async gradeExamWithImages(params: {
    markSchemeText: string
    studentExamText: string
    markSchemeImages?: Array<{ pageNumber: number; imageData: string; mimeType: string }>
    studentExamImages?: Array<{ pageNumber: number; imageData: string; mimeType: string }>
    markSchemeFile?: { buffer: Buffer; name: string; type: string }
    studentExamFile?: { buffer: Buffer; name: string; type: string }
    additionalComments?: string
  }): Promise<ClaudeApiResponse> {
    const { markSchemeText, studentExamText, markSchemeImages: providedMarkSchemeImages, studentExamImages: providedStudentExamImages, markSchemeFile, studentExamFile, additionalComments } = params
    
    // SIMPLE APPROACH: Send PDFs directly to Claude (like Claude Chat does)
    console.log('📤 Sending PDFs directly to Claude API...')
    console.log('Mark scheme file:', {
      name: markSchemeFile?.name,
      size: markSchemeFile?.buffer.length,
      type: markSchemeFile?.type
    })
    console.log('Student exam file:', {
      name: studentExamFile?.name,
      size: studentExamFile?.buffer.length,
      type: studentExamFile?.type
    })
    
    // Build content array with PDFs as documents
    const content: any[] = []
    
    // Add instruction (with optional teacher comments)
    let instructionText = `You are an expert exam grader. Grade this exam against the mark scheme with STRICT CONSISTENCY.

CRITICAL GRADING PRINCIPLES:
1. **Be Consistent**: Apply the same standards to all similar responses
2. **Follow the Mark Scheme Exactly**: Award marks only when criteria are clearly met
3. **No Assumptions**: If the answer doesn't explicitly show understanding, don't award the mark
4. **Partial Marks**: Award partial marks fairly based on the mark scheme breakdown
5. **Be Fair but Strict**: Maintain the same level of strictness throughout

I've attached the mark scheme and student exam.`
    
    if (additionalComments && additionalComments.trim()) {
      instructionText += `\n\n**Teacher's Special Instructions:**\n${additionalComments}`
    }
    
    instructionText += `\n\nPlease format your response as follows:
- For each question, provide: Question [number], Mark: X/Y - [brief explanation]
- At the end, provide total marks, percentage, and brief feedback on strengths/areas for improvement.

Remember: Grade strictly and consistently according to the mark scheme. Do not be overly generous or harsh - just follow the criteria precisely.`
    
    content.push({
      type: 'text',
      text: instructionText
    })
    
    // Add mark scheme as document
    if (markSchemeFile) {
      content.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: markSchemeFile.buffer.toString('base64')
        }
      })
    }
    
    // Add student exam as document
    if (studentExamFile) {
      content.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: studentExamFile.buffer.toString('base64')
        }
      })
    }
    
    console.log('📤 Sending to Claude API with', content.length, 'content items')
    
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.1, // Lower temperature for more consistent grading (was 0.3)
      messages: [
        {
          role: 'user',
          content: content
        }
      ]
    })

    const responseContent = response.content[0]
    if (responseContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude API')
    }

    return {
      content: responseContent.text,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      }
    }
  }

  /**
   * Grade an exam with support for vision API when text extraction fails
   * For image-based PDFs, converts PDF pages to images and sends them to Claude's vision API
   * @deprecated Use gradeExamWithImages instead
   */
  async gradeExamWithVision(params: {
    markSchemeText: string
    studentExamText: string
    markSchemeFile?: { buffer: Buffer; name: string; type: string }
    studentExamFile?: { buffer: Buffer; name: string; type: string }
  }): Promise<ClaudeApiResponse> {
    const { markSchemeText, studentExamText, markSchemeFile, studentExamFile } = params
    
    // Build content array - mix of text and images
    const content: Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }> = []
    
    // Start with the instruction
    content.push({
      type: 'text',
      text: `Can you tell me what marks you would give for this exam with this mark scheme? Give concise reasons.\n\n`
    })
    
    // Convert PDFs to images if needed
    let markSchemeImages: any[] = []
    let studentExamImages: any[] = []
    
    if (markSchemeFile) {
      console.log('📸 Converting mark scheme PDF to images...')
      const { convertPDFToImages } = await import('@/lib/pdf-to-image')
      markSchemeImages = await convertPDFToImages(markSchemeFile.buffer, 10) // Max 10 pages
      console.log(`✅ Converted mark scheme to ${markSchemeImages.length} images`)
    }
    
    if (studentExamFile) {
      console.log('📸 Converting student exam PDF to images...')
      const { convertPDFToImages } = await import('@/lib/pdf-to-image')
      studentExamImages = await convertPDFToImages(studentExamFile.buffer, 10) // Max 10 pages
      console.log(`✅ Converted student exam to ${studentExamImages.length} images`)
    }
    
    // Handle mark scheme - add images or text
    if (markSchemeImages.length > 0) {
      content.push({
        type: 'text',
        text: `MARK SCHEME (image-based PDF with ${markSchemeImages.length} page${markSchemeImages.length > 1 ? 's' : ''}):\n`
      })
      
      // Add each page as an image
      for (const image of markSchemeImages) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: image.imageData
          }
        })
      }
      
      // Also include any extracted text if available
      if (markSchemeText && markSchemeText.length > 50 && !markSchemeText.includes('PDF Document:')) {
        content.push({
          type: 'text',
          text: `\nExtracted text from mark scheme (may be incomplete):\n${markSchemeText}\n\n`
        })
      }
    } else {
      content.push({
        type: 'text',
        text: `MARK SCHEME:\n${markSchemeText}\n\n`
      })
    }
    
    // Handle student exam - add images or text
    if (studentExamImages.length > 0) {
      content.push({
        type: 'text',
        text: `STUDENT EXAM (image-based PDF with ${studentExamImages.length} page${studentExamImages.length > 1 ? 's' : ''}):\n`
      })
      
      // Add each page as an image
      for (const image of studentExamImages) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: image.imageData
          }
        })
      }
      
      // Also include any extracted text if available
      if (studentExamText && studentExamText.length > 50 && !studentExamText.includes('PDF Document:')) {
        content.push({
          type: 'text',
          text: `\nExtracted text from student exam (may be incomplete):\n${studentExamText}\n\n`
        })
      }
    } else {
      content.push({
        type: 'text',
        text: `STUDENT EXAM:\n${studentExamText}\n\n`
      })
    }
    
    // Add final instructions
    content.push({
      type: 'text',
      text: `\nPlease analyze each question and sub-question in the student exam against the mark scheme. For each one, provide:
- The question number/identifier
- The marks awarded (e.g., "Mark: 3/5")
- A brief reason for the marks given

Include totals for each main question and an overall total at the end.

${markSchemeImages.length > 0 || studentExamImages.length > 0 ? 'Note: Some PDFs are image-based/scanned documents. Please read the images carefully to extract all text and grade accordingly.' : ''}`
    })
    
    try {
      console.log('📊 Grading with Vision API:', {
        hasMarkSchemeImage: markSchemeImages.length > 0,
        hasStudentExamImage: studentExamImages.length > 0,
        markSchemePages: markSchemeImages.length,
        studentExamPages: studentExamImages.length,
        markSchemeTextLength: markSchemeText.length,
        studentExamTextLength: studentExamText.length
      })
      
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: content
          }
        ]
      })

      const responseContent = response.content[0]
      if (responseContent.type !== 'text') {
        throw new Error('Unexpected response type from Claude API')
      }

      const actualUsage = {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens
      }
      
      console.log('✅ Grading Token Usage (may include limited text from image-based PDFs):', {
        inputTokens: actualUsage.input_tokens,
        outputTokens: actualUsage.output_tokens,
        totalTokens: actualUsage.total_tokens,
        costEstimate: `~$${(actualUsage.total_tokens * 0.000015).toFixed(4)}`
      })

      return {
        content: responseContent.text,
        usage: actualUsage
      }
    } catch (error) {
      console.error('Claude Vision API grading error:', error)
      throw new Error(`Failed to grade exam: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Grade an exam by comparing student answers against a mark scheme
   * @param prompt - The grading prompt containing mark scheme and student exam content
   * @returns Claude API response with grading analysis
   */
  async gradeExam(prompt: string): Promise<ClaudeApiResponse> {
    try {
      // Estimate input tokens (rough approximation: 1 token ≈ 4 characters)
      const estimatedInputTokens = Math.ceil(prompt.length / 4)
      
      console.log('📊 Grading Token Usage Analysis:', {
        promptLength: prompt.length,
        estimatedInputTokens,
        maxOutputTokens: 4000,
        totalEstimatedTokens: estimatedInputTokens + 4000,
        contentPreview: prompt.substring(0, 200) + '...'
      })
      
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0.3, // Lower temperature for more consistent grading
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      const content = response.content[0]
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude API')
      }

      // Log actual token usage
      const actualUsage = {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens
      }
      
      console.log('✅ Grading Token Usage:', {
        inputTokens: actualUsage.input_tokens,
        outputTokens: actualUsage.output_tokens,
        totalTokens: actualUsage.total_tokens,
        costEstimate: `~$${(actualUsage.total_tokens * 0.000015).toFixed(4)}`
      })

      return {
        content: content.text,
        usage: actualUsage
      }
    } catch (error) {
      console.error('Claude API grading error:', error)
      throw new Error(`Failed to grade exam: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
