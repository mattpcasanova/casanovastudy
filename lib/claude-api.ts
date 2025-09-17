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
        temperature: 0.3, // Lower temperature for more consistent, focused output
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

      // Validate content quality
      const validationResults = this.validateContentQuality(content.text, request.format)
      if (!validationResults.isValid) {
        console.warn('⚠️  Content validation warnings:', validationResults.warnings)
      }

      return {
        content: content.text,
        usage: actualUsage,
        validation: validationResults
      }
    } catch (error) {
      console.error('Claude API error:', error)
      throw new Error(`Failed to generate study guide: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private buildPrompt(request: ClaudeApiRequest): string {
    const { content, subject, gradeLevel, format, topicFocus, difficultyLevel, additionalInstructions } = request

    const formatInstructions = this.getFormatInstructions(format as any)
    const difficultyInstructions = this.getDifficultyInstructions(difficultyLevel)

      return `You are an expert educational content creator specializing in creating exam-focused study guides for ${gradeLevel} students.

TASK: Create a comprehensive study guide using STRICTLY AND EXCLUSIVELY the content provided in the source materials. You must work within the boundaries of the provided content only.

ABSOLUTE CONTENT RESTRICTIONS:
1. STRICT SOURCE-ONLY RULE: You may ONLY use concepts, terms, facts, and information explicitly mentioned in the provided source materials
2. NO EXTERNAL ADDITIONS: Do not add any concepts, formulas, or information from your general knowledge, even if related to the topic
3. NO TOPIC EXPANSION: Do not introduce broader subject areas or related topics not specifically covered in the source
4. CONTENT VERIFICATION: Before including any information, verify it appears in the provided source materials
5. ANALOGIES AND EXAMPLES ENCOURAGED: You may freely use analogies, examples, and explanations to help clarify and illustrate the provided content, as long as they serve to explain concepts that are already in the source materials

CONSISTENCY REQUIREMENTS:
6. COMPREHENSIVE COVERAGE: Generate substantial content covering all major points from the source materials
7. BALANCED DISTRIBUTION: Ensure adequate content in each priority section (🔴 ESSENTIAL, 🟡 IMPORTANT, 🟢 SUPPORTING)
8. FORMAT COMPLIANCE: Generate the expected amount of content for the chosen format (flashcards: 10-15 cards, quiz: 8-12 questions)
9. COMPLETE UTILIZATION: Use all relevant information from the source materials, don't leave major concepts uncovered

MANDATORY STRUCTURE:
10. ALWAYS INCLUDE LEARNING OBJECTIVES: Create learning objectives based strictly on what the source materials cover
11. PRIORITY ORGANIZATION: Organize ALL content into 🔴 ESSENTIAL, 🟡 IMPORTANT, and 🟢 SUPPORTING sections
12. SOURCE-BASED HIERARCHY: Determine priority levels based on emphasis and coverage in the source materials

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

FINAL VERIFICATION CHECKLIST:
Before finalizing your response, verify:
✓ Every core concept, term, and fact comes directly from the provided source materials
✓ No external knowledge, related topics, or broader subject areas have been added
✓ All priority sections (🔴 🟡 🟢) contain substantial, balanced content (minimum 3-4 items each)
✓ The format requirements are met (flashcards: 12-15, quiz: 10-12 questions, etc.)
✓ Learning objectives reflect only what the source materials cover (3-5 objectives)
✓ Analogies and examples serve to clarify provided content, not introduce new concepts
✓ All core information can be traced back to specific content in the provided materials
✓ Content is appropriate for the specified grade level and difficulty
✓ Questions progress logically from basic recall to application/analysis
✓ Key terms are properly defined using only source material definitions

CONTENT BOUNDARY ENFORCEMENT:
If the source materials are limited, work within those boundaries rather than expanding the topic. If a concept is not explicitly mentioned in the source materials, do not include it in the study guide, even if it seems related or important to the broader subject. However, feel free to use creative analogies, examples, and explanations to make the provided content more understandable and memorable for students.

Make sure the study guide is comprehensive within the source boundaries and ready for students to use immediately for studying and review.`
  }

  private getFormatInstructions(format: StudyGuideFormat): string {
    const instructions = {
      'outline': 'Create a detailed hierarchical outline using STRICTLY ONLY content from the source materials. Generate comprehensive coverage of all major concepts from the source. Always start with Learning Objectives based on source content, then organize into 🔴 ESSENTIAL (core concepts from source), 🟡 IMPORTANT (applications/examples from source), and 🟢 SUPPORTING (additional details from source). Use clear numbering and indentation. Include ALL relevant concepts mentioned in the provided materials.',
      'flashcards': 'Create 12-15 question-answer pairs using STRICTLY ONLY concepts from the source materials. Cover ALL major concepts, terms, and relationships mentioned in the source. Organize into 🔴 ESSENTIAL (5-6 cards on core concepts), 🟡 IMPORTANT (4-5 cards on applications), and 🟢 SUPPORTING (3-4 cards on details). Format as "Q: [question] A: [answer]". Ensure every flashcard tests knowledge explicitly mentioned in the provided materials. Do not create fewer than 10 flashcards unless the source material is extremely limited.',
      'quiz': `Create a comprehensive quiz with 10-12 total questions using STRICTLY ONLY content from the source materials. Cover ALL major concepts from the source. Organize into 🔴 ESSENTIAL, 🟡 IMPORTANT, and 🟢 SUPPORTING sections.

MANDATORY QUESTION DISTRIBUTION AND PROGRESSION:
- Multiple Choice: 5-6 questions covering core concepts from source materials
  * 2-3 basic recall questions (definitions, facts)
  * 2-3 application/analysis questions (relationships, problem-solving)
- True/False: 3-4 questions on key facts/relationships from source materials
  * Focus on common misconceptions and important distinctions mentioned in source
- Short Answer: 2-3 questions on applications/explanations from source materials  
  * 1 explanation question (how/why processes work)
  * 1-2 application questions (applying concepts to scenarios from source)

CRITICAL FORMATTING REQUIREMENTS FOR QUIZ QUESTIONS:
- Multiple Choice Questions: Start each with "MC_QUESTION:" (NO markdown formatting, just plain text) followed by the question text, then list options as "A) option", "B) option", etc.
- True/False Questions: Start each with "TF_QUESTION:" (NO markdown formatting, just plain text) followed by the question text
- Short Answer Questions: Start each with "SA_QUESTION:" (NO markdown formatting, just plain text) followed by the question text

EXAMPLE FORMAT (EXACTLY AS SHOWN):
MC_QUESTION: Which factor most directly affects solubility?
A) The color of the solution
B) The temperature of the water
C) The volume of the container
D) The time of day

