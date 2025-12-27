"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ConfirmEmailPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        console.log('🔍 Confirming email...')
        console.log('URL:', window.location.href)
        console.log('Hash:', window.location.hash)
        console.log('Search:', window.location.search)

        // Try URL hash first (old method)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')

        console.log('Hash params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type })

        // Try URL params (PKCE flow)
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const error = urlParams.get('error')
        const errorDescription = urlParams.get('error_description')

        console.log('URL params:', { code: !!code, error, errorDescription })

        // Check for errors in URL
        if (error) {
          throw new Error(errorDescription || error)
        }

        // Handle PKCE flow with code
        if (code) {
          console.log('📝 Using PKCE flow with code')
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            console.error('Exchange error:', exchangeError)
            throw exchangeError
          }

          console.log('✅ Session established:', !!data.session)
          setStatus('success')
        }
        // Handle hash-based flow
        else if (type === 'signup' && accessToken && refreshToken) {
          console.log('📝 Using hash-based flow')
          console.log('Setting session with tokens...')

          // The tokens are in the URL, which means Supabase has already verified the email
          // We don't need to manually set the session - just mark as success
          console.log('Email already verified by Supabase (tokens in URL)')
          console.log('Token lengths:', {
            accessToken: accessToken?.length,
            refreshToken: refreshToken?.length
          })

          // Check if session is already established
          const { data: currentSession } = await supabase.auth.getSession()
          console.log('Current session:', {
            hasSession: !!currentSession.session,
            userId: currentSession.session?.user?.id,
            email: currentSession.session?.user?.email
          })

          if (currentSession.session) {
            console.log('✅ Session already established')
            setStatus('success')
          } else {
            // Session not auto-established, mark as success anyway
            // The user will be redirected to home where AuthGate will handle signin
            console.log('⚠️ No session yet, but email is confirmed')
            console.log('User will need to sign in manually')
            setStatus('success')
          }
        } else {
          console.error('❌ No valid confirmation method found')
          throw new Error('Invalid confirmation link. Please check your email and try again.')
        }
      } catch (error: any) {
        console.error('❌ Email confirmation error:', error)
        setStatus('error')
        setErrorMessage(error.message || 'Failed to confirm email')
      }
    }

    // Wait a bit for the URL to be fully available
    const timer = setTimeout(() => {
      confirmEmail()
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  const handleContinue = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <Link href="/">
          <Image
            src="/images/casanova-study-logo.png"
            alt="Casanova Study"
            width={280}
            height={105}
            className="h-20 w-auto mx-auto drop-shadow-lg hover:scale-105 transition-transform cursor-pointer mb-8"
          />
        </Link>

        {/* Status Card */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-10">
          {status === 'loading' && (
            <>
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Confirming Your Email...</h1>
              <p className="text-gray-600">Please wait while we verify your account.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Email Successfully Confirmed!</h1>
              <p className="text-gray-600 text-lg mb-6">
                Your account is now active! Please sign in to start creating study guides.
              </p>
              <Button
                asChild
                className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white mb-4"
              >
                <Link href="/auth/signin">
                  Sign In Now
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full h-12"
              >
                <Link href="/">
                  Go to Home
                </Link>
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Confirmation Failed</h1>
              <p className="text-gray-600 mb-6">{errorMessage}</p>
              <Button
                asChild
                variant="outline"
                className="w-full h-12"
              >
                <Link href="/auth/signin">
                  Back to Sign In
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
