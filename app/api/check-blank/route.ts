import { NextRequest, NextResponse } from 'next/server'
import { ClaudeService } from '@/lib/claude-api'
import { getRequestUser } from '@/lib/request-user'
import { isBlankCorrect, isExactBlank } from '@/lib/formats/practice'

// Fill-in blanks: when the letter-by-letter check says no, the player asks here whether the
// student's word means the same thing ("outer" for "outside"). The answers are already in the
// page, so nothing secret passes through; the verdict only ever turns a wrong blank right.

const MAX_SENTENCE = 1200
const MAX_ANSWER = 80
const MAX_BLANKS = 4

// Abuse limit only (per instance): a practice set has a handful of fill-ins.
const WINDOW_MS = 10 * 60_000
const MAX_PER_WINDOW = 80
const recent = new Map<string, number[]>()
function allowed(userId: string): boolean {
  const now = Date.now()
  const times = (recent.get(userId) ?? []).filter((t) => now - t < WINDOW_MS)
  if (times.length >= MAX_PER_WINDOW) { recent.set(userId, times); return false }
  times.push(now)
  recent.set(userId, times)
  return true
}

interface Body { sentence?: unknown; blanks?: unknown; subject?: unknown }

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in to have your answer checked.' }, { status: 401 })

  let body: Body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const sentence = typeof body.sentence === 'string' ? body.sentence.slice(0, MAX_SENTENCE) : ''
  const list = Array.isArray(body.blanks) ? body.blanks.slice(0, MAX_BLANKS) : []
  const blanks = list.map((b) => {
    const row = (b ?? {}) as { answers?: unknown; given?: unknown }
    return {
      answers: Array.isArray(row.answers) ? row.answers.filter((a): a is string => typeof a === 'string' && !!a.trim()).slice(0, 6).map((a) => a.slice(0, MAX_ANSWER)) : [],
      given: typeof row.given === 'string' ? row.given.trim().slice(0, MAX_ANSWER) : '',
    }
  })
  if (!sentence || !blanks.length || blanks.some((b) => !b.answers.length)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  // The letter check settles what it can; a number has no other way to be right.
  const verdicts = blanks.map((b) => (isBlankCorrect(b.given, b.answers) ? true : !b.given || isExactBlank(b.answers) ? false : null))
  const open = blanks.map((b, i) => ({ b, i })).filter(({ i }) => verdicts[i] === null)
  if (!open.length || !allowed(user.id)) return NextResponse.json({ correct: verdicts.map((v) => v === true) })

  try {
    // One blank per call: each is shown with the other blanks filled in, so the sentence reads whole.
    const results = await Promise.all(open.map(({ b }) => new ClaudeService().checkBlanks({
      sentence: sentenceFor(sentence, blanks, b),
      blanks: [b],
      subject: typeof body.subject === 'string' ? body.subject.slice(0, 60) : null,
    })))
    open.forEach(({ i }, k) => { verdicts[i] = results[k][0] })
  } catch (error) {
    console.error('Blank check failed:', error)
  }
  return NextResponse.json({ correct: verdicts.map((v) => v === true) })
}

/** The sentence with this blank as _____ and every other blank showing its answer. Blanks arrive as {{n}}. */
function sentenceFor(sentence: string, blanks: Array<{ answers: string[] }>, current: { answers: string[] }): string {
  return sentence.replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const b = blanks[Number(n)]
    return !b || b === current ? '_____' : b.answers[0]
  })
}
