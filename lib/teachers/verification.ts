// Teacher verification on the server (service role). See migration 063 and
// verification-rules.ts. Only verified teachers can connect to student
// accounts: class codes, practice links and linking roster names by email.

import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/send'
import { teacherApprovedEmail, teacherReviewEmail, teacherVerifyEmail } from '@/lib/email/templates'
import { domainApproves, emailLinkExpiry, emailLinkToken, normalizeEmail, reviewToken, type VerificationStatus } from './verification-rules'

export interface TeacherVerification {
  status: VerificationStatus
  schoolEmail: string | null
  schoolName: string | null
  emailConfirmed: boolean
}

export function verificationKey(): string {
  const k = process.env.TEACHER_VERIFY_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!k) throw new Error('No signing key for teacher verification')
  return k
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://www.casanovastudy.com').replace(/\/$/, '')
}

export async function getTeacherVerification(supabase: SupabaseClient, userId: string): Promise<TeacherVerification> {
  const { data } = await supabase.from('teacher_verifications').select('status, school_email, school_name, email_confirmed_at').eq('user_id', userId).maybeSingle()
  if (!data) return { status: 'none', schoolEmail: null, schoolName: null, emailConfirmed: false }
  return { status: data.status as VerificationStatus, schoolEmail: data.school_email, schoolName: data.school_name, emailConfirmed: !!data.email_confirmed_at }
}

export async function isVerifiedTeacher(supabase: SupabaseClient, userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false
  const { data } = await supabase.from('teacher_verifications').select('status').eq('user_id', userId).maybeSingle()
  return data?.status === 'approved'
}

/** Same check for a class (by its teacher). */
export async function classTeacherVerified(supabase: SupabaseClient, classId: string): Promise<boolean> {
  const { data } = await supabase.from('classes').select('teacher_id').eq('id', classId).maybeSingle()
  return isVerifiedTeacher(supabase, data?.teacher_id)
}

export const UNVERIFIED_TEACHER_MESSAGE = "This teacher's account is still being verified, so students can't join yet. Try again in a day or two."

async function verifiedDomains(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase.from('verified_school_domains').select('domain')
  return (data ?? []).map((d) => d.domain as string)
}

/**
 * The teacher gave a school email. If they signed in with Google on that same
 * address it's already proven; otherwise email them a link.
 */
export async function startVerification(supabase: SupabaseClient, userId: string, input: { schoolEmail: string; schoolName: string }): Promise<{ state: 'sent' | 'approved' | 'pending'; error?: string }> {
  const email = normalizeEmail(input.schoolEmail)
  if (!email) return { state: 'pending', error: 'Enter a valid email address.' }
  const schoolName = input.schoolName.trim().slice(0, 120)
  const current = await getTeacherVerification(supabase, userId)
  if (current.status === 'approved') return { state: 'approved' }

  await supabase.from('teacher_verifications').upsert({
    user_id: userId, status: 'pending', school_email: email, school_name: schoolName || null,
    email_confirmed_at: null, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  const { data: auth } = await supabase.auth.admin.getUserById(userId)
  const provenByGoogle = auth?.user?.email?.toLowerCase() === email && (auth.user.identities ?? []).some((i) => i.provider === 'google')
  if (provenByGoogle) return confirmSchoolEmail(supabase, userId, email)

  const expires = emailLinkExpiry()
  const link = `${siteUrl()}/teacher/verify?u=${encodeURIComponent(userId)}&e=${encodeURIComponent(email)}&x=${expires}&t=${emailLinkToken(verificationKey(), userId, email, expires)}`
  const { data: profile } = await supabase.from('user_profiles').select('first_name').eq('id', userId).maybeSingle()
  const mail = teacherVerifyEmail({ firstName: profile?.first_name ?? null, link, siteUrl: siteUrl() })
  await sendEmail({ to: email, ...mail })
  return { state: 'sent' }
}

/** The school email is proven. A verified domain approves; anything else goes to review. */
export async function confirmSchoolEmail(supabase: SupabaseClient, userId: string, email: string): Promise<{ state: 'approved' | 'pending' }> {
  const now = new Date().toISOString()
  const current = await getTeacherVerification(supabase, userId)
  if (current.status === 'approved') return { state: 'approved' }
  if (current.schoolEmail && current.schoolEmail !== email.toLowerCase()) return { state: 'pending' } // an older link
  if (domainApproves(email, await verifiedDomains(supabase))) {
    await supabase.from('teacher_verifications').update({ status: 'approved', method: 'domain', email_confirmed_at: now, decided_at: now, updated_at: now }).eq('user_id', userId)
    return { state: 'approved' }
  }
  await supabase.from('teacher_verifications').update({ email_confirmed_at: now, updated_at: now }).eq('user_id', userId)
  await notifyReviewer(supabase, userId).catch((e) => console.error('Teacher review email failed:', e))
  return { state: 'pending' }
}

export async function notifyReviewer(supabase: SupabaseClient, userId: string): Promise<void> {
  const to = process.env.ADMIN_EMAIL
  if (!to) { console.warn(`Teacher ${userId} is waiting for review (set ADMIN_EMAIL to get these by email)`); return }
  const [{ data: profile }, v, { data: auth }] = await Promise.all([
    supabase.from('user_profiles').select('first_name, last_name').eq('id', userId).maybeSingle(),
    getTeacherVerification(supabase, userId),
    supabase.auth.admin.getUserById(userId),
  ])
  const link = `${siteUrl()}/admin/verify-teacher?u=${encodeURIComponent(userId)}&t=${reviewToken(verificationKey(), userId)}`
  const mail = teacherReviewEmail({
    name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'A teacher',
    loginEmail: auth?.user?.email ?? '',
    schoolEmail: v.schoolEmail ?? '',
    schoolName: v.schoolName ?? '',
    link,
    siteUrl: siteUrl(),
  })
  await sendEmail({ to, ...mail })
}

export async function decideTeacher(supabase: SupabaseClient, userId: string, approve: boolean): Promise<void> {
  const now = new Date().toISOString()
  await supabase.from('teacher_verifications').upsert({ user_id: userId, status: approve ? 'approved' : 'rejected', method: 'manual', decided_at: now, updated_at: now }, { onConflict: 'user_id' })
  if (!approve) return
  const [{ data: profile }, { data: auth }] = await Promise.all([
    supabase.from('user_profiles').select('first_name').eq('id', userId).maybeSingle(),
    supabase.auth.admin.getUserById(userId),
  ])
  if (auth?.user?.email) {
    const mail = teacherApprovedEmail({ firstName: profile?.first_name ?? null, link: `${siteUrl()}/teach`, siteUrl: siteUrl() })
    await sendEmail({ to: auth.user.email, ...mail }).catch((e) => console.error('Approved email failed:', e))
  }
}
