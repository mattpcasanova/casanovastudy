"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import {
  AuthShell, AuthHeading, FormError, RolePicker, SecondaryLink, StatusCard,
  friendlyAuthError, safeNext, type Role,
} from '@/components/auth/auth-ui'

// Google sends people back here. Returning users go straight on; a first
// sign-in creates the profile (asking student or teacher unless sign-up already
// did). Students without a birth date are then sent to /consent by AuthGate,
// same as email sign-ups.
export default function OAuthCallbackPage() {
  const router = useRouter()
  const { refreshProfile } = useAuth()
  const [status, setStatus] = useState<'loading' | 'role' | 'error'>('loading')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const authUser = useRef<SupabaseUser | null>(null)
  const next = useRef('/')

  const createProfile = async (role: Role) => {
    const u = authUser.current
    if (!u) return
    setSaving(true)
    setError('')
    const meta = u.user_metadata ?? {}
    const full = String(meta.full_name || meta.name || '').trim()
    const firstName = String(meta.given_name || full.split(/\s+/)[0] || '').trim()
    const lastName = String(meta.family_name || full.split(/\s+/).slice(1).join(' ') || '').trim()
    const { error: insertError } = await supabase.from('user_profiles').insert({
      id: u.id,
      email: u.email!,
      user_type: role,
      first_name: firstName || null,
      last_name: lastName || null,
    })
    if (insertError && insertError.code !== '23505') { // 23505: already created (double click / second tab)
      setError(friendlyAuthError(insertError, 'We couldn’t finish setting up your account. Please try again.'))
      setSaving(false)
      return
    }
    await refreshProfile()
    router.replace(next.current === '/' ? '/?welcome=1' : next.current)
  }

  useEffect(() => {
    const finish = async () => {
      const query = new URLSearchParams(window.location.search)
      const hash = new URLSearchParams(window.location.hash.substring(1))
      next.current = safeNext(query.get('next'))
      const urlError = query.get('error_description') || hash.get('error_description') || query.get('error')
      if (urlError) {
        setError(/access_denied|denied/i.test(urlError) ? 'Google sign-in was cancelled.' : urlError)
        setStatus('error')
        return
      }

      try {
        // The browser client usually swaps the ?code= for a session on load; do it here if not.
        let { data: { session } } = await supabase.auth.getSession()
        const code = query.get('code')
        if (!session && code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
          session = data.session
        }
        if (!session?.user) throw new Error('Google didn’t send a sign-in back. Please try again.')
        authUser.current = session.user

        const { data: profile, error: profileError } = await supabase
          .from('user_profiles').select('id').eq('id', session.user.id).maybeSingle()
        if (profileError) throw profileError

        if (profile) {
          await refreshProfile()
          router.replace(next.current)
          return
        }
        const role = query.get('role')
        if (role === 'student' || role === 'teacher') {
          await createProfile(role)
          return
        }
        setStatus('role')
      } catch (err) {
        setError(friendlyAuthError(err, 'Google sign-in didn’t work. Please try again.'))
        setStatus('error')
      }
    }
    void finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status === 'role') {
    const name = authUser.current?.user_metadata?.given_name
    return (
      <AuthShell>
        <AuthHeading title={name ? `Welcome, ${name}!` : 'Welcome!'} subtitle="One last thing: are you a student or a teacher?" />
        <FormError>{error}</FormError>
        <RolePicker onPick={(r) => void createProfile(r)} disabled={saving} />
        {saving && <p className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Setting up your account…</p>}
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      {status === 'loading' ? (
        <StatusCard icon={<Loader2 className="h-8 w-8 animate-spin" />} title="Signing you in…">
          <p>This only takes a moment.</p>
        </StatusCard>
      ) : (
        <StatusCard
          icon={<AlertCircle className="h-8 w-8" />}
          tone="red"
          title="Google sign-in didn’t work"
          actions={<SecondaryLink href="/auth/signin">Back to sign in</SecondaryLink>}
        >
          <p>{error}</p>
        </StatusCard>
      )}
    </AuthShell>
  )
}
