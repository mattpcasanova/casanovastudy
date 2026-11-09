import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { searchStandards, type StandardRow } from '@/lib/standards-search'
import rows from '@/data/standards/fl-cpalms.json'

// Florida standards search (lib/standards-search.ts over the CPALMS export).
//   GET ?q=slope&grade=6th-8th&subject=mathematics -> { results: StandardHit[] }
// Signed in only (keeps it to the app's users); the data itself is public.
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  const q = (request.nextUrl.searchParams.get('q') ?? '').slice(0, 120)
  const grade = request.nextUrl.searchParams.get('grade')
  const subject = request.nextUrl.searchParams.get('subject')
  const results = searchStandards(rows as StandardRow[], q, { grade, subject, limit: 20 })
  return NextResponse.json({ results, source: 'CPALMS export, 2026-11-08' }, { headers: { 'Cache-Control': 'private, max-age=300' } })
}
