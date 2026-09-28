import type { NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '@/lib/supabase-server'

/**
 * The signed-in user making this request, taken ONLY from their session:
 * a `Authorization: Bearer <access token>` header (what `authFetch` sends — the
 * app keeps sessions in localStorage, so there are usually no auth cookies),
 * falling back to Supabase auth cookies. Never trust a userId from the body,
 * form data or query string — user ids are visible on public guides.
 */
export async function getRequestUser(request: NextRequest): Promise<User | null> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (token) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user) return user
  }
  return getAuthenticatedUser(request)
}
