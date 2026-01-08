"use client"

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from './supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export interface User {
  id: string
  email: string
  user_type: 'student' | 'teacher'
  first_name?: string
  last_name?: string
  birth_date?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  signUp: (
    email: string,
    password: string,
    userType: 'student' | 'teacher',
    firstName: string,
    lastName: string,
    birthDate?: string
  ) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const isSigningOutRef = useRef(false)
  const isFetchingProfileRef = useRef(false)
  const currentUserIdRef = useRef<string | null>(null)

  // Fetch user profile data with timeout and concurrency protection
  const fetchUserProfile = async (supabaseUser: SupabaseUser, skipIfLoaded: boolean = false): Promise<User | null> => {
    // Skip if we already have this user loaded (prevents redundant fetches)
    if (skipIfLoaded && currentUserIdRef.current === supabaseUser.id) {
      console.log('📋 User already loaded, skipping profile fetch')
      return null
    }

    // Prevent concurrent fetches (causes timeouts in local dev)
    if (isFetchingProfileRef.current) {
      console.log('⏳ Profile fetch already in progress, skipping duplicate')
      return null
    }

    isFetchingProfileRef.current = true
    console.log('🔍 Fetching profile for user ID:', supabaseUser.id)

    try {
      // Add timeout to prevent hanging forever
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      })

      const fetchPromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single()

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any

      if (error) {
        console.error('❌ Error fetching user profile:', error.message || error)
        return null
      }

      if (!data) {
        console.warn('⚠️ No profile data returned')
        return null
      }

      console.log('✅ Profile data found:', data.email)

      const userProfile: User = {
        id: data.id,
        email: data.email,
        user_type: data.user_type,
        first_name: data.first_name,
        last_name: data.last_name,
        birth_date: data.birth_date
      }

      // Track that we've loaded this user
      currentUserIdRef.current = userProfile.id

      return userProfile
    } catch (error: any) {
      console.error('❌ Profile fetch error:', error.message || error)
      return null
    } finally {
      isFetchingProfileRef.current = false
    }
  }

  useEffect(() => {
    let isMounted = true
    let isInitialized = false

    // Initialize auth state from existing session
    const initializeAuth = async () => {
      try {
        console.log('📱 Initializing auth...')
        const { data: { session } } = await supabase.auth.getSession()

        if (!isMounted) return

        if (session?.user) {
          console.log('✅ Session found for user:', session.user.id)
          const userProfile = await fetchUserProfile(session.user)

          if (!isMounted) return

          if (userProfile) {
            setUser(userProfile)
            console.log('✅ User restored from session')
          } else {
            console.warn('⚠️ Session exists but no profile found')
          }
        } else {
          console.log('📱 No existing session')
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
          isInitialized = true
        }
      }
    }

    initializeAuth()

    // Listen for auth state changes AFTER initialization (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip all events during initialization - initializeAuth handles the initial state
      if (!isInitialized) {
        console.log('🔐 Skipping auth event during init:', event)
        return
      }

      console.log('🔐 Auth state changed:', event, '| isSigningOut:', isSigningOutRef.current)

      // Skip all profile fetches if we're signing out
      if (isSigningOutRef.current) {
        console.log('🔐 Skipping auth event during sign out')
        return
      }

      // Handle sign out and no-session events immediately
      if (event === 'SIGNED_OUT' || !session?.user) {
        if (isMounted) {
          setUser(null)
          currentUserIdRef.current = null
        }
        return
      }

      // Only fetch profile for events that actually need it
      const shouldFetchProfile =
        event === 'SIGNED_IN' ||
        event === 'USER_UPDATED' ||
        event === 'TOKEN_REFRESHED'

      if (shouldFetchProfile && session?.user) {
        // Pass skipIfLoaded=true to prevent redundant fetches for already-loaded users
        // This fixes stale closure issue where `user` state is always null in this callback
        const userProfile = await fetchUserProfile(session.user, true)
        if (userProfile && isMounted) {
          setUser(userProfile)
        }
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string, rememberMe: boolean = true) => {
    console.log('🔐 Starting sign in...')
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('❌ Sign in error:', error)
      throw error
    }

    console.log('✅ Authentication successful')

    // Note: Supabase automatically persists sessions to localStorage by default.
    // The "remember me" parameter is kept for future use if we need to implement
    // session-only storage (sessionStorage) for users who don't check "remember me".
    // For now, all sessions persist across browser sessions.

    if (data.user) {
      console.log('👤 Fetching user profile for:', data.user.id)
      const userProfile = await fetchUserProfile(data.user)
      console.log('📋 User profile fetched:', userProfile)

      if (!userProfile) {
        console.error('⚠️ No user profile found - profile may not have been created during signup')
        throw new Error('User profile not found. Please contact support.')
      }

      setUser(userProfile)
      console.log('✅ Sign in complete')
    }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) throw error
  }

  const signUp = async (
    email: string,
    password: string,
    userType: 'student' | 'teacher',
    firstName: string,
    lastName: string,
    birthDate?: string
  ) => {
    console.log('🔐 Starting sign up...')

    // Sign up the user with email confirmation required
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      }
    })

    if (error) throw error
    if (!data.user) throw new Error('Failed to create user')

    console.log('✅ User created in auth.users:', data.user.id)

    // Create user profile with exponential backoff retry logic
    // Try immediately first, then retry with increasing delays if needed
    const delays = [0, 100, 250, 500] // Exponential backoff: 0ms, 100ms, 250ms, 500ms
    let profileError: any = null

    for (let i = 0; i < delays.length; i++) {
      // Wait for the specified delay (0ms on first attempt)
      if (delays[i] > 0) {
        console.log(`⏳ Waiting ${delays[i]}ms before retry ${i}...`)
        await new Promise(resolve => setTimeout(resolve, delays[i]))
      }

      console.log(`📝 Attempting to create profile (attempt ${i + 1}/${delays.length})...`)
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          user_type: userType,
          first_name: firstName,
          last_name: lastName,
          birth_date: birthDate
        })

      if (!error) {
        console.log('✅ Profile created successfully')
        profileError = null
        break
      }

      profileError = error

      // If it's a foreign key constraint error, retry (unless this was the last attempt)
      if (error.message?.includes('foreign key constraint') || error.message?.includes('violates')) {
        console.log(`⚠️ Foreign key error: ${error.message}`)
        if (i < delays.length - 1) {
          console.log('🔄 Will retry...')
        }
      } else {
        // Other errors, don't retry
        console.error('❌ Non-retryable error:', error)
        break
      }
    }

    if (profileError) {
      console.error('❌ Failed to create user profile after all retries:', profileError)
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }

    console.log('✅ Sign up complete')
    // Don't set user state - they need to confirm email first
  }

  const signOut = async () => {
    isSigningOutRef.current = true
    setUser(null) // Clear user immediately to prevent stale state
    currentUserIdRef.current = null // Reset so next sign-in fetches profile
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } finally {
      isSigningOutRef.current = false
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
