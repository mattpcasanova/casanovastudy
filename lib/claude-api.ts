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
- Multiple Choice Questions: Start each with "MC_QUESTION:" followed by the question text, then list options as "A) option", "B) option", etc.
- True/False Questions: Start each with "TF_QUESTION:" followed by the question text
- Short Answer Questions: Start each with "SA_QUESTION:" followed by the question text

EXAMPLE FORMAT:
MC_QUESTION: Which factor most directly affects solubility?
A) The color of the solution
B) The temperature of the water
C) The volume of the container
D) The time of day

TF_QUESTION: Stirring increases the rate of dissolving but not the total amount that can dissolve.

SA_QUESTION: Explain what happens when salt dissolves in water.

Include: 1) Multiple choice questions (5-7 questions), 2) True/False questions (3-5 questions), 3) Short answer questions (2-3 questions). Include an answer key with explanations. Only test knowledge that is explicitly mentioned in the source materials.`,
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
}
