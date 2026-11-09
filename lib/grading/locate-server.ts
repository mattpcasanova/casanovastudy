import Anthropic from '@anthropic-ai/sdk'
import { GRADING_MODEL } from '@/lib/claude-api'
import type { FetchedImage } from '@/lib/uploads/server-images'
import { parsePositions, type AnswerPosition } from './locate'

/**
 * Ask the grading model where each question's answer sits on the pages (page
 * and how far down it ends). Thinking off: a look, not a judgement. About a
 * cent for a short paper.
 */
export async function locateAnswers(pages: FetchedImage[], questions: string[]): Promise<{ positions: AnswerPosition[]; usage: { input_tokens: number; output_tokens: number } }> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const content: Anthropic.ContentBlockParam[] = []
  pages.forEach((img, i) => {
    content.push({ type: 'text', text: `Page ${i + 1} of ${pages.length}:` })
    content.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.buffer.toString('base64') } })
  })
  content.push({ type: 'text', text: `Above are the pages of one student's paper. A teacher wants to write the marks for each question in the right margin, level with where that answer ends.

For each of these questions: ${questions.map((q) => `"${q}"`).join(', ')}
give the page it is answered on and how far down that page the student's answer ends: "y" from 0 (top edge) to 1 (bottom edge), judged against the whole page image. If the student left it blank, use where the question's answer space ends. Leave out a question you cannot find.

Reply with JSON only: {"positions": [{"q": "1(a)", "page": 1, "y": 0.31}]}` })
  const response = await anthropic.messages.create({
    model: GRADING_MODEL,
    max_tokens: 4000,
    // Thinking off on Sonnet 5.5 is between_tools ({type:'disabled'} is a 400).
    thinking: { type: 'between_tools' } as unknown as Anthropic.ThinkingConfigParam,
    messages: [{ role: 'user', content }],
  })
  const text = response.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('')
  console.log('Locate answers usage:', response.usage)
  return { positions: parsePositions(text, pages.length), usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens } }
}
