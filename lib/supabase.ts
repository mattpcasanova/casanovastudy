import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

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

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
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
  created_at: string
  updated_at: string
}

export interface StudyGuideRecord {
  id: string
  user_id?: string | null
  title: string
  subject: string
  grade_level: string
  format: 'outline' | 'flashcards' | 'quiz' | 'summary'
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
