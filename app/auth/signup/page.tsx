"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, GraduationCap, Presentation } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import {
  AuthShell, AuthHeading, ColegiaButton, Divider, Field, FormError, PasswordField, PrimaryButton,
  friendlyAuthError,
} from '@/components/auth/auth-ui'

type Role = 'student' | 'teacher'

const ROLES: Array<{ value: Role; title: string; desc: string; icon: typeof GraduationCap }> = [
  { value: 'student', title: 'I’m a student', desc: 'Make study guides, flashcards and practice for your classes and exams.', icon: GraduationCap },
  { value: 'teacher', title: 'I’m a teacher', desc: 'Create guides for your students and grade exams with AI help.', icon: Presentation },
]

export default function SignUpPage() {
  const router = useRouter()
  const { signUp } = useAuth()

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

    setIsLoading(true)
    try {
      await signUp(email.trim(), password, role, firstName.trim(), lastName.trim(), birthDate || undefined)
      // The check-email page offers "resend"; it reads the address from here
      // (kept out of the URL).
      try { sessionStorage.setItem('cs:pending-email', email.trim()) } catch {}
      router.push('/auth/check-email')
    } catch (err) {
      setError(friendlyAuthError(err, 'We couldn’t create your account. Please try again.'))
      setIsLoading(false)
    }
  }

  if (!role) {
    return (
      <AuthShell>
        <AuthHeading title="Create your account" subtitle="Free to use. First, tell us who you are." />
        <div className="space-y-3" role="radiogroup" aria-label="Account type">
          {ROLES.map((r) => {
            const Icon = r.icon
            return (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={false}
                onClick={() => setRole(r.value)}
                className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900">{r.title}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-slate-500">{r.desc}</span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
              </button>
            )
          })}
        </div>

        <Divider label="or" />
        <ColegiaButton label="Sign up with Colegia (school account)" />

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
          labelAside={<span className="text-xs text-slate-400">Optional</span>}
        />
        <PrimaryButton type="submit" loading={isLoading} loadingText="Creating your account…">Create account</PrimaryButton>
      </form>

      <p className="mt-8 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/auth/signin" className="font-semibold text-blue-600 hover:text-blue-700">Sign in</Link>
      </p>
    </AuthShell>
  )
}
