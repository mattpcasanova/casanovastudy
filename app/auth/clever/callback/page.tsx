"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CleverCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const errorParam = searchParams.get('error')

      if (errorParam) {
        setStatus('error')
        setError(errorParam === 'access_denied'
          ? 'Access was denied. Please try again or use email/password login.'
          : `Authentication failed: ${errorParam}`)
        return
      }

      if (!code) {
        setStatus('error')
        setError('No authorization code received from Clever.')
        return
      }

      try {
        // Exchange code for user info via our API
        const response = await fetch('/api/auth/clever', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to authenticate with Clever')
        }

        setStatus('success')

        // If we got a magic link, redirect to it to complete sign-in
        if (data.magicLink) {
          window.location.href = data.magicLink
          return
        }

        // Otherwise redirect to home
        setTimeout(() => {
          router.push('/')
        }, 1500)

      } catch (err: any) {
        setStatus('error')
        setError(err.message || 'An error occurred during authentication')
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <Link href="/">
          <Image
            src="/images/casanova-study-logo.png"
            alt="Casanova Study"
            width={280}
            height={105}
            className="h-20 w-auto mx-auto drop-shadow-lg hover:scale-105 transition-transform cursor-pointer mb-8"
          />
        </Link>

        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-10">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Signing you in...</h1>
              <p className="text-gray-600">Authenticating with your school account</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h1>
              <p className="text-gray-600">Redirecting to your dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Failed</h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button asChild className="w-full h-12">
                <Link href="/auth/signin">Back to Sign In</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
