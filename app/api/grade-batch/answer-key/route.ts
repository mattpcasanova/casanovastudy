import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { ClaudeService } from '@/lib/claude-api'
import { gradingBlock, planBlockResponse } from '@/lib/plans'
import { fetchUploadedImageBuffers } from '@/lib/uploads/server-images'

// Batch grading with no mark scheme: draft one answer key from the first
// student's paper (questions are printed on it). The teacher checks it, then
// every paper is graded against it, so totals match across the class.

export const maxDuration = 300
const MAX_PAGES = 20

export async function POST(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const block = await gradingBlock(user.id)
  if (block) return planBlockResponse(block)

  let body: { pages?: unknown; texts?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const texts = Array.isArray(body.texts)
    ? (body.texts as Array<{ name?: unknown; content?: unknown }>)
        .filter((t) => typeof t?.content === 'string' && t.content.trim())
        .slice(0, 5)
        .map((t) => ({ name: String(t.name ?? 'paper').slice(0, 120), content: String(t.content) }))
    : []

  try {
    const images = await fetchUploadedImageBuffers(body.pages, MAX_PAGES)
    if (!images.length && !texts.length) return NextResponse.json({ error: 'No pages to read' }, { status: 400 })
    const { key } = await new ClaudeService().draftAnswerKey(
      images.map((img) => ({ mediaType: img.mediaType, data: img.buffer.toString('base64') })),
      texts,
    )
    return NextResponse.json({ key })
  } catch (e) {
    console.error('Answer key draft failed:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not write an answer key' }, { status: 500 })
  }
}
