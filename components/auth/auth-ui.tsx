"use client"

import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { AlertCircle, Check, Eye, EyeOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { displaySerif } from '@/lib/formats/fonts'
import { fontDisplay } from '@/lib/formats/design'

// ── Layout ──────────────────────────────────────────────────────────────────
// Form column on the left; on wide screens a brand panel on the right shows
// what the app makes. Phones get a slim blue header instead.

export function AuthShell({ children, panel = true }: { children: ReactNode; panel?: boolean }) {
  return (
    <div className={cn(displaySerif.variable, 'min-h-screen bg-white lg:grid', panel && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]')}>
      <div className="flex min-h-screen flex-col">
        <header className="bg-gradient-to-r from-blue-800 via-blue-600 to-cyan-500 px-5 py-4 lg:bg-none lg:px-10 lg:pt-8">
          <Logo />
        </header>
        <main className="flex flex-1 items-start justify-center px-5 py-10 sm:items-center lg:px-10">
          <div className="w-full max-w-[26rem]">{children}</div>
        </main>
        <footer className="px-5 pb-6 text-center text-xs text-slate-400 lg:px-10">
          © {new Date().getFullYear()} Casanova Study
        </footer>
      </div>
      {panel && <BrandPanel />}
    </div>
  )
}

function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white lg:focus-visible:ring-blue-500">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900/80 lg:bg-slate-900">
        <Image src="/images/casanova-study-icon.png" alt="" width={64} height={64} className="h-7 w-auto mix-blend-screen [filter:brightness(1.5)_saturate(1.2)]" />
      </span>
      <span className="text-lg font-bold tracking-tight text-white lg:text-slate-900">Casanova Study</span>
    </Link>
  )
}

function BrandPanel() {
  return (
    <aside aria-hidden className="relative hidden overflow-hidden bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 text-white lg:flex lg:flex-col lg:justify-center">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-[5%] h-96 w-96 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="absolute -bottom-40 left-[5%] h-96 w-[30rem] rounded-full bg-indigo-400/25 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />
      </div>

      <div className="relative mx-auto w-full max-w-lg px-12">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-100">Study smarter</p>
        <h2 className={cn(fontDisplay, 'mt-3 text-5xl font-semibold leading-[1.05] tracking-tight')}>
          Turn anything into a <span className="text-yellow-300">study guide.</span>
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-blue-50">
          Type a topic or upload your notes. Get flashcards, quizzes, practice and timelines built for your class, exam or interview.
        </p>

        <div className="relative mt-12 h-64">
          <div className="absolute left-0 top-0 w-56 -rotate-6 rounded-2xl bg-white/95 p-4 text-slate-800 shadow-2xl shadow-blue-950/30">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-indigo-600">Flashcard</p>
            <p className={cn(fontDisplay, 'mt-2 text-[0.95rem] font-semibold leading-snug')}>What does the mitochondria do?</p>
            <p className="mt-3 text-[0.65rem] text-slate-400">Tap to flip</p>
          </div>
          <div className="absolute right-0 top-4 w-56 rotate-6 rounded-2xl bg-white/95 p-4 text-slate-800 shadow-2xl shadow-blue-950/30">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-purple-600">Quiz</p>
            <div className="mt-2 space-y-1.5 text-xs">
              <div className="rounded-lg border border-slate-200 px-2 py-1.5">A) 1776</div>
              <div className="flex items-center justify-between rounded-lg border-2 border-emerald-400 bg-emerald-50 px-2 py-1.5 font-semibold text-emerald-800">B) 1789 <Check className="h-3.5 w-3.5" /></div>
              <div className="rounded-lg border border-slate-200 px-2 py-1.5">C) 1804</div>
            </div>
          </div>
          <div className="absolute bottom-0 left-16 w-64 rotate-2 rounded-2xl bg-white/95 p-4 text-slate-800 shadow-2xl shadow-blue-950/30">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-fuchsia-600">Timeline</p>
            <div className="relative mt-3 flex justify-between px-1">
              <span className="absolute inset-x-1 top-1/2 h-0.5 -translate-y-1/2 bg-fuchsia-200" />
              {['1789', '1793', '1799', '1804'].map((y, i) => (
                <span key={y} className="relative flex flex-col items-center gap-1">
                  <span className={cn('h-2.5 w-2.5 rounded-full ring-2 ring-white', i === 1 ? 'bg-fuchsia-600' : 'bg-fuchsia-300')} />
                </span>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[0.6rem] font-semibold text-fuchsia-700">
              {['1789', '1793', '1799', '1804'].map((y) => <span key={y}>{y}</span>)}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ── Headings, errors, dividers ─────────────────────────────────────────────

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className={cn(fontDisplay, 'text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl')}>{title}</h1>
      {subtitle && <p className="mt-2 text-slate-600">{subtitle}</p>}
    </div>
  )
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children || (Array.isArray(children) && !children.some(Boolean))) return null
  return (
    <div role="alert" className="mb-5 flex gap-2.5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-inset ring-rose-200">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-slate-400">
      <span className="h-px flex-1 bg-slate-200" />
      {label}
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  )
}

// ── Fields ──────────────────────────────────────────────────────────────────

