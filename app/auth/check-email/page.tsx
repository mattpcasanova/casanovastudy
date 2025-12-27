"use client"

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Mail, ArrowRight } from 'lucide-react'

export default function CheckEmailPage() {
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

        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-10">
          {/* Mail Icon */}
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="h-10 w-10 text-blue-600" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">Check Your Email!</h1>

          <p className="text-gray-600 text-lg mb-6">
            We've sent a confirmation link to your email address.
          </p>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-8">
            <p className="text-sm text-gray-700">
              <strong>Next steps:</strong>
            </p>
            <ol className="text-sm text-gray-700 mt-2 space-y-1 text-left list-decimal list-inside">
              <li>Open your email inbox</li>
              <li>Click the confirmation link we sent you</li>
              <li>Start creating amazing study guides!</li>
            </ol>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            Didn't receive the email? Check your spam folder or{' '}
            <button className="text-blue-600 hover:text-blue-700 font-semibold underline">
              resend confirmation
            </button>
          </p>

          <Button
            asChild
            variant="outline"
            className="w-full h-12"
          >
            <Link href="/auth/signin">
              Back to Sign In
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
