import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { recordError } from '@/lib/monitoring/store'

// POST { message, stack?, path?, digest? }: a browser error (components/monitoring/error-reporter.tsx).
// Signed-out visitors can report too; per-address limit keeps it from being a firehose.
const recent = new Map<string, number[]>()

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const now = Date.now()
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000)
  if (hits.length >= 30) return NextResponse.json({ ok: false }, { status: 429 })
  recent.set(ip, [...hits, now])
  if (recent.size > 5000) recent.clear()

  const raw = await request.text().catch(() => '')
  if (raw.length > 12000) return NextResponse.json({ ok: false }, { status: 413 })
  let body: Record<string, unknown> = {}
  try { body = JSON.parse(raw) } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const str = (v: unknown) => (typeof v === 'string' ? v : null)
  const message = str(body.message)
  if (!message) return NextResponse.json({ ok: false }, { status: 400 })

  const user = await getRequestUser(request).catch(() => null)
  const ok = await recordError(
    { source: 'client', message, stack: str(body.stack), path: str(body.path), digest: str(body.digest) },
    { userId: user?.id ?? null, userAgent: request.headers.get('user-agent') },
  )
  return NextResponse.json({ ok })
}
