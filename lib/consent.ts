// Server side of parental consent (rules: lib/consent-rules.ts; table:
// parental_consents, migration 044). Parents approve through a one-time link
// emailed to them; only the token's SHA-256 hash is stored.

import { createHash, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { consentStep, type ConsentStep } from '@/lib/consent-rules'

export interface ConsentState {
  step: ConsentStep
  status: 'pending' | 'granted' | 'school' | null
  parentEmail: string | null
  firstName: string | null
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
export const newToken = () => randomBytes(32).toString('base64url')

export async function getConsentState(userId: string): Promise<ConsentState> {
  const supabase = createAdminClient()
  const [{ data: profile }, { data: consent }] = await Promise.all([
    supabase.from('user_profiles').select('user_type, birth_date, clever_id, first_name').eq('id', userId).maybeSingle(),
    supabase.from('parental_consents').select('status, parent_email').eq('user_id', userId).maybeSingle(),
  ])
  const status = (consent?.status ?? null) as ConsentState['status']
  return {
    step: consentStep({ userType: profile?.user_type, birthDate: profile?.birth_date, viaSchool: !!profile?.clever_id, status }),
    status,
    parentEmail: consent?.parent_email ?? null,
    firstName: profile?.first_name ?? null,
  }
}

/**
 * For AI routes: a student who still needs a parent's OK (or to give a birth
 * date) can't send anything to the AI yet. Returns a 403 to send, or null.
 */
export async function consentBlockResponse(userId: string): Promise<NextResponse | null> {
  const { step } = await getConsentState(userId)
  if (step === 'ok') return null
  return NextResponse.json(
    { error: step === 'birthdate' ? 'Please confirm your birth date first.' : 'A parent needs to approve your account first.', code: 'consent_required' },
    { status: 403 },
  )
}
