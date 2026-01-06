import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

/**
 * Create a Supabase client for use in Server Components and Server Actions
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

/**
 * Create a Supabase client for use in API Route Handlers (App Router)
 */
export function createRouteHandlerClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set() {
          // Not needed for API routes - cookies are set client-side
        },
        remove() {
          // Not needed for API routes
        },
      },
    }
  )
}

/**
 * Get the authenticated user from the request
 * Returns null if not authenticated
 */
export async function getAuthenticatedUser(request: NextRequest) {
  const supabase = createRouteHandlerClient(request)
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

/**
 * Create an admin Supabase client using the service role key
 * This bypasses RLS and should only be used for server-side operations
 * where the user has already been verified via other means (e.g., userId from FormData)
 * Falls back to anon key if service role key is not available
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('Missing Supabase URL')
  }

  // Use service role key if available, otherwise fall back to anon key
  const key = serviceRoleKey || anonKey
  if (!key) {
    throw new Error('Missing Supabase credentials')
  }

  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
