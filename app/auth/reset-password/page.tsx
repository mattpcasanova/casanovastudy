"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isValidLink, setIsValidLink] = useState(true)

  useEffect(() => {
    // Check if we have access token in URL (from email link)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const type = hashParams.get('type')

    // Also check URL params for PKCE flow
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')

    if (!accessToken && !code && type !== 'recovery') {
      // No valid tokens - might be direct navigation
      // Check if user has an active session from the recovery flow
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          setIsValidLink(false)
        }
      })
    }

    // Handle PKCE code exchange
    if (code) {
      supabase.auth.exchangeCodeForSession(code).catch(() => {
        setIsValidLink(false)
      })
    }
  }, [])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess(true)
      toast({
        title: 'Password updated!',
        description: 'Your password has been reset successfully.',
      })

      // Redirect to signin after 2 seconds
      setTimeout(() => {
        router.push('/auth/signin')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isValidLink) {
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
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid or Expired Link</h1>
            <p className="text-gray-600 mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Button asChild className="w-full h-12">
              <Link href="/auth/signin">Back to Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
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
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Password Reset!</h1>
            <p className="text-gray-600 text-lg mb-6">
              Your password has been updated successfully. Redirecting to sign in...
            </p>
            <Button asChild className="w-full h-12">
              <Link href="/auth/signin">Sign In Now</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <Image
              src="/images/casanova-study-logo.png"
              alt="Casanova Study"
              width={280}
              height={105}
              className="h-20 w-auto mx-auto drop-shadow-lg hover:scale-105 transition-transform cursor-pointer"
            />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-6">Reset Your Password</h1>
          <p className="text-gray-600 mt-2">Enter your new password below</p>
        </div>

        {/* Reset Password Form */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-8">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-900 font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4" />
                New Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                className="h-12 text-base bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:bg-white shadow-sm placeholder:text-gray-400 placeholder:italic"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-900 font-semibold">
                Confirm New Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
                className="h-12 text-base bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:bg-white shadow-sm placeholder:text-gray-400 placeholder:italic"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Updating password...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/auth/signin" className="text-blue-600 hover:text-blue-700 font-semibold">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
