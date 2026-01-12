import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { CustomGuideContent } from './types/custom-guide'

let supabaseClient: SupabaseClient | null = null

/**
 * Clear corrupted auth data from localStorage before Supabase client tries to use it.
 * This prevents "Invalid Refresh Token" errors from the auto-refresh mechanism.
 */
function clearCorruptedAuthData(supabaseUrl: string): void {
  if (typeof window === 'undefined') return

  try {
    // Supabase stores auth data with key format: sb-<project-ref>-auth-token
    // Extract project ref from URL (e.g., https://abcdef.supabase.co -> abcdef)
    const projectRef = supabaseUrl.replace('https://', '').split('.')[0]
    const authKey = `sb-${projectRef}-auth-token`

    const storedData = localStorage.getItem(authKey)
    if (!storedData) return

    const parsed = JSON.parse(storedData)

    // Check if the stored session is missing critical fields
    // A valid session should have: access_token, refresh_token, user
    if (!parsed?.refresh_token || !parsed?.access_token) {
      console.warn('⚠️ Clearing corrupted auth session from localStorage (missing tokens)')
      localStorage.removeItem(authKey)
    }
  } catch {
    // If we can't parse the stored data, it's corrupted - clear it
    // But we need the key, so we'll let Supabase handle it
  }
}

/**
 * Get or create the Supabase client instance.
 * This function lazily initializes the client to avoid build-time errors
 * when environment variables are not yet available.
 */
function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build time on Vercel, if env vars are not set, create a placeholder client
  // This prevents build failures - actual errors will occur at runtime if env vars are missing
  if (!supabaseUrl || !supabaseAnonKey) {
    // During build, we need to provide valid values to avoid createClient validation errors
    // Using a format that matches Supabase URL structure (project-id.supabase.co)
    const buildUrl = supabaseUrl || 'https://placeholder-build-abcdefghijklmnop.supabase.co'
    // Anon keys are typically JWT-like strings, provide a placeholder that matches the format
    const buildKey = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyLWJ1aWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.placeholder-key-for-build-only'

    supabaseClient = createClient(buildUrl, buildKey)
    return supabaseClient
  }

  // Clear any corrupted auth data before creating the client
  // This prevents auto-refresh from trying to use invalid tokens
  clearCorruptedAuthData(supabaseUrl)

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  })
  return supabaseClient
}

// Export a proxy that lazily creates the client when accessed
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient()
    const value = client[prop as keyof SupabaseClient]
    // If it's a function, bind it to the client
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  }
})

export interface UserProfileRecord {
  id: string
  email: string
  user_type: 'student' | 'teacher'
  first_name?: string
  last_name?: string
  birth_date?: string
  display_name?: string
  bio?: string
  is_profile_public?: boolean
  created_at: string
  updated_at: string
}

export interface StudyGuideRecord {
  id: string
  user_id?: string | null
  title: string
  subject: string
  grade_level: string
  format: 'outline' | 'flashcards' | 'quiz' | 'summary' | 'custom'
  content: string
  topic_focus?: string
  difficulty_level?: string
  additional_instructions?: string
  file_count: number
  token_usage?: {
    input_tokens: number
    output_tokens: number
    total_tokens: number
  }
  is_published?: boolean
  published_at?: string
  custom_content?: CustomGuideContent
  created_at: string
  updated_at: string
}

export interface TeacherFollowRecord {
  id: string
  follower_id: string
  teacher_id: string
  created_at: string
}

export interface GuideProgressRecord {
  id: string
  user_id: string
  study_guide_id: string
  progress_data: {
    completedSections?: string[]
    checklistItems?: Record<string, boolean>
    quizAnswers?: Record<string, string>
  }
  completion_percentage: number
  last_accessed_at: string
  created_at: string
  updated_at: string
}

export interface GradingResultRecord {
  id: string
  student_name: string
  answer_sheet_filename?: string
  student_exam_filename: string
  total_marks: number
  total_possible_marks: number
  percentage: number
  grade: string
  content: string
  grade_breakdown: Array<{
    questionNumber: string
    marksAwarded: number
    marksPossible: number
    explanation: string
  }>
  additional_comments?: string
  pdf_url?: string
  token_usage?: {
    input_tokens: number
    output_tokens: number
    total_tokens: number
  }
  created_at: string
  updated_at: string
}
