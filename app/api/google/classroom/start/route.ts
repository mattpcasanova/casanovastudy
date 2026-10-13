import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { authUrl, classroomConfigured, signState } from '@/lib/google/classroom'

// Start connecting Google Classroom (read-only courses + rosters).
export async function POST(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  if (!classroomConfigured()) return NextResponse.json({ error: 'Google Classroom import is not set up yet' }, { status: 503 })
  const origin = process.env.NEXT_PUBLIC_APP_URL && !request.nextUrl.host.startsWith('localhost') ? process.env.NEXT_PUBLIC_APP_URL : request.nextUrl.origin
  const url = authUrl({ redirectUri: `${origin}/api/google/classroom/callback`, state: signState(user.id), loginHint: user.email })
  return NextResponse.json({ url })
}
