import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface StudyGuideRecord {
  id: string
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