const inputClass =
  'h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-[0.95rem] text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 disabled:bg-slate-50 disabled:text-slate-500 aria-[invalid=true]:border-rose-400'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: ReactNode
  labelAside?: ReactNode
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, hint, labelAside, id, className, ...props }, ref) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">{label}</label>
        {labelAside}
      </div>
      <input ref={ref} id={inputId} className={inputClass} {...props} />
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  )
})

/** 0-4: length ≥8, ≥12, mixed case, digit or symbol. */
export function passwordScore(pw: string): number {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++
  return pw.length < 6 ? 0 : Math.max(score, 1)
}

const STRENGTH = [
  { label: 'Too short', bar: 'bg-rose-500', text: 'text-rose-600' },
  { label: 'Weak', bar: 'bg-rose-500', text: 'text-rose-600' },
  { label: 'Okay', bar: 'bg-amber-500', text: 'text-amber-700' },
  { label: 'Good', bar: 'bg-emerald-500', text: 'text-emerald-700' },
  { label: 'Strong', bar: 'bg-emerald-600', text: 'text-emerald-700' },
]

export function PasswordField({ label, value, onChange, showStrength = false, labelAside, autoComplete, disabled, id }: {
  label: string
  value: string
  onChange: (v: string) => void
  showStrength?: boolean
  labelAside?: ReactNode
  autoComplete: 'current-password' | 'new-password'
  disabled?: boolean
  id?: string
}) {
  const [visible, setVisible] = useState(false)
  const autoId = useId()
  const inputId = id ?? autoId
  const hintId = `${inputId}-hint`
  const score = passwordScore(value)
  const s = STRENGTH[score]
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">{label}</label>
        {labelAside}
      </div>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          required
          minLength={6}
          aria-describedby={showStrength ? hintId : undefined}
          className={cn(inputClass, 'pr-11')}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-400 transition hover:text-slate-600 focus-visible:text-blue-600 focus-visible:outline-none"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
        </button>
      </div>
      {showStrength && (
        <div id={hintId} className="mt-2" aria-live="polite">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors', value && score >= i ? s.bar : 'bg-slate-200')} />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {value ? <span className={cn('font-medium', s.text)}>{s.label}. </span> : null}
            Use at least 8 characters — a short phrase works well.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Buttons ─────────────────────────────────────────────────────────────────

export function PrimaryButton({ loading, children, loadingText, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; loadingText?: string }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={cn(
        'inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-[0.95rem] font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-70',
        props.className
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {loading && loadingText ? loadingText : children}
    </button>
  )
}

export function cleverLoginUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_CLEVER_CLIENT_ID
  const districtId = process.env.NEXT_PUBLIC_CLEVER_DISTRICT_ID
  const redirectUri = encodeURIComponent(`${window.location.origin}/auth/clever/callback`)
  // Instant login skips Clever's school search when the district is known.
  return districtId
    ? `https://clever.com/oauth/instant-login?client_id=${clientId}&district_id=${districtId}&redirect_uri=${redirectUri}`
    : `https://clever.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`
}

export function ColegiaButton({ disabled, label = 'Continue with Colegia' }: { disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => { window.location.href = cleverLoginUrl() }}
      className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white px-4 text-[0.95rem] font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 disabled:opacity-60"
    >
      <Image src="/images/colegia-logo.png" alt="" width={236} height={100} className="h-6 w-auto" />
      {label}
    </button>
  )
}

// ── Status pages (check email, confirmed, reset done, SSO) ──────────────────

const TONES = {
  blue: 'bg-blue-50 text-blue-600 ring-blue-100',
  green: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  red: 'bg-rose-50 text-rose-600 ring-rose-100',
} as const

export function StatusCard({ icon, tone = 'blue', title, children, actions }: {
  icon: ReactNode
  tone?: keyof typeof TONES
  title: string
  children?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="text-center">
      <div className={cn('mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ring-8', TONES[tone])}>{icon}</div>
      <h1 className={cn(fontDisplay, 'text-3xl font-semibold tracking-tight text-slate-900')}>{title}</h1>
      {children && <div className="mt-3 text-slate-600">{children}</div>}
      {actions && <div className="mt-8 space-y-3">{actions}</div>}
    </div>
  )
}

export function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-[0.95rem] font-semibold text-slate-700 transition hover:bg-slate-50">
      {children}
    </Link>
  )
}

/** Map Supabase auth errors to plain language. */
export function friendlyAuthError(err: unknown, fallback: string): string {
  const raw = typeof err === 'string' ? err : (err as { message?: string })?.message || ''
  const m = raw.toLowerCase()
  if (!raw || raw === '{}' || raw === '[object Object]') return fallback
  if (m.includes('invalid login credentials')) return "That email and password don't match. Check for typos, or reset your password."
  if (m.includes('email not confirmed')) return 'Please confirm your email first — check your inbox for the link we sent.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Please wait a minute and try again.'
  if (m.includes('network') || m.includes('failed to fetch')) return "We couldn't reach the server. Check your connection and try again."
  if (m.includes('password should be at least')) return 'Your password needs at least 6 characters.'
  if (m.includes('same as the old') || m.includes('different from the old')) return 'Choose a password you haven’t used before.'
  return raw
}

/** Only allow in-app relative paths as a post-login destination. */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/auth/')) return '/'
  return next
}
