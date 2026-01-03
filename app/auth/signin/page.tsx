"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'

export default function SignInPage() {
  const router = useRouter()
  const { signIn, resetPassword } = useAuth()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await signIn(email, password, rememberMe)
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first')
      return
    }

    setIsLoading(true)
    try {
      await resetPassword(email)
      toast({
        title: 'Password reset email sent',
        description: 'Check your inbox for instructions to reset your password.',
      })
      setShowForgotPassword(false)
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email')
    } finally {
      setIsLoading(false)
    }
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
              width={350}
              height={131}
              className="h-24 md:h-28 w-auto mx-auto drop-shadow-lg hover:scale-105 transition-transform cursor-pointer"
            />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-6">Welcome Back!</h1>
          <p className="text-gray-600 mt-2">Sign in to continue studying</p>
        </div>

        {/* Sign In Form */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-8">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSignIn} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-900 font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                className="h-12 text-base bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:bg-white shadow-sm placeholder:text-gray-400 placeholder:italic"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-900 font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                className="h-12 text-base bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:bg-white shadow-sm placeholder:text-gray-400 placeholder:italic"
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  disabled={isLoading}
                />
                <Label
                  htmlFor="remember"
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Keep me logged in
                </Label>
              </div>

              <Button
                type="button"
                variant="link"
                onClick={handleForgotPassword}
                disabled={isLoading}
                className="text-sm text-blue-600 hover:text-blue-700 p-0 h-auto"
              >
                Forgot password?
              </Button>
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Clever SSO Login */}
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={() => {
              // Redirect to Clever OAuth with optional district_id for instant login
              const cleverClientId = process.env.NEXT_PUBLIC_CLEVER_CLIENT_ID
              const cleverDistrictId = process.env.NEXT_PUBLIC_CLEVER_DISTRICT_ID
              const redirectUri = `${window.location.origin}/auth/clever/callback`

              // Use instant-login if district ID is configured, otherwise use standard OAuth
              const cleverAuthUrl = cleverDistrictId
                ? `https://clever.com/oauth/instant-login?client_id=${cleverClientId}&district_id=${cleverDistrictId}&redirect_uri=${encodeURIComponent(redirectUri)}`
                : `https://clever.com/oauth/authorize?response_type=code&client_id=${cleverClientId}&redirect_uri=${encodeURIComponent(redirectUri)}`

              window.location.href = cleverAuthUrl
            }}
            className="w-full h-12 text-base font-semibold border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 text-blue-700"
          >
            <Image
              src="/images/colegia-logo.png"
              alt="Colegia"
              width={32}
              height={32}
              className="h-10 w-10 mr-2 object-contain"
            />
            Log in with Colegia
          </Button>

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">Don't have an account?</p>
            <Button
              asChild
              variant="outline"
              className="w-full h-12 text-base font-semibold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-400"
            >
              <Link href="/auth/signup">
                Sign up here
              </Link>
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
