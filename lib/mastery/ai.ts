import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { QuestionType } from '@/lib/types/question-bank'

// AI question generation for the mastery loop. Strict zod validation with one
// retry on malformed output — bad AI JSON must never reach the bank.

const generatedQuestionSchema = z
  .object({
    type: z.enum(['multiple_choice', 'true_false', 'short_answer']),
    question_text: z.string().min(10),
    options: z.array(z.string().min(1)).min(2).max(6).nullish(),
    correct_answer: z.record(z.string(), z.unknown()),
    explanation: z.string().nullish(),
    difficulty: z.number().int().min(1).max(3).catch(2),
  })
  .superRefine((q, ctx) => {
    if (q.type === 'multiple_choice') {
      const index = q.correct_answer.index
      if (!q.options || typeof index !== 'number' || index < 0 || index >= q.options.length) {
        ctx.addIssue({ code: 'custom', message: 'MC needs options + valid correct index' })
      }
    } else if (q.type === 'true_false') {
      if (typeof q.correct_answer.value !== 'boolean') {
        ctx.addIssue({ code: 'custom', message: 'TF needs boolean value' })
      }
    } else if (typeof q.correct_answer.sample_answer !== 'string' || !q.correct_answer.sample_answer) {
      ctx.addIssue({ code: 'custom', message: 'SA needs sample_answer' })
    }
  })

const generationResponseSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1),
})

export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>

export interface StyleExample {
  type: QuestionType
  question_text: string
  options: string[] | null
  correct_answer: Record<string, unknown>
}

export interface GenerateQuestionsParams {
  concept: { name: string; description?: string | null; unit?: string | null }
  subject?: string | null
  count: number
  allowedTypes: QuestionType[]
  /** Approved bank questions used as style/difficulty anchors. */
  styleExamples?: StyleExample[]
  /** Question texts to avoid duplicating (already in the bank). */
  avoidTexts?: string[]
}

const TYPE_SPECS: Record<QuestionType, string> = {
  multiple_choice:
    '"multiple_choice": provide "options" (array of 4 strings, plausible distractors) and "correct_answer": {"index": <0-based index>}',
  true_false:
    '"true_false": no options; "correct_answer": {"value": true|false}',
  short_answer:
    '"short_answer": no options; "correct_answer": {"sample_answer": "<model answer>", "rubric_notes": "<what to accept/reject>"}',
}

function buildPrompt(params: GenerateQuestionsParams): string {
  const { concept, subject, count, allowedTypes, styleExamples, avoidTexts } = params

  const examplesBlock = styleExamples?.length
    ? `\nThe teacher's approved questions for style/difficulty reference (match their tone, rigor, and formatting):\n${styleExamples
        .slice(0, 3)
        .map(e => `- [${e.type}] ${e.question_text}`)
        .join('\n')}\n`
    : ''

  const avoidBlock = avoidTexts?.length
    ? `\nDo NOT duplicate these existing questions:\n${avoidTexts
        .slice(0, 20)
        .map(t => `- ${t}`)
        .join('\n')}\n`
    : ''

  return `You are writing practice questions for a mastery quiz${subject ? ` in ${subject}` : ''}.

Concept: ${concept.name}${concept.unit ? ` (${concept.unit})` : ''}
${concept.description ? `Description: ${concept.description}` : ''}
${examplesBlock}${avoidBlock}
Write exactly ${count} questions testing this concept. Requirements:
- Allowed types: ${allowedTypes.join(', ')}. Mix them when more than one is allowed.
- Each question stands alone and tests genuine understanding, not trivia.
- Include a brief "explanation" a student sees after answering.
- "difficulty": 1 (intro), 2 (standard), or 3 (challenge). Mostly 2.
- Type-specific shapes:
${allowedTypes.map(t => `  - ${TYPE_SPECS[t]}`).join('\n')}

Respond with ONLY a JSON object, no other text:
{"questions": [{"type": "...", "question_text": "...", "options": [...] or null, "correct_answer": {...}, "explanation": "...", "difficulty": 2}, ...]}`
}

/**
 * Pull the outermost JSON object out of a model response — tolerates
 * preamble text, code fences, and trailing commentary.
 */
function extractJsonObject(raw: string): unknown {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('No JSON object in response')
  return JSON.parse(raw.slice(start, end + 1))
}

function parseGeneration(raw: string): GeneratedQuestion[] {
  const parsed = generationResponseSchema.parse(extractJsonObject(raw))
  return parsed.questions
}

// --- Extraction from uploaded material ---

const extractedQuestionSchema = generatedQuestionSchema.and(
  z.object({
    concept_id: z.string().nullish(),
    proposed_new_concept: z.string().min(2).max(120).nullish(),
  })
)

const extractionResponseSchema = z.object({
  questions: z.array(extractedQuestionSchema),
})

export type ExtractedQuestion = z.infer<typeof extractedQuestionSchema>

export type MaterialFile =
  | { kind: 'document'; buffer: Buffer; mediaType: string; name?: string }
  | { kind: 'text'; text: string; name?: string }

