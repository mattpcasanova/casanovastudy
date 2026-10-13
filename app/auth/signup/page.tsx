"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { TEACHER_MIN_AGE, ageOn, isPlausibleBirthDate } from '@/lib/consent-rules'
import {
  AuthShell, AuthHeading, Divider, Field, FormError, GoogleButton, PasswordField, PrimaryButton, RolePicker,
  ROLES, friendlyAuthError, type Role,
} from '@/components/auth/auth-ui'

export default function SignUpPage() {
  const router = useRouter()
  const { signUp, signInWithGoogle } = useAuth()

  const [role, setRole] = useState<Role | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!role) return
    if (!firstName.trim() || !lastName.trim()) return setError('Please enter your first and last name.')
    if (password.length < 6) return setError('Your password needs at least 6 characters.')
    // Everyone: tells us who needs a parent's OK (under 13); teachers must be adults.
    if (!birthDate) return setError('Please enter your birth date.')
    if (!isPlausibleBirthDate(birthDate)) return setError('Please check your birth date, especially the year.')
    if (role === 'teacher' && (ageOn(birthDate) ?? 0) < TEACHER_MIN_AGE) {
      return setError('Teacher accounts are for adults. If you’re a student, go back and choose “I’m a student”.')
    }

    setIsLoading(true)
    try {
      const { needsConfirmation } = await signUp(email.trim(), password, role, firstName.trim(), lastName.trim(), birthDate || undefined)
      if (!needsConfirmation) {
        // Account is active right away (email confirmation is off in Supabase).
        router.push('/?welcome=1')
        return
      }
      // The check-email page offers "resend"; it reads the address from here
      // (kept out of the URL).
      try { sessionStorage.setItem('cs:pending-email', email.trim()) } catch {}
      router.push('/auth/check-email')
    } catch (err) {
      setError(friendlyAuthError(err, 'We couldn’t create your account. Please try again.'))
      setIsLoading(false)
    }
  }

  const handleGoogle = async () => {
    if (!role) return
    setError('')
    setIsLoading(true)
    try {
      await signInWithGoogle({ role })
    } catch (err) {
      setError(friendlyAuthError(err, 'We couldn’t open Google sign-in. Please try again.'))
      setIsLoading(false)
    }
  }

  if (!role) {
    return (
      <AuthShell>
        <AuthHeading title="Create your account" subtitle="Free to use. First, tell us who you are." />
        <RolePicker onPick={setRole} />

        <p className="mt-8 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link href="/auth/signin" className="font-semibold text-blue-600 hover:text-blue-700">Sign in</Link>
        </p>
      </AuthShell>
    )
  }

  const chosen = ROLES.find((r) => r.value === role)!
  return (
    <AuthShell>
      <button
        type="button"
        onClick={() => { setRole(null); setError('') }}
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <AuthHeading
        title="Create your account"
        subtitle={
          <span className="inline-flex items-center gap-2">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-200')}>
              <chosen.icon className="h-3.5 w-3.5" /> {role === 'student' ? 'Student' : 'Teacher'}
            </span>
            <button type="button" onClick={() => setRole(null)} className="text-sm font-medium text-slate-500 underline-offset-2 hover:underline">Change</button>
          </span>
        }
      />

      <FormError>{error}</FormError>

      <GoogleButton label="Sign up with Google" disabled={isLoading} onClick={() => void handleGoogle()} />
      <Divider label="or use your email" />

      <form onSubmit={handleSignUp} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" autoComplete="given-name" required autoFocus value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={isLoading} />
          <Field label="Last name" autoComplete="family-name" required value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={isLoading} />
        </div>
        <Field label="Email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="new-password" showStrength disabled={isLoading} />
        <Field
          label="Birth date"
          type="date"
          autoComplete="bday"
          value={birthDate}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setBirthDate(e.target.value)}
          disabled={isLoading}
          required
          labelAside={<span className="text-xs text-slate-400">{role === 'student' ? 'Under 13 needs a parent\'s OK' : 'Teachers must be 18+'}</span>}
        />
        <PrimaryButton type="submit" loading={isLoading} loadingText="Creating your account…">Create account</PrimaryButton>
        <p className="text-center text-xs text-slate-500">
          By creating an account you agree to the <Link href="/terms" className="font-semibold text-blue-600 hover:underline">Terms</Link> and <Link href="/privacy" className="font-semibold text-blue-600 hover:underline">Privacy Policy</Link>.
        </p>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/auth/signin" className="font-semibold text-blue-600 hover:text-blue-700">Sign in</Link>
      </p>
    </AuthShell>
  )
}
