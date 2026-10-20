import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { decideTeacher, getTeacherVerification, verificationKey } from '@/lib/teachers/verification'
import { checkReviewToken } from '@/lib/teachers/verification-rules'

// The site owner's review link (/admin/verify-teacher?u=&t=, emailed to ADMIN_EMAIL).
// GET ?u=&t=: who it is. POST { u, t, action: 'approve' | 'reject' }.

async function teacherInfo(userId: string) {
  const supabase = createAdminClient()
  const [{ data: profile }, v, { data: auth }] = await Promise.all([
    supabase.from('user_profiles').select('first_name, last_name, user_type').eq('id', userId).maybeSingle(),
    getTeacherVerification(supabase, userId),
    supabase.auth.admin.getUserById(userId),
  ])
  return {
    name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Unknown',
    isTeacher: profile?.user_type === 'teacher',
    loginEmail: auth?.user?.email ?? null,
    joined: auth?.user?.created_at ?? null,
    ...v,
  }
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('u') ?? ''
  const token = request.nextUrl.searchParams.get('t') ?? ''
  if (!userId || !checkReviewToken(verificationKey(), userId, token)) return NextResponse.json({ error: "This review link doesn't work." }, { status: 403 })
  return NextResponse.json(await teacherInfo(userId))
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const userId = String(body?.u ?? '')
  if (!userId || !checkReviewToken(verificationKey(), userId, String(body?.t ?? ''))) return NextResponse.json({ error: "This review link doesn't work." }, { status: 403 })
  if (body?.action !== 'approve' && body?.action !== 'reject') return NextResponse.json({ error: 'Pick approve or reject' }, { status: 400 })
  await decideTeacher(createAdminClient(), userId, body.action === 'approve')
  return NextResponse.json(await teacherInfo(userId))
}