export interface ExtractParams {
  files: MaterialFile[]
  concepts: Array<{ id: string; name: string; description?: string | null }>
  subject?: string | null
}

/**
 * Build a question bank from a teacher's course material (slides, notes,
 * worksheets, past tests). Extracts existing questions AND generates new ones
 * covering the material's key ideas; each question is tagged with an existing
 * concept_id or a proposed_new_concept name. This is the "PowerPoint in,
 * mastery quiz out" pipeline — the material doesn't need to contain questions.
 */
export async function extractQuestionsFromMaterial(
  params: ExtractParams
): Promise<ExtractedQuestion[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured')
  const anthropic = new Anthropic({ apiKey })

  const conceptList = params.concepts
    .map(c => `- id: ${c.id} | ${c.name}${c.description ? ` — ${c.description}` : ''}`)
    .join('\n')

  const instruction = `You are turning a teacher's course material${params.subject ? ` for ${params.subject}` : ''} (slides, lecture notes, worksheets, past tests) into a concept-tagged question bank for adaptive mastery quizzes.

The teacher's current concepts:
${conceptList || '(none yet)'}

Work in two steps:

1. Identify the distinct concepts the material teaches. Tag each to the best-matching "concept_id" from the list above; if nothing fits, set "concept_id" to null and "proposed_new_concept" to a short, specific name a student can master in one sitting (e.g. "Limiting reactants", not "Chemistry"). Reuse the same proposed name consistently across its questions.

2. Build the questions:
   - Extract any existing assessment questions from the material (use answer keys to fill in correct answers; skip pure headers/instructions).
   - Then WRITE NEW questions that test the material's key ideas, definitions, procedures, and worked examples — the material does not need to contain questions. Ground every question in what the material actually covers; do not invent outside content.
   - Aim for 4-6 questions per concept, mixed across types.

Question shapes — one of:
- multiple_choice: 4 "options" with plausible distractors, "correct_answer": {"index": <0-based>}
- true_false: "correct_answer": {"value": true|false}
- short_answer: "correct_answer": {"sample_answer": "...", "rubric_notes": "<what to accept/reject>"}
Each question needs a brief "explanation" (shown after answering) and "difficulty" 1-3 (mostly 2).

Respond with ONLY a JSON object:
{"questions": [{"concept_id": "<id or null>", "proposed_new_concept": "<name or null>", "type": "...", "question_text": "...", "options": [...] or null, "correct_answer": {...}, "explanation": "...", "difficulty": 2}, ...]}`

  const content: Anthropic.ContentBlockParam[] = []
  for (const file of params.files) {
    if (file.kind === 'text') {
      content.push({
        type: 'text',
        text: `Content of "${file.name ?? 'uploaded file'}":\n\n${file.text}`,
      })
    } else if (file.mediaType === 'application/pdf') {
      content.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: file.buffer.toString('base64') },
      })
    } else if (file.mediaType.startsWith('image/')) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: file.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: file.buffer.toString('base64'),
        },
      })
    }
  }
  if (content.length === 0) {
    throw new Error('No readable files (PDF, PowerPoint, Word, text, or images)')
  }
  content.push({ type: 'text', text: instruction })

  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    // Stream: extraction outputs can be large and non-streaming requests
    // above ~16K output risk HTTP timeouts
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-5',
      max_tokens: 32000,
      messages: [{ role: 'user', content }],
    })
    const response = await stream.finalMessage()
    const block = response.content.find(
      (b): b is Extract<(typeof response.content)[number], { type: 'text' }> => b.type === 'text'
    )
    if (!block) {
      lastError = new Error('No text block in response')
      continue
    }
    try {
      return extractionResponseSchema.parse(extractJsonObject(block.text)).questions
    } catch (err) {
      lastError = err
      console.error('Extraction parse failure (attempt', attempt + 1, '):', err)
    }
  }
  throw new Error(
    `AI extraction failed: ${lastError instanceof Error ? lastError.message : 'unknown'}`
  )
}

/**
 * Generate concept-tagged questions. Retries once on malformed output, then
 * throws — callers decide the fallback (suggest: surface error; runtime:
 * re-serve bank questions).
 */
export async function generateMasteryQuestions(
  params: GenerateQuestionsParams
): Promise<GeneratedQuestion[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured')
  const anthropic = new Anthropic({ apiKey })
  const prompt = buildPrompt(params)

  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    // Sonnet 5 runs adaptive thinking by default; max_tokens covers thinking
    // + output, so leave generous headroom.
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })
    // Adaptive thinking puts a thinking block first — find the text block
    const content = response.content.find(
      (b): b is Extract<(typeof response.content)[number], { type: 'text' }> => b.type === 'text'
    )
    if (!content) {
      lastError = new Error('No text block in response')
      continue
    }
    console.log('✅ Question generation - Token Usage:', {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    })
    try {
      return parseGeneration(content.text).slice(0, params.count)
    } catch (err) {
      lastError = err
      console.error('Question generation parse failure (attempt', attempt + 1, '):', err)
    }
  }
  throw new Error(
    `AI generated malformed questions: ${lastError instanceof Error ? lastError.message : 'unknown'}`
  )
}