TF_QUESTION: Stirring increases the rate of dissolving but not the total amount that can dissolve.

SA_QUESTION: Explain what happens when salt dissolves in water.

IMPORTANT: Do NOT use **bold** formatting around the prefixes. Use exactly MC_QUESTION:, TF_QUESTION:, SA_QUESTION: as plain text.

Include a complete answer key with explanations. Test ONLY knowledge explicitly mentioned in the source materials - do not create questions about concepts not covered in the provided content.`,
      'summary': 'Create a comprehensive summary using STRICTLY ONLY content from the source materials. Generate substantial content covering ALL major concepts, relationships, and details from the source. Always organize into 🔴 ESSENTIAL (core concepts from source), 🟡 IMPORTANT (applications/examples from source), and 🟢 SUPPORTING (additional details from source). Capture ALL key concepts and main ideas explicitly mentioned in the provided materials. Include detailed explanations of relationships and processes covered in the source. Do not add external knowledge or concepts not found in the source.',
    }
    return instructions[format] || instructions.summary
  }

  private getDifficultyInstructions(difficultyLevel?: string): string {
    if (!difficultyLevel) return ''

    const instructions = {
      'beginner': `
BEGINNER LEVEL ADAPTATIONS:
- Use simple, clear language avoiding technical jargon
- Break complex concepts into smaller, digestible steps
- Provide more analogies and real-world examples from the source material
- Focus on basic understanding before moving to applications
- Create more foundational questions and fewer complex analysis questions
- Use shorter sentences and simpler vocabulary
- Include more step-by-step explanations of processes mentioned in the source`,

      'intermediate': `
