"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Lock, Loader2, AlertCircle, User, GraduationCap, Calendar } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'

export default function SignUpPage() {
  const router = useRouter()
  const { signUp } = useAuth()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthDate: '',
    userType: '' as '' | 'student' | 'teacher'
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      setError('First name is required')
      return false
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required')
      return false
    }
    if (!formData.email.trim()) {
      setError('Email is required')
      return false
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    if (!formData.userType) {
      setError('Please select whether you are a student or teacher')
      return false
    }
    return true
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) return

    setIsLoading(true)

    try {
      await signUp(
        formData.email,
        formData.password,
        formData.userType as 'student' | 'teacher', // Validated by validateForm()
        formData.firstName,
        formData.lastName,
        formData.birthDate || undefined
      )

      toast({
        title: 'Account created successfully!',
        description: 'Please check your email to confirm your account.',
      })

      // Don't sign in - redirect to confirmation page
      router.push('/auth/check-email')
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
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
          <h1 className="text-3xl font-bold text-gray-900 mt-6">Create Your Account</h1>
          <p className="text-gray-600 mt-2">Join thousands of students achieving their goals</p>
        </div>

        {/* Sign Up Form */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-8">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSignUp} className="space-y-6">
            {/* Name Fields */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-gray-900 font-semibold">
                  First Name *
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-12 text-base bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:bg-white shadow-sm placeholder:text-gray-400 placeholder:italic"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-gray-900 font-semibold">
                  Last Name *
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-12 text-base bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:bg-white shadow-sm placeholder:text-gray-400 placeholder:italic"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-900 font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                disabled={isLoading}
                required
                className="h-12 text-base bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:bg-white shadow-sm placeholder:text-gray-400 placeholder:italic"
              />
            </div>

            {/* Password Fields */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-900 font-semibold flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Password *
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-12 text-base bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:bg-white shadow-sm placeholder:text-gray-400 placeholder:italic"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-900 font-semibold">
                  Confirm Password *
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-12 text-base bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:bg-white shadow-sm placeholder:text-gray-400 placeholder:italic"
                />
              </div>
            </div>

            {/* Birth Date */}
            <div className="space-y-2">
              <Label htmlFor="birthDate" className="text-gray-900 font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Birth Date (Optional)
              </Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => handleChange('birthDate', e.target.value)}
                disabled={isLoading}
                className="h-12 text-base bg-gray-50 border-2 border-gray-300 focus:border-blue-500 focus:bg-white shadow-sm"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* User Type Selection */}
            <div className="space-y-3">
              <Label className="text-gray-900 font-semibold text-base">I am a... *</Label>
              <RadioGroup
                value={formData.userType}
                onValueChange={(value) => handleChange('userType', value)}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <Label
                  htmlFor="student"
                  className={`flex items-center space-x-4 border-2 rounded-xl p-6 cursor-pointer transition-all ${
                    formData.userType === 'student'
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-300 bg-white hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <RadioGroupItem
                    value="student"
                    id="student"
                    className="border-2 border-gray-400 w-5 h-5 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
                  />
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-sm">
                      <User className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-lg mb-1">Student</p>
                      <p className="text-sm text-gray-600 leading-relaxed">Create and study with personalized guides</p>
                    </div>
                  </div>
                </Label>

                <Label
                  htmlFor="teacher"
                  className={`flex items-center space-x-4 border-2 rounded-xl p-6 cursor-pointer transition-all ${
                    formData.userType === 'teacher'
                      ? 'border-green-500 bg-green-50 shadow-md'
                      : 'border-gray-300 bg-white hover:border-green-300 hover:bg-gray-50'
                  }`}
                >
                  <RadioGroupItem
                    value="teacher"
                    id="teacher"
                    className="border-2 border-gray-400 w-5 h-5 data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600"
                  />
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center shadow-sm">
                      <GraduationCap className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-lg mb-1">Teacher</p>
                      <p className="text-sm text-gray-600 leading-relaxed">Create guides and grade student exams</p>
                    </div>
                  </div>
                </Label>
              </RadioGroup>
            </div>

            {/* Sign Up Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Creating your account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Sign In Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-blue-600 hover:text-blue-700 font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          By creating an account, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
