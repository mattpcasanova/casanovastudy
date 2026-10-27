import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { createAdminClient } from '@/lib/supabase-server'
import { myAssignmentOnGuides } from '@/lib/practice/server'

// GET ?guideId= : the signed-in student's assignment on this guide, or on the
// guide it was saved from (their "Save to My Guides" copy). The guide page uses
// it when opened without ?assignment=, so progress and the score still count.
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ assignmentId: null }, { status: 401 })
  const guideId = request.nextUrl.searchParams.get('guideId') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(guideId)) return NextResponse.json({ assignmentId: null }, { status: 400 })
  const supabase = createAdminClient()
  const { data: guide } = await supabase.from('study_guides').select('id, user_id, copied_from').eq('id', guideId).maybeSingle()
  if (!guide) return NextResponse.json({ assignmentId: null }, { status: 404 })
  // Their own copy points back to the original; anything else is just this guide.
  const ids = guide.user_id === user.id && guide.copied_from ? [guide.id as string, guide.copied_from as string] : [guide.id as string]
  const hit = await myAssignmentOnGuides(supabase, user.id, ids)
  return NextResponse.json(hit ?? { assignmentId: null }, { headers: { 'Cache-Control': 'no-store' } })
}
