import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { ClaudeService, type PageHeaderRead } from '@/lib/claude-api'
import { groupPages, splitNameAndPeriod, splitPoints } from '@/lib/grading/batch'
import { fullName, parseName, type RosterName } from '@/lib/grading/names'
import { gradingBlock, planBlockResponse } from '@/lib/plans'
import { fetchUploadedImageBuffers } from '@/lib/uploads/server-images'

// Batch grading, step 1: find where each student's paper starts and read the
// names, so the browser can show one paper per student (lib/grading/batch.ts)
// and fill in the exam title, class and period.
// 1. Every page: Haiku reads whether it looks like a first page, any name,
//    title, course and period (~$0.002 a page).
// 2. splitPoints weighs those against the usual paper length (phone photos of
//    a page held up show the next paper's cover underneath, so inside pages
//    often come back with a name).
// 3. The first page of each paper: a careful name read on GRADING_MODEL with
//    the class list (~$0.01 a paper), which replaces Haiku's name.
// Pages were prepared in the browser and uploaded to Cloudinary.
// Measured on a real 228-page stack of 25 nine-page papers: 25 papers found,
// every cover name right (Haiku alone: 45 papers, most names wrong).

export const maxDuration = 300
// About 40 students x 11 pages; a 36-student class of 9-page papers is 324.
const MAX_PAGES = 450

export async function POST(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const block = await gradingBlock(user.id)
  if (block) return planBlockResponse(block)

  let pages: unknown
  // The class list helps read messy handwriting. Objects {id, firstName,
  // lastName} (so split can match them) or plain names (older clients).
  let roster: RosterName[] = []
  try {
    const body = await request.json()
    pages = body.pages
    if (Array.isArray(body.roster)) {
      roster = body.roster.slice(0, 200).flatMap((r: unknown, i: number): RosterName[] => {
        if (typeof r === 'string' && r.trim()) return [{ id: `r${i}`, ...parseName(r.trim().slice(0, 80)) }]
        if (r && typeof r === 'object') {
          const o = r as Record<string, unknown>
          const firstName = typeof o.firstName === 'string' ? o.firstName.trim().slice(0, 60) : ''
          const lastName = typeof o.lastName === 'string' ? o.lastName.trim().slice(0, 60) : ''
          if (firstName || lastName) return [{ id: typeof o.id === 'string' ? o.id.slice(0, 60) : `r${i}`, firstName, lastName }]
        }
        return []
      })
    }
  } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  let images
  try {
    images = await fetchUploadedImageBuffers(pages, MAX_PAGES, user.id)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not load pages' }, { status: 400 })
  }

  // Progress streams as NDJSON ({type:'status', step:'read'|'names', done, total}
  // then {type:'done', headers}); a plan block came back as JSON above.
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      try {
        const claude = new ClaudeService()
        const rosterNames = roster.map(fullName)
        const headers: PageHeaderRead[] = new Array(images.length)
        let next = 0
        let read = 0
        send({ type: 'status', step: 'read', done: 0, total: images.length })
        const worker = async () => {
          while (next < images.length) {
            const i = next++
            try {
              const page = await claude.readPageHeader({ mediaType: images[i].mediaType, data: images[i].buffer.toString('base64') }, rosterNames)
              // "<name> P2" -> name + period, in case the model left the period in.
              const split = page.name ? splitNameAndPeriod(page.name) : null
              headers[i] = { ...page, name: split?.name ?? null, period: page.period ?? split?.period ?? null }
            } catch (e) {
              console.error(`Page header read failed (${images[i].name}):`, e)
              headers[i] = { name: null, firstPage: false, title: null, course: null, period: null } // the teacher can fix the split
            }
            send({ type: 'status', step: 'read', done: ++read, total: images.length })
          }
        }
        await Promise.all(Array.from({ length: Math.min(12, images.length) }, worker))

        // The first page of each paper gets the careful read. When that page turns
        // out not to be a first page (Haiku missed the real cover and a neighbour
        // was picked), the pages just after and before it are tried, and the real
        // cover's header replaces the wrong one so the browser's split moves there.
        const groups = groupPages(splitPoints(headers, roster), headers)
        const starts = groups.map((g) => g.pages[0])
        const readCover = async (i: number) => claude.readCoverName({ mediaType: images[i].mediaType, data: images[i].buffer.toString('base64') }, rosterNames)
        let nextStart = 0
        let named = 0
        send({ type: 'status', step: 'names', done: 0, total: starts.length })
        const coverWorker = async () => {
          while (nextStart < starts.length) {
            const k = nextStart++
            const start = starts[k]
            const end = starts[k + 1] ?? images.length
            try {
              let i = start
              let cover = await readCover(i)
              if (!cover.firstPage) {
                for (const j of [start + 1, start + 2, start - 1, start - 2]) {
                  if (j <= 0 || j >= end || (k > 0 && j <= starts[k - 1])) continue
                  const again = await readCover(j)
                  if (!again.firstPage) continue
                  headers[start] = { ...headers[start], name: null, firstPage: false }
                  i = j
                  cover = again
                  break
                }
              }
              const name = (cover.sure && cover.student) || cover.written
              const split = name ? splitNameAndPeriod(name) : null
              headers[i] = {
                name: split?.name ?? headers[i].name,
                firstPage: true,
                title: cover.title ?? headers[i].title,
                course: cover.course ?? headers[i].course,
                period: cover.period ?? split?.period ?? headers[i].period,
              }
            } catch (e) {
              console.error(`Cover name read failed (${images[start].name}):`, e) // Haiku's read stays
            }
            send({ type: 'status', step: 'names', done: ++named, total: starts.length })
          }
        }
        await Promise.all(Array.from({ length: Math.min(8, starts.length) }, coverWorker))
        send({ type: 'done', headers })
      } catch (e) {
        console.error('Split failed:', e)
        send({ type: 'error', error: e instanceof Error ? e.message : 'Could not read the pages' })
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' } })
}
