import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { ClaudeService } from '@/lib/claude-api'
import { gradingBlock, planBlockResponse } from '@/lib/plans'
import { fetchUploadedImageBuffers } from '@/lib/uploads/server-images'

// Batch grading, step 1: read the top of each page (Haiku) so the browser can
// split a stack of pages into one paper per student (lib/grading/batch.ts).
// Pages were prepared in the browser and uploaded to Cloudinary.

export const maxDuration = 300
const MAX_PAGES = 300

export async function POST(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const block = await gradingBlock(user.id)
  if (block) return planBlockResponse(block)

  let pages: unknown
  try { pages = (await request.json()).pages } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  let images
  try {
    images = await fetchUploadedImageBuffers(pages, MAX_PAGES)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not load pages' }, { status: 400 })
  }

  const claude = new ClaudeService()
  const headers: Array<{ name: string | null; firstPage: boolean }> = new Array(images.length)
  let next = 0
  const worker = async () => {
    while (next < images.length) {
      const i = next++
      try {
        headers[i] = await claude.readPageHeader({ mediaType: images[i].mediaType, data: images[i].buffer.toString('base64') })
      } catch (e) {
        console.error(`Page header read failed (${images[i].name}):`, e)
        headers[i] = { name: null, firstPage: false } // the teacher can fix the split
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(8, images.length) }, worker))
  return NextResponse.json({ headers })
}