INTERMEDIATE LEVEL ADAPTATIONS:
- Use moderate complexity with clear explanations of technical terms from the source
- Balance foundational concepts with practical applications mentioned in the material
- Include both recall and application-level questions
- Connect concepts within the source material to show relationships
- Use appropriate academic vocabulary when it appears in the source
- Provide examples that bridge basic understanding to more complex applications
- Include analysis questions that require synthesis of multiple concepts from the source`,

      'advanced': `
ADVANCED LEVEL ADAPTATIONS:
- Use sophisticated academic language and complex concept integration
- Focus on critical thinking, analysis, and synthesis of source material concepts
- Create questions that require deep understanding and application of multiple principles
- Emphasize connections between different concepts within the source material
- Include evaluation and creation-level questions based on source content
- Use advanced vocabulary and technical terminology as it appears in the source
- Challenge students to apply source concepts to hypothetical scenarios and complex problem-solving`
    }
    return instructions[difficultyLevel as keyof typeof instructions] || ''
  }

  private validateContentQuality(content: string, format: string): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = []
    
    // Check minimum content length
    if (content.length < 500) {
      warnings.push('Content is shorter than expected (less than 500 characters)')
    }

    // Format-specific validations
    switch (format) {
      case 'flashcards':
        const flashcardCount = (content.match(/Q:/g) || []).length
        if (flashcardCount < 10) {
          warnings.push(`Only ${flashcardCount} flashcards generated, expected 12-15`)
        }
        if (flashcardCount > 20) {
          warnings.push(`Too many flashcards generated (${flashcardCount}), expected 12-15`)
        }
        break

      case 'quiz':
        const mcCount = (content.match(/MC_QUESTION:/g) || []).length
        const tfCount = (content.match(/TF_QUESTION:/g) || []).length
        const saCount = (content.match(/SA_QUESTION:/g) || []).length
        const totalQuestions = mcCount + tfCount + saCount
        
        if (totalQuestions < 8) {
          warnings.push(`Only ${totalQuestions} quiz questions generated, expected 10-12`)
        }
        if (mcCount < 4 || mcCount > 7) {
          warnings.push(`${mcCount} multiple choice questions, expected 5-6`)
        }
        if (tfCount < 2 || tfCount > 5) {
          warnings.push(`${tfCount} true/false questions, expected 3-4`)
        }
        if (saCount < 1 || saCount > 4) {
          warnings.push(`${saCount} short answer questions, expected 2-3`)
        }
        break
    }

    // Check for priority sections
    const hasEssential = content.includes('🔴') || content.includes('ESSENTIAL')
    const hasImportant = content.includes('🟡') || content.includes('IMPORTANT')  
    const hasSupporting = content.includes('🟢') || content.includes('SUPPORTING')
    
    if (!hasEssential) warnings.push('Missing Essential (🔴) priority section')
    if (!hasImportant) warnings.push('Missing Important (🟡) priority section')
    if (!hasSupporting) warnings.push('Missing Supporting (🟢) priority section')

    // Check for learning objectives
    const hasObjectives = content.toLowerCase().includes('learning objective') || 
                         content.toLowerCase().includes('objectives') ||
                         content.toLowerCase().includes('by the end')
    if (!hasObjectives) {
      warnings.push('Missing learning objectives section')
    }

    return {
      isValid: warnings.length === 0,
      warnings
    }
  }
}
