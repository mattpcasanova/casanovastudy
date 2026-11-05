import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { ClaudeService } from '@/lib/claude-api'
import { gradingBlock, planBlockResponse } from '@/lib/plans'
import { fetchUploadedImageBuffers } from '@/lib/uploads/server-images'
import { parseTemplate } from '@/lib/grading/mark-points'

// "I'll mark them myself": read the answer key once into a mark sheet (every
// question with its marks and the scheme's own marks: M1, A1, B1 ...). With no
// answer key, the questions and marks are read off one student's paper.
//   POST { markScheme: { texts, images }, pages?, texts? } -> { template }

export const maxDuration = 300
const MAX_PAGES = 40

type TextPart = { name?: unknown; content?: unknown }
const textFiles = (list: unknown) =>
  (Array.isArray(list) ? (list as TextPart[]) : [])
    .filter((t) => typeof t?.content === 'string' && t.content.trim())
    .slice(0, 10)
    .map((t) => ({ buffer: Buffer.from(String(t.content).slice(0, 200000), 'utf-8'), name: String(t.name ?? 'answer key').slice(0, 120) }))

export async function POST(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const block = await gradingBlock(user.id)
  if (block) return planBlockResponse(block)

  let body: { markScheme?: { texts?: unknown; images?: unknown }; pages?: unknown; texts?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  try {
    const schemeImages = await fetchUploadedImageBuffers(body.markScheme?.images, MAX_PAGES, user.id)
    const scheme = [...textFiles(body.markScheme?.texts), ...schemeImages.map((img) => ({ buffer: img.buffer, name: img.name }))]
    let files = scheme
    if (!files.length) {
      const pages = await fetchUploadedImageBuffers(body.pages, 20, user.id)
      files = [...pages.map((img) => ({ buffer: img.buffer, name: img.name })), ...textFiles(body.texts)]
    }
    if (!files.length) return NextResponse.json({ error: 'Add an answer key, or a paper to read the questions from' }, { status: 400 })
    const { text } = await new ClaudeService().readMarkingTemplate(files, scheme.length ? 'key' : 'paper')
    const template = parseTemplate(text)
    if (!template.length) return NextResponse.json({ error: 'Could not find the questions and marks. Check the answer key is readable, or let the papers be graded for you.' }, { status: 422 })
    return NextResponse.json({ template, from: scheme.length ? 'key' : 'paper' })
  } catch (e) {
    console.error('Mark sheet failed:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not set up the mark sheet' }, { status: 500 })
  }
}
