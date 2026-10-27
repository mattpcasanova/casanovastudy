import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { createAdminClient } from '@/lib/supabase-server'

// GET: who made the guides the caller saved to My Guides ({ [copyId]: name }).
// Teachers by full name; anyone else as "First L." (no emails).
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ origins: {} }, { status: 401 })
  const supabase = createAdminClient()
  const { data: copies } = await supabase.from('study_guides').select('id, copied_from').eq('user_id', user.id).not('copied_from', 'is', null).limit(1000)
  if (!copies?.length) return NextResponse.json({ origins: {} })
  const { data: originals } = await supabase.from('study_guides').select('id, user_id').in('id', [...new Set(copies.map((c) => c.copied_from as string))])
  const ownerOf = new Map((originals ?? []).filter((g) => g.user_id).map((g) => [g.id as string, g.user_id as string]))
  const ownerIds = [...new Set(ownerOf.values())]
  const { data: people } = ownerIds.length ? await supabase.from('user_profiles').select('id, first_name, last_name, user_type').in('id', ownerIds) : { data: [] }
  const nameOf = new Map((people ?? []).map((p) => {
    const first = (p.first_name ?? '').trim()
    const last = (p.last_name ?? '').trim()
    const name = p.user_type === 'teacher' ? [first, last].filter(Boolean).join(' ') : [first, last ? `${last[0]}.` : ''].filter(Boolean).join(' ')
    return [p.id as string, name || null]
  }))
  const origins: Record<string, string> = {}
  for (const c of copies) {
    const name = nameOf.get(ownerOf.get(c.copied_from as string) ?? '')
    if (name) origins[c.id as string] = name
  }
  return NextResponse.json({ origins }, { headers: { 'Cache-Control': 'no-store' } })
}
