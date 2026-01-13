import { createBrowserClient } from '@supabase/ssr'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { CustomGuideContent } from './types/custom-guide'

let supabaseClient: SupabaseClient | null = null

/**
 * Get or create the Supabase client instance.
 * Uses @supabase/ssr createBrowserClient which stores sessions in cookies,
 * making them accessible to server-side API routes.
 */
function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build time on Vercel, if env vars are not set, create a placeholder client
  if (!supabaseUrl || !supabaseAnonKey) {
    const buildUrl = supabaseUrl || 'https://placeholder-build-abcdefghijklmnop.supabase.co'
    const buildKey = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyLWJ1aWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.placeholder-key-for-build-only'

    supabaseClient = createClient(buildUrl, buildKey)
    return supabaseClient
  }

  // Use createBrowserClient from @supabase/ssr which automatically handles
  // cookie-based session storage, making auth available to server-side routes
  supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey) as SupabaseClient
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
