import Anthropic from '@anthropic-ai/sdk'
import { ClaudeApiRequest, ClaudeApiResponse, StudyGuideFormat } from '@/types'
import { CustomGuideContent, CustomSection } from '@/lib/types/custom-guide'

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
    studentExamFiles?: Array<{ buffer: Buffer; name: string; type: string }> // Multiple files support
    additionalComments?: string
  }): Promise<ClaudeApiResponse> {
    const { markSchemeText, studentExamText, markSchemeFile, studentExamFile, studentExamFiles, additionalComments } = params

    // Helper to check if file is an image
    const isImageFile = (type: string, name: string) => {
      const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
      const extension = name.split('.').pop()?.toLowerCase()
      const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']
      return imageTypes.includes(type) || (extension && imageExtensions.includes(extension))
    }

    // Helper to get correct MIME type for images
    const getImageMimeType = (type: string, name: string): string => {
      const extension = name.split('.').pop()?.toLowerCase()
      // Map common extensions to MIME types Claude supports
      const mimeMap: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'heic': 'image/jpeg', // HEIC needs conversion, fallback to JPEG
        'heif': 'image/jpeg'
      }
      if (extension && mimeMap[extension]) {
        return mimeMap[extension]
      }
      // Return a supported type if the original isn't recognized
      if (type.startsWith('image/')) {
        return type === 'image/heic' || type === 'image/heif' ? 'image/jpeg' : type
      }
      return 'image/jpeg'
    }

    // Combine all student exam files
    const allStudentFiles = studentExamFiles && studentExamFiles.length > 0
      ? studentExamFiles
      : studentExamFile
        ? [studentExamFile]
        : []

    const hasMarkScheme = !!markSchemeFile
    const hasMultipleFiles = allStudentFiles.length > 1
    const hasImages = allStudentFiles.some(f => isImageFile(f.type, f.name))

    // SIMPLE APPROACH: Send PDFs directly to Claude (like Claude Chat does)
    console.log('📤 Sending files directly to Claude API...')
    console.log('Mark scheme file:', {
      name: markSchemeFile?.name,
      size: markSchemeFile?.buffer.length,
      type: markSchemeFile?.type
    })
    console.log('Student exam files:', allStudentFiles.length, 'files')
    console.log('Has images:', hasImages)

    // Build content array with PDFs as documents
    const content: any[] = []

    // Add instruction (with optional teacher comments)
    const hasTeacherInstructions = additionalComments && additionalComments.trim()

    let instructionText = `You are an expert exam grader. Grade this exam against the mark scheme with consistency and fairness.

CRITICAL GRADING PRINCIPLES:
1. **Be Consistent**: Apply the same standards to all similar responses
2. **Follow the Mark Scheme**: Award marks based on the criteria provided
3. **Partial Marks**: Award partial marks fairly based on the mark scheme breakdown
4. **Clear Explanations**: Provide brief, constructive feedback for each question
5. **GRADE EVERY QUESTION**: You MUST grade EVERY question and sub-question listed in the mark scheme. Do not skip any questions.
6. **COMPLETE ALL SECTIONS**: Grade ALL sections (A, B, C, etc.) including essay/extended response sections. NEVER stop early.`

    if (hasMultipleFiles) {
      instructionText += `\n\n**NOTE**: This student's exam consists of ${allStudentFiles.length} pages/images. Please analyze ALL pages in order to grade the complete exam.`
    }

    instructionText += `\n\nI've attached the ${hasMarkScheme ? 'mark scheme and ' : ''}student exam.`

    if (hasTeacherInstructions) {
      instructionText += `\n\n**IMPORTANT - Teacher's Instructions (follow these):**\n${additionalComments}\n\nApply these instructions when grading. They take priority over default grading strictness.`
    }

    instructionText += `\n\n**RESPONSE FORMAT (follow exactly):**

**STEP 1 - MARK SCHEME SUMMARY (MANDATORY):**
Before grading, you MUST first analyze the mark scheme and output a complete summary of ALL questions:
[MARK SCHEME SUMMARY]
List EVERY question with marks in format: 1a(2), 1b(3), 2(5), 3a(4), 3b(6)...
Where the number in parentheses is the marks possible for that question.
Total: XX marks
[END SUMMARY]

This summary ensures you account for ALL questions. After the summary, grade each one.

**STEP 2 - GRADE EACH QUESTION:**
For EACH question in the mark scheme, use this EXACT format on its own line:
**Question [number]**, Mark: X/Y - [specific feedback explaining WHY marks were lost and HOW to improve]

FEEDBACK REQUIREMENTS (VERY IMPORTANT):
- For PARTIAL marks: Explain SPECIFICALLY what the student got right AND what was missing/wrong
- Reference the mark scheme criteria when explaining lost marks
- Tell students WHAT they needed to include to earn full marks
- NEVER use vague phrases like "Partial credit" or "lacks depth" without specifics
- BAD: "Partial points awarded" or "Answer mentions X but lacks depth"
- GOOD: "Correctly identified photosynthesis but missed that it requires chlorophyll. Needed to mention light-dependent reactions for full marks."
- GOOD: "Got 2/3 marks for correct formula and method. Lost 1 mark for arithmetic error in final step (wrote 24 instead of 42)."

QUESTION NAMING RULES (VERY IMPORTANT):
- Use EXACTLY the question number/label as it appears in the mark scheme
- If mark scheme says "1a" just use "1a", NOT "Question 1a" or "Section A Q1a"
- If mark scheme says "1(a)(i)" use "1(a)(i)"
- DO NOT duplicate questions - each question should appear ONLY ONCE
- DO NOT add Section prefixes unless the mark scheme specifically uses them
- IMPORTANT: If different sections have the same question numbers (e.g., Section A has "2a" AND Section C has "2a"), you MUST prefix with the section to distinguish them (e.g., "Section A 2a" and "Section C 2a")

Examples of correct format:
**Question 1**, Mark: 5/6 - Good understanding but missed one key point.
**Question 1a**, Mark: 2/2 - Correct calculation.
**Question 1b**, Mark: 3/5 - Partial credit for method.
**Question 2(a)(i)**, Mark: 1/2 - Partial credit.
**Question Section C 2a**, Mark: 6/8 - (use this format when sections have duplicate numbers)

ILLEGIBLE HANDWRITING:
- If you cannot read or understand a student's handwriting for a question, award 0 marks
- Use explanation: "Answer could not be read/understood due to illegible handwriting"
- Do NOT skip questions - always include them with 0 marks if illegible

CRITICAL REQUIREMENTS:
- **START WITH MARK SCHEME SUMMARY**: Always begin with [MARK SCHEME SUMMARY] listing all questions and their marks, then start grading with Question 1 (or 1a if subdivided). Never skip the summary or the first question.
- Grade EVERY question from the mark scheme exactly ONCE - ALL SECTIONS (A, B, C, etc.)
- NEVER stop early - you MUST grade through ALL sections including essay questions
- Each question appears only ONCE in your response - no duplicates
- Output questions in SEQUENTIAL ORDER: 1, 1a, 1b, 2, 2a, 2b, 3... etc. (same order as mark scheme)
- If the student didn't attempt a question, award 0 marks with explanation "Question not attempted"
- Use the exact marks available from the mark scheme for the denominator (Y)
- The total of all Y values should equal the EXACT total marks possible from the mark scheme
- **GRADE ALL SUB-PARTS IN EVERY SECTION**: If ANY section (A, B, C, D, Part 1, Part 2, etc.) has questions with sub-parts like 2a, 2b, 2c (or Option 1a, 1b, Option 2a, 2b), you MUST grade EVERY sub-part separately. Do NOT stop after grading just 2a - continue to 2b, 2c, 2d, etc. Each sub-part should have its own entry.
- **ESSAY/EXTENDED RESPONSE QUESTIONS ARE MANDATORY**: If the mark scheme includes extended response or essay sections (regardless of what section letter/number they are: Section C, Section D, Part 3, etc.), you MUST grade them. Do NOT skip these questions even if the student's response is poor or blank - award 0 marks with explanation.
- **OPTION/CHOICE QUESTIONS**: If a section offers multiple OPTIONS to choose from (e.g., "Option 1" OR "Option 2", "Answer ONE of the following"), students only answer ONE option, not all of them. Look at the student's exam to see which option they actually answered, and ONLY grade that option. Do NOT grade options the student did not attempt - exclude them entirely from your grading and from the mark scheme summary. For example, if Section C offers Option 1 (20 marks) and Option 2 (20 marks), and the student answered Option 1, only include Option 1 in your grading - the total possible marks for that section is 20, not 40.
- **COMPLETE YOUR FULL RESPONSE**: Provide detailed feedback for ALL questions including essays and extended responses. Do not abbreviate or cut short your explanations.
- **VERIFY YOUR TOTAL**: Before finishing, verify that your Total marks match the EXACT total from the mark scheme. Your Y values MUST sum to the mark scheme's total (e.g., if it says "Total: 50 marks" or "[X]/50", your Y values must sum to exactly 50).

At the end, provide:
**Total: X/Y** (where Y is the EXACT total marks possible from the mark scheme)
**Percentage: Z%**
**Grade: [Letter]** (use American scale: A=90%+, B=80-89%, C=70-79%, D=60-69%, F=below 60%)

Brief feedback on strengths and areas for improvement.

**IMPORTANT**: Start your response immediately with "[MARK SCHEME SUMMARY]" then list all questions, then begin grading with "**Question 1**" (or "**Question 1a**" if subdivided). Do not include any preamble before the mark scheme summary.

${hasTeacherInstructions ? 'Follow the teacher\'s instructions above when determining marks.' : 'Grade fairly and consistently according to the mark scheme.'}`

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

    // Add all student exam files (documents or images)
    for (let i = 0; i < allStudentFiles.length; i++) {
      const file = allStudentFiles[i]

      if (isImageFile(file.type, file.name)) {
        // Add as image for Claude's vision API
        const mimeType = getImageMimeType(file.type, file.name)
        console.log(`📸 Adding image ${i + 1}: ${file.name} as ${mimeType}`)
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType,
            data: file.buffer.toString('base64')
          }
        })
      } else {
        // Add as document (PDF, DOCX)
        console.log(`📄 Adding document ${i + 1}: ${file.name}`)
        content.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: file.buffer.toString('base64')
          }
        })
      }
    }

    console.log('📤 Sending to Claude API with', content.length, 'content items')

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384,
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
   * Streaming version of gradeExamWithImages
   * Yields text chunks as they are generated
   */
  async *gradeExamWithImagesStream(params: {
    markSchemeText: string
    studentExamText: string
    markSchemeImages?: Array<{ pageNumber: number; imageData: string; mimeType: string }>
    studentExamImages?: Array<{ pageNumber: number; imageData: string; mimeType: string }>
    markSchemeFile?: { buffer: Buffer; name: string; type: string }
    markSchemeFiles?: Array<{ buffer: Buffer; name: string; type: string }> // Multiple mark scheme files support
    studentExamFile?: { buffer: Buffer; name: string; type: string }
    studentExamFiles?: Array<{ buffer: Buffer; name: string; type: string }>
    additionalComments?: string
  }): AsyncGenerator<string, { content: string; usage: any }, undefined> {
    const { markSchemeFile, markSchemeFiles, studentExamFile, studentExamFiles, additionalComments } = params

    // Helper to check if file is an image
    const isImageFile = (type: string, name: string) => {
      const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
      const extension = name.split('.').pop()?.toLowerCase()
      const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']
      return imageTypes.includes(type) || (extension && imageExtensions.includes(extension))
    }

    // Helper to get correct MIME type for images
    const getImageMimeType = (type: string, name: string): string => {
      const extension = name.split('.').pop()?.toLowerCase()
      const mimeMap: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'heic': 'image/jpeg',
        'heif': 'image/jpeg'
      }
      if (extension && mimeMap[extension]) {
        return mimeMap[extension]
      }
      if (type.startsWith('image/')) {
        return type === 'image/heic' || type === 'image/heif' ? 'image/jpeg' : type
      }
      return 'image/jpeg'
    }

    // Combine all mark scheme files
    const allMarkSchemeFiles = markSchemeFiles && markSchemeFiles.length > 0
      ? markSchemeFiles
      : markSchemeFile
        ? [markSchemeFile]
        : []

    // Combine all student exam files
    const allStudentFiles = studentExamFiles && studentExamFiles.length > 0
      ? studentExamFiles
      : studentExamFile
        ? [studentExamFile]
        : []

    const hasMarkScheme = allMarkSchemeFiles.length > 0
    const hasMultipleFiles = allStudentFiles.length > 1
    const hasTeacherInstructions = additionalComments && additionalComments.trim()

    // Build content array
    const content: any[] = []

    let instructionText = `You are an expert exam grader. Grade this exam against the mark scheme with consistency and fairness.

CRITICAL GRADING PRINCIPLES:
1. **Be Consistent**: Apply the same standards to all similar responses
2. **Follow the Mark Scheme**: Award marks based on the criteria provided
3. **Partial Marks**: Award partial marks fairly based on the mark scheme breakdown
4. **Clear Explanations**: Provide brief, constructive feedback for each question
5. **GRADE EVERY QUESTION**: You MUST grade EVERY question and sub-question listed in the mark scheme. Do not skip any questions.
6. **COMPLETE ALL SECTIONS**: Grade ALL sections (A, B, C, etc.) including essay/extended response sections. NEVER stop early.`

    if (hasMultipleFiles) {
      instructionText += `\n\n**NOTE**: This student's exam consists of ${allStudentFiles.length} pages/images. Please analyze ALL pages in order to grade the complete exam.`
    }

    instructionText += `\n\nI've attached the ${hasMarkScheme ? 'mark scheme and ' : ''}student exam.`

    if (hasTeacherInstructions) {
      instructionText += `\n\n**IMPORTANT - Teacher's Instructions (follow these):**\n${additionalComments}\n\nApply these instructions when grading. They take priority over default grading strictness.`
    }

    instructionText += `\n\n**RESPONSE FORMAT (follow exactly):**

**STEP 1 - MARK SCHEME SUMMARY (MANDATORY):**
Before grading, you MUST first analyze the mark scheme and output a complete summary of ALL questions:
[MARK SCHEME SUMMARY]
List EVERY question with marks in format: 1a(2), 1b(3), 2(5), 3a(4), 3b(6)...
Where the number in parentheses is the marks possible for that question.
Total: XX marks
[END SUMMARY]

This summary ensures you account for ALL questions. After the summary, grade each one.

**STEP 2 - GRADE EACH QUESTION:**
For EACH question in the mark scheme, use this EXACT format on its own line:
**Question [number]**, Mark: X/Y - [specific feedback explaining WHY marks were lost and HOW to improve]

FEEDBACK REQUIREMENTS (VERY IMPORTANT):
- For PARTIAL marks: Explain SPECIFICALLY what the student got right AND what was missing/wrong
- Reference the mark scheme criteria when explaining lost marks
- Tell students WHAT they needed to include to earn full marks
- NEVER use vague phrases like "Partial credit" or "lacks depth" without specifics
- BAD: "Partial points awarded" or "Answer mentions X but lacks depth"
- GOOD: "Correctly identified photosynthesis but missed that it requires chlorophyll. Needed to mention light-dependent reactions for full marks."
- GOOD: "Got 2/3 marks for correct formula and method. Lost 1 mark for arithmetic error in final step (wrote 24 instead of 42)."

QUESTION NAMING RULES (VERY IMPORTANT):
- Use EXACTLY the question number/label as it appears in the mark scheme
- If mark scheme says "1a" just use "1a", NOT "Question 1a" or "Section A Q1a"
- If mark scheme says "1(a)(i)" use "1(a)(i)"
- DO NOT duplicate questions - each question should appear ONLY ONCE
- DO NOT add Section prefixes unless the mark scheme specifically uses them
- IMPORTANT: If different sections have the same question numbers (e.g., Section A has "2a" AND Section C has "2a"), you MUST prefix with the section to distinguish them (e.g., "Section A 2a" and "Section C 2a")

Examples of correct format:
**Question 1**, Mark: 5/6 - Good understanding but missed one key point.
**Question 1a**, Mark: 2/2 - Correct calculation.
**Question 1b**, Mark: 3/5 - Partial credit for method.
**Question 2(a)(i)**, Mark: 1/2 - Partial credit.
**Question Section C 2a**, Mark: 6/8 - (use this format when sections have duplicate numbers)

ILLEGIBLE HANDWRITING:
- If you cannot read or understand a student's handwriting for a question, award 0 marks
- Use explanation: "Answer could not be read/understood due to illegible handwriting"
- Do NOT skip questions - always include them with 0 marks if illegible

CRITICAL REQUIREMENTS:
- **START WITH MARK SCHEME SUMMARY**: Always begin with [MARK SCHEME SUMMARY] listing all questions and their marks, then start grading with Question 1 (or 1a if subdivided). Never skip the summary or the first question.
- Grade EVERY question from the mark scheme exactly ONCE - ALL SECTIONS (A, B, C, etc.)
- NEVER stop early - you MUST grade through ALL sections including essay questions
- Each question appears only ONCE in your response - no duplicates
- Output questions in SEQUENTIAL ORDER: 1, 1a, 1b, 2, 2a, 2b, 3... etc. (same order as mark scheme)
- If the student didn't attempt a question, award 0 marks with explanation "Question not attempted"
- Use the exact marks available from the mark scheme for the denominator (Y)
- The total of all Y values should equal the EXACT total marks possible from the mark scheme
- **GRADE ALL SUB-PARTS IN EVERY SECTION**: If ANY section (A, B, C, D, Part 1, Part 2, etc.) has questions with sub-parts like 2a, 2b, 2c (or Option 1a, 1b, Option 2a, 2b), you MUST grade EVERY sub-part separately. Do NOT stop after grading just 2a - continue to 2b, 2c, 2d, etc. Each sub-part should have its own entry.
- **ESSAY/EXTENDED RESPONSE QUESTIONS ARE MANDATORY**: If the mark scheme includes extended response or essay sections (regardless of what section letter/number they are: Section C, Section D, Part 3, etc.), you MUST grade them. Do NOT skip these questions even if the student's response is poor or blank - award 0 marks with explanation.
- **OPTION/CHOICE QUESTIONS**: If a section offers multiple OPTIONS to choose from (e.g., "Option 1" OR "Option 2", "Answer ONE of the following"), students only answer ONE option, not all of them. Look at the student's exam to see which option they actually answered, and ONLY grade that option. Do NOT grade options the student did not attempt - exclude them entirely from your grading and from the mark scheme summary. For example, if Section C offers Option 1 (20 marks) and Option 2 (20 marks), and the student answered Option 1, only include Option 1 in your grading - the total possible marks for that section is 20, not 40.
- **COMPLETE YOUR FULL RESPONSE**: Provide detailed feedback for ALL questions including essays and extended responses. Do not abbreviate or cut short your explanations.
- **VERIFY YOUR TOTAL**: Before finishing, verify that your Total marks match the EXACT total from the mark scheme. Your Y values MUST sum to the mark scheme's total (e.g., if it says "Total: 50 marks" or "[X]/50", your Y values must sum to exactly 50).

At the end, provide:
**Total: X/Y** (where Y is the EXACT total marks possible from the mark scheme)
**Percentage: Z%**
**Grade: [Letter]** (use American scale: A=90%+, B=80-89%, C=70-79%, D=60-69%, F=below 60%)

Brief feedback on strengths and areas for improvement.

**IMPORTANT**: Start your response immediately with "[MARK SCHEME SUMMARY]" then list all questions, then begin grading with "**Question 1**" (or "**Question 1a**" if subdivided). Do not include any preamble before the mark scheme summary.

${hasTeacherInstructions ? 'Follow the teacher\'s instructions above when determining marks.' : 'Grade fairly and consistently according to the mark scheme.'}`

    content.push({
      type: 'text',
      text: instructionText
    })

    // Add mark scheme files (may be multiple images from PDF conversion)
    for (let i = 0; i < allMarkSchemeFiles.length; i++) {
      const file = allMarkSchemeFiles[i]

      if (isImageFile(file.type, file.name)) {
        const mimeType = getImageMimeType(file.type, file.name)
        console.log(`📸 [Stream] Adding mark scheme image ${i + 1}: ${file.name} as ${mimeType}`)
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType,
            data: file.buffer.toString('base64')
          }
        })
      } else {
        // Add as document (PDF)
        console.log(`📄 [Stream] Adding mark scheme document ${i + 1}: ${file.name}`)
        content.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: file.buffer.toString('base64')
          }
        })
      }
    }

    // Add all student exam files (documents or images)
    for (let i = 0; i < allStudentFiles.length; i++) {
      const file = allStudentFiles[i]

      if (isImageFile(file.type, file.name)) {
        const mimeType = getImageMimeType(file.type, file.name)
        console.log(`📸 [Stream] Adding student exam image ${i + 1}: ${file.name} as ${mimeType}`)
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType,
            data: file.buffer.toString('base64')
          }
        })
      } else {
        console.log(`📄 [Stream] Adding document ${i + 1}: ${file.name}`)
        content.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: file.buffer.toString('base64')
          }
        })
      }
    }

    console.log('📤 Starting streaming grading with', content.length, 'content items')

    const stream = await this.anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: content
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

    console.log('✅ Streaming grading complete - Token Usage:', actualUsage)
    console.log('📋 Stop reason:', finalMessage.stop_reason)

    return {
      content: fullContent,
      usage: actualUsage
    }
  }

  /**
   * Grade missing questions that were skipped in the initial grading
   * Used for follow-up calls when questions are detected as missing
   */
  async gradeMissingQuestions(params: {
    markSchemeFiles: Array<{ buffer: Buffer; name: string; type: string }>
    studentExamFiles: Array<{ buffer: Buffer; name: string; type: string }>
    missingQuestions: string[]  // Format: ["3b(6)", "6a(3)"]
    additionalComments?: string
  }): Promise<{ content: string; usage: any }> {
    const { markSchemeFiles, studentExamFiles, missingQuestions, additionalComments } = params

    // Helper to check if file is an image
    const isImageFile = (type: string, name: string) => {
      const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
      const extension = name.split('.').pop()?.toLowerCase()
      const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']
      return imageTypes.includes(type) || (extension && imageExtensions.includes(extension))
    }

    // Helper to get correct MIME type for images
    const getImageMimeType = (type: string, name: string): string => {
      const extension = name.split('.').pop()?.toLowerCase()
      const mimeMap: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'heic': 'image/jpeg',
        'heif': 'image/jpeg'
      }
      if (extension && mimeMap[extension]) {
        return mimeMap[extension]
      }
      if (type.startsWith('image/')) {
        return type === 'image/heic' || type === 'image/heif' ? 'image/jpeg' : type
      }
      return 'image/jpeg'
    }

    const content: any[] = []

    // Build focused prompt for missing questions
    const hasTeacherInstructions = additionalComments && additionalComments.trim()

    let instructionText = `You are an expert exam grader. You previously graded this exam but MISSED the following questions.

MISSING QUESTIONS TO GRADE:
${missingQuestions.join(', ')}

Please grade ONLY these questions now. Do not re-grade questions you already graded.

For each missing question, use this EXACT format:
**Question [number]**, Mark: X/Y - [specific feedback explaining WHY marks were lost and HOW to improve]

Where Y is the marks possible shown in parentheses above.

CRITICAL RULES:
- Grade ONLY the missing questions listed above
- Use the exact question numbers from the list
- If the student didn't attempt a question, award 0 marks with explanation "Question not attempted"
- If handwriting is illegible, award 0 marks with explanation "Answer could not be read due to illegible handwriting"
- Provide specific feedback on what was correct and what was missing`

    if (hasTeacherInstructions) {
      instructionText += `\n\n**Teacher's Instructions (apply these when grading):**\n${additionalComments}`
    }

    content.push({
      type: 'text',
      text: instructionText
    })

    // Add mark scheme files
    for (const file of markSchemeFiles) {
      if (isImageFile(file.type, file.name)) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: getImageMimeType(file.type, file.name),
            data: file.buffer.toString('base64')
          }
        })
      } else {
        content.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: file.buffer.toString('base64')
          }
        })
      }
    }

    // Add student exam files
    for (const file of studentExamFiles) {
      if (isImageFile(file.type, file.name)) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: getImageMimeType(file.type, file.name),
            data: file.buffer.toString('base64')
          }
        })
      } else {
        content.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: file.buffer.toString('base64')
          }
        })
      }
    }

    console.log(`📤 Grading ${missingQuestions.length} missing questions...`)

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0.1,
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

    console.log(`✅ Missing questions graded - Output tokens: ${response.usage.output_tokens}`)

    return {
      content: responseContent.text,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      }
    }
  }

  /**
   * Grade exam for students - tutoring/learning focused
   * Uses encouraging tone and higher temperature for conversational feedback
   */
  async gradeExamForStudent(params: {
    studentExamText: string
    markSchemeText?: string
    studentExamFile?: { buffer: Buffer; name: string; type: string }
    studentExamFiles?: Array<{ buffer: Buffer; name: string; type: string }> // Multiple files support
    markSchemeFile?: { buffer: Buffer; name: string; type: string }
  }): Promise<ClaudeApiResponse> {
    const { studentExamText, markSchemeText, studentExamFile, studentExamFiles, markSchemeFile } = params

    // Helper to check if file is an image
    const isImageFile = (type: string, name: string) => {
      const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
      const extension = name.split('.').pop()?.toLowerCase()
      const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']
      return imageTypes.includes(type) || (extension && imageExtensions.includes(extension))
    }

    // Helper to get correct MIME type for images
    const getImageMimeType = (type: string, name: string): string => {
      const extension = name.split('.').pop()?.toLowerCase()
      const mimeMap: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'heic': 'image/jpeg',
        'heif': 'image/jpeg'
      }
      if (extension && mimeMap[extension]) {
        return mimeMap[extension]
      }
      if (type.startsWith('image/')) {
        return type === 'image/heic' || type === 'image/heif' ? 'image/jpeg' : type
      }
      return 'image/jpeg'
    }

    // Combine all student exam files
    const allStudentFiles = studentExamFiles && studentExamFiles.length > 0
      ? studentExamFiles
      : studentExamFile
        ? [studentExamFile]
        : []

    const hasMultipleFiles = allStudentFiles.length > 1

    console.log('📚 Starting student tutoring feedback...')
    console.log('Student exam files:', allStudentFiles.length, 'files')

    // Build content array with PDFs as documents (same approach as teacher grading)
    const content: any[] = []

    // Add tutoring-focused instruction
    let instructionText = `You are a helpful tutor reviewing a student's practice work. Your goal is to help them learn and improve.

TUTORING PRINCIPLES:
1. **Be Encouraging**: Start with what they did well - highlight their strengths
2. **Be Educational**: Explain why answers are right or wrong, teach the underlying concepts
3. **Be Constructive**: Suggest specific ways to improve their thinking and approach
4. **Be Patient**: Assume they're trying their best and want to learn
5. **Focus on Learning**: Emphasize understanding over just getting the right score`

    if (hasMultipleFiles) {
      instructionText += `\n\n**NOTE**: This practice work consists of ${allStudentFiles.length} pages/images. Please analyze ALL pages in order.`
    }

    instructionText += `\n\nI've attached the student's practice work${markSchemeFile ? ' and an answer key' : ''}.

Please format your response as follows:
- For each question, provide: Question [number], Mark: X/Y - [encouraging feedback that explains the concept and how to approach this type of problem]
- Focus on explaining WHY answers are correct or incorrect, not just stating they are
- Give hints and tips for similar problems in the future
- At the end, provide total marks, genuine encouragement, and specific learning tips

Remember: This is a learning opportunity. Be supportive and help them understand the material better!`

    content.push({
      type: 'text',
      text: instructionText
    })

    // Add answer key if provided
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

    // Add all student exam files (documents or images)
    for (let i = 0; i < allStudentFiles.length; i++) {
      const file = allStudentFiles[i]

      if (isImageFile(file.type, file.name)) {
        const mimeType = getImageMimeType(file.type, file.name)
        console.log(`📸 Adding image ${i + 1}: ${file.name} as ${mimeType}`)
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType,
            data: file.buffer.toString('base64')
          }
        })
      } else {
        console.log(`📄 Adding document ${i + 1}: ${file.name}`)
        content.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: file.buffer.toString('base64')
          }
        })
      }
    }

    console.log('📤 Sending to Claude API with tutoring mode')

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      temperature: 0.5, // Higher temperature for more conversational, varied responses
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

  /**
   * Generate custom guide content using AI
   * Takes a description and generates structured blocks
   * Supports PDF documents for Claude's native PDF reading when text extraction fails
   */
  async *generateCustomGuideStream(params: {
    description: string
    subject?: string
    gradeLevel?: string
    existingContent?: string
    sourceContent?: string
    mode?: 'replace' | 'add'
    pdfDocuments?: Array<{ buffer: Buffer; filename: string }> // PDFs to send directly to Claude
  }): AsyncGenerator<string, { content: string; usage: any }, undefined> {
    const { description, subject, gradeLevel, existingContent, sourceContent, mode = 'replace', pdfDocuments } = params

    const modeInstructions = mode === 'add'
      ? `🚨 IMPORTANT: You are MODIFYING an existing study guide. 🚨

READ THE USER'S REQUEST AND THE EXISTING CONTENT CAREFULLY.

DETERMINE WHAT ACTION THE USER WANTS:

**IF ADDING CONTENT** (user says "add", "include", "create more", etc.):
1. Find the relevant existing section in the EXISTING GUIDE CONTENT below
2. Create a NEW version with ALL original content PLUS your additions
3. The section you output will REPLACE the original
4. Example: Existing quiz has 3 questions, user wants 2 more → Output quiz with ALL 5 questions

**IF REMOVING/FIXING** (user says "remove", "delete", "fix duplicates", "deduplicate", etc.):
1. Find the section(s) with duplicates or issues
2. Output a CLEANED version with duplicates removed
3. Keep only ONE instance of each unique item
4. Do NOT add new content - only remove the problematic content
5. Example: Checklist has "Review notes" twice → Output checklist with "Review notes" only ONCE

**IF MODIFYING** (user says "change", "update", "make shorter", "reword", etc.):
1. Find the section to modify
2. Apply the requested changes
3. Output the modified version

CRITICAL RULES:
- When fixing duplicates: IDENTIFY duplicates by comparing labels/content, keep only ONE of each
- When adding: Include ALL original items plus new ones
- Output the COMPLETE modified section, not just the changes`
      : `You are creating a new study guide from scratch.`

    // Build source instructions based on whether we have text content, PDF documents, or both
    let sourceInstructions = ''

    if (pdfDocuments && pdfDocuments.length > 0) {
      // PDF documents are attached - Claude will read them directly
      const pdfNames = pdfDocuments.map(d => d.filename).join(', ')
      sourceInstructions = `
🚨🚨🚨 MANDATORY - READ THE ATTACHED PDF DOCUMENT(S) 🚨🚨🚨

The teacher uploaded PDF document(s) that you MUST read and use: ${pdfNames}

REQUIREMENTS:
1. CAREFULLY READ the attached PDF document(s) - they contain the source material
2. ONLY use information from the PDF(s) - do NOT invent or make up content
3. Use the EXACT terms, definitions, and concepts from the document(s)
4. The TOPIC of your guide MUST match what the PDF(s) cover
5. If the PDF is about marine organisms, create content about marine organisms
6. If the PDF is about chemistry, create content about chemistry
7. NEVER substitute different subject matter than what's in the PDF(s)
8. Quote or paraphrase directly from the PDF content

The user's request tells you HOW to format (sections, quizzes, etc.)
The ATTACHED PDF(s) tell you WHAT content to include.

${sourceContent ? `
=== ADDITIONAL TEXT CONTENT ===
${sourceContent.slice(0, 30000)}
=== END ADDITIONAL TEXT CONTENT ===
` : ''}

IMPORTANT: Generate content based on the attached PDF document(s). Do NOT use your general knowledge about other topics.
`
    } else if (sourceContent) {
      // Text content only (normal extraction worked)
      sourceInstructions = `
🚨🚨🚨 MANDATORY - READ AND USE THIS SOURCE MATERIAL 🚨🚨🚨

The teacher uploaded SOURCE MATERIAL that you MUST use. Failure to use it is a critical error.

REQUIREMENTS:
1. READ the source material below BEFORE generating anything
2. ONLY use information from the source - do NOT invent or make up content
3. Use the EXACT terms, definitions, and concepts from the source
4. The TOPIC of your guide MUST match what the source covers
5. If the source is about marine organisms, create content about marine organisms
6. If the source is about chemistry, create content about chemistry
7. NEVER substitute different subject matter than what's in the source
8. Quote or paraphrase directly from the source

The user's request tells you HOW to format (sections, quizzes, etc.)
The SOURCE MATERIAL tells you WHAT content to include.

=== BEGIN SOURCE MATERIAL (YOU MUST USE THIS!) ===
${sourceContent.slice(0, 50000)}
=== END SOURCE MATERIAL ===

IMPORTANT: Generate content based on the source material above. Do NOT use your general knowledge about other topics.
`
    }

    const prompt = `You are an expert educational content creator. Generate a structured study guide.

${sourceInstructions}

${modeInstructions}

USER REQUEST: ${description}
${subject ? `SUBJECT: ${subject}` : ''}
${gradeLevel ? `GRADE LEVEL: ${gradeLevel}` : ''}

🎯 FOLLOW THE USER'S INSTRUCTIONS EXACTLY:
- If they say "concise", "brief", or "short" → Use SHORT explanations (1-2 sentences max per concept)
- If they say "detailed" or "comprehensive" → Provide thorough coverage
- If they specify a number (e.g., "5 questions", "3 definitions") → Create EXACTLY that many
- If they ask to "remove" or "delete" something → Do NOT include that content
- If they ask for specific topics → Only cover those topics, nothing extra
${existingContent && mode === 'add' ? `
📋 EXISTING GUIDE CONTENT - READ THIS CAREFULLY 📋
You MUST reference this when adding to existing sections. If the user asks to add questions to a quiz, FIND THE QUIZ BELOW and include ALL its existing questions plus your new ones.

${existingContent}

⬆️ END OF EXISTING CONTENT ⬆️
` : existingContent ? `\nEXISTING GUIDE CONTENT (for context):\n${existingContent}` : ''}

Generate a JSON object representing a custom study guide. The structure MUST follow this exact format:

{
  "version": "1.0",
  "sections": [
    // Array of section objects
  ]
}

SECTION TYPES YOU CAN USE:

1. TEXT SECTION:
{
  "id": "unique-id",
  "type": "text",
  "title": "Section Title",
  "content": {
    "type": "text",
    "markdown": "**Bold text**, *italic*, lists, etc."
  }
}

2. COLLAPSIBLE SECTION (with nested children):
{
  "id": "unique-id",
  "type": "section",
  "title": "Main Topic",
  "collapsed": false,
  "content": { "type": "text", "markdown": "" },
  "children": [
    // Array of other sections (text, alert, quiz, etc.)
  ]
}

3. ALERT/CALLOUT:
{
  "id": "unique-id",
  "type": "alert",
  "content": {
    "type": "alert",
    "variant": "info" | "warning" | "success" | "exam-tip",
    "title": "Optional Title",
    "message": "The alert message content"
  }
}

4. DEFINITION:
{
  "id": "unique-id",
  "type": "definition",
  "content": {
    "type": "definition",
    "term": "Key Term",
    "definition": "The definition of the term",
    "examples": ["Example 1", "Example 2"]
  }
}

5. TABLE:
{
  "id": "unique-id",
  "type": "table",
  "title": "Comparison Table",
  "content": {
    "type": "table",
    "headers": ["Header 1", "Header 2", "Header 3"],
    "rows": [
      ["Row 1 Col 1", "Row 1 Col 2", "Row 1 Col 3"],
      ["Row 2 Col 1", "Row 2 Col 2", "Row 2 Col 3"]
    ],
    "headerStyle": "blue" | "green" | "purple" | "default"
  }
}

6. QUIZ:
{
  "id": "unique-id",
  "type": "quiz",
  "title": "Practice Questions",
  "content": {
    "type": "quiz",
    "questions": [
      {
        "id": "q1",
        "questionType": "multiple-choice",
        "question": "What is...?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": "Option B",
        "explanation": "Because..."
      },
      {
        "id": "q2",
        "questionType": "true-false",
        "question": "Statement to evaluate",
        "options": ["True", "False"],
        "correctAnswer": "True",
        "explanation": "This is true because..."
      },
      {
        "id": "q3",
        "questionType": "short-answer",
        "question": "Explain...",
        "correctAnswer": "Expected answer keywords",
        "explanation": "A complete answer includes..."
      }
    ]
  }
}

7. CHECKLIST:
{
  "id": "unique-id",
  "type": "checklist",
  "title": "Study Checklist",
  "content": {
    "type": "checklist",
    "items": [
      { "id": "item1", "label": "Review chapter notes" },
      { "id": "item2", "label": "Complete practice problems" }
    ]
  }
}

GUIDELINES:
1. Generate unique IDs for all sections (use format like "sec-1", "def-2", "quiz-3")
2. Create a logical structure with clear hierarchy
3. Use collapsible sections to organize related content
4. Include a variety of block types based on what's appropriate for the content
5. Add exam tips and alerts where helpful
6. Create quizzes to test understanding
7. Use tables for comparisons or data
8. Include definitions for key terms
9. Add checklists for actionable items

🚫 CRITICAL - NEVER DUPLICATE CONTENT:
10. **NEVER repeat content** - Each concept, checklist item, definition, or quiz question should appear EXACTLY ONCE
11. **Check before adding** - Before creating any item, mentally verify it doesn't duplicate existing content
12. **Consolidate repetition** - If source material repeats information, consolidate it into ONE location
13. **Unique checklist items** - Every checklist item must have a distinct, unique label - never repeat the same task
14. **Unique quiz questions** - Every quiz question must test a different concept
15. **Unique definitions** - Define each term only once, even if mentioned multiple times in source

IMPORTANT: Return ONLY the JSON object, no explanation before or after. The JSON must be valid and parseable.`

    console.log('📊 Starting custom guide generation...')
    console.log('📄 PDF documents for vision:', pdfDocuments?.length || 0)

    // Build content array - include PDF documents if provided (for complex PDFs that couldn't be text-extracted)
    let messageContent: any

    if (pdfDocuments && pdfDocuments.length > 0) {
      // Use multi-part content with PDF documents
      const contentParts: any[] = []

      // Add PDF documents first so Claude can read them
      for (const doc of pdfDocuments) {
        console.log(`📄 Adding PDF document to Claude request: ${doc.filename} (${doc.buffer.length} bytes)`)
        contentParts.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: doc.buffer.toString('base64')
          }
        })
      }

      // Add the text prompt after the documents
      contentParts.push({
        type: 'text',
        text: prompt
      })

      messageContent = contentParts
    } else {
      // Simple text-only prompt
      messageContent = prompt
    }

    const stream = await this.anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: messageContent
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

    console.log('✅ Custom guide generation complete - Token Usage:', actualUsage)

    return {
      content: fullContent,
      usage: actualUsage
    }
  }
}
