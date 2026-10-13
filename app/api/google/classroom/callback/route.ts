import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyState } from '@/lib/google/classroom'

// Google sends the teacher back here after they allow read-only access. The
// signed state says who started it (this is a plain browser navigation, so no
// session header). The access token is kept for an hour, only for the import.
export async function GET(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_APP_URL && !request.nextUrl.host.startsWith('localhost') ? process.env.NEXT_PUBLIC_APP_URL : request.nextUrl.origin
  const back = (q: string) => NextResponse.redirect(`${origin}/teacher/classes?${q}`)
  const params = request.nextUrl.searchParams
  if (params.get('error')) return back('google=denied')
  const userId = verifyState(params.get('state'))
  const code = params.get('code')
  if (!userId || !code) return back('google=error')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: `${origin}/api/google/classroom/callback`,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) {
    console.error('Classroom token exchange failed', res.status, await res.text().catch(() => ''))
    return back('google=error')
  }
  const token = (await res.json()) as { access_token?: string; expires_in?: number; scope?: string }
  if (!token.access_token) return back('google=error')
  if (!token.scope?.includes('classroom.rosters.readonly')) return back('google=scopes')
  await createAdminClient().from('google_classroom_tokens').upsert({
    user_id: userId,
    access_token: token.access_token,
    expires_at: new Date(Date.now() + Math.min(token.expires_in ?? 3600, 3600) * 1000).toISOString(),
  })
  return back('google=connected')
}
