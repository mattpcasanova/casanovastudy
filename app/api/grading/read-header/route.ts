import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { ClaudeService } from '@/lib/claude-api'
import { splitNameAndPeriod } from '@/lib/grading/batch'
import { gradingBlock, planBlockResponse } from '@/lib/plans'
import { sniffImageType } from '@/lib/uploads/server-images'

// Single-paper grader: read the top of the first page (Haiku, ~$0.002) to fill
// in the student's name, exam title, class and period. The browser sends one
// prepared JPEG (1568px), so the body stays small.

const MAX_BYTES = 3 * 1024 * 1024

export async function POST(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const block = await gradingBlock(user.id)
  if (block) return planBlockResponse(block)

  let data: string
  try { data = String((await request.json()).image ?? '') } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const buffer = Buffer.from(data, 'base64')
  if (!buffer.byteLength || buffer.byteLength > MAX_BYTES) return NextResponse.json({ error: 'Invalid image' }, { status: 400 })
  const mediaType = sniffImageType(new Uint8Array(buffer.subarray(0, 12)))
  if (!mediaType) return NextResponse.json({ error: 'Invalid image' }, { status: 400 })

  try {
    const read = await new ClaudeService().readPageHeader({ mediaType, data })
    const split = read.name ? splitNameAndPeriod(read.name) : null
    return NextResponse.json({ ...read, name: split?.name ?? null, period: read.period ?? split?.period ?? null })
  } catch (e) {
    console.error('Header read failed:', e)
    return NextResponse.json({ error: 'Could not read the page' }, { status: 500 })
  }
}
