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

function parseGeneration(raw: string): GeneratedQuestion[] {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  const parsed = generationResponseSchema.parse(JSON.parse(cleaned))
  return parsed.questions
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
