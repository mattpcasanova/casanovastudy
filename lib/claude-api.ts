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
2. EXTRACT LEARNING OBJECTIVES: Find and organize content around learning objectives from the source material
3. NO EXTERNAL KNOWLEDGE: Do not add new concepts, formulas, or examples not found in the provided PDFs
4. ALLOW CLARIFICATIONS: You may add analogies, explanations, and expansions to help explain the provided content
5. CREATE CLEAR HIERARCHY: Essential → Important → Supporting information (based on what's in the source)

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

1. LEARNING OBJECTIVES SECTION (Start Here)
   - Extract specific learning objectives from source material
   - If "Learning Intentions" or similar sections exist, prioritize these
   - Organize content around these objectives

2. CONTENT PRIORITIZATION SYSTEM (Based on Source Material)
   - 🔴 ESSENTIAL: Key concepts, formulas, and definitions explicitly mentioned in the source materials
   - 🟡 IMPORTANT: Examples, applications, and relationships described in the provided PDFs
   - 🟢 SUPPORTING: Additional context and details found in the source materials

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
      'outline': 'Create a detailed hierarchical outline using ONLY content from the source materials. Use clear numbering and indentation. Start with Learning Objectives from the source, then organize by priority. Only include concepts explicitly mentioned in the provided PDFs.',
      'flashcards': 'Create question-answer pairs using ONLY concepts from the source materials. Format as "Q: [question] A: [answer]". Only create questions about topics explicitly mentioned in the provided PDFs.',
      'quiz': 'Create a quiz using ONLY content from the source materials. Include multiple choice questions based on concepts found in the provided PDFs. Include an answer key. Only test knowledge that is explicitly mentioned in the source materials.',
      'summary': 'Create a summary using ONLY content from the source materials. Capture key concepts and main ideas that are explicitly mentioned in the provided PDFs. Do not add external knowledge or concepts not found in the source.',
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
