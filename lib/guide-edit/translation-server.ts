// Finding and making a guide's translation (service role). Used by "Copy in
// another language" and by assignments that give some students another language.

import type { SupabaseClient } from '@supabase/supabase-js'
import { ClaudeService } from '@/lib/claude-api'
import { GUIDE_LANGUAGES, normalizeLanguage, type GuideLanguage } from '@/lib/study-options'
import { GUIDE_TITLE_MAX } from './pieces'
import { translationLinesUp } from './translation'

export const TRANSLATE_MAX_CHARS = 120_000

export interface GuideRow {
  id: string; user_id: string | null; title: string; format: string; content: string | null; language?: string | null
  subject?: string | null; grade_level?: string | null; topic_focus?: string | null; difficulty_level?: string | null
  additional_instructions?: string | null; file_count?: number | null; standards?: string | null; updated_at?: string | null
}
export interface Translation { id: string; title: string; content: string; language: GuideLanguage }

/** The owner's translation of this guide in that language, if it still matches the original item for item. */
export async function findTranslation(supabase: SupabaseClient, guide: Pick<GuideRow, 'id' | 'user_id' | 'format' | 'content'>, language: GuideLanguage): Promise<Translation | null> {
  if (!guide.user_id) return null
  const { data } = await supabase.from('study_guides').select('id, title, content').eq('translation_of', guide.id).eq('user_id', guide.user_id).eq('language', language).eq('format', guide.format).order('created_at', { ascending: false }).limit(5)
  const hit = (data ?? []).find((t) => translationLinesUp(guide.format, String(guide.content ?? ''), String(t.content ?? '')))
  return hit ? { id: hit.id as string, title: hit.title as string, content: hit.content as string, language } : null
}

/** Writes the translation and saves it as the owner's new guide. Throws when it can't be made to line up (after one retry). */
export async function makeTranslation(supabase: SupabaseClient, guide: GuideRow, to: GuideLanguage): Promise<Translation> {
  const content = String(guide.content ?? '')
  const claude = new ClaudeService()
  const input = { content, format: guide.format, title: guide.title, from: normalizeLanguage(guide.language), to }
  let out = await claude.translateGuide(input)
  let cost = out.usage.cost
  if (!translationLinesUp(guide.format, content, out.text)) {
    out = await claude.translateGuide(input)
    cost += out.usage.cost
    if (!translationLinesUp(guide.format, content, out.text)) throw new Error('Translation did not line up with the original')
  }
  const label = GUIDE_LANGUAGES.find((l) => l.value === to)!.name
  const title = (out.title && out.title.toLowerCase() !== guide.title.toLowerCase() ? out.title : `${guide.title} (${label})`).slice(0, GUIDE_TITLE_MAX)
  const { data: saved, error } = await supabase.from('study_guides').insert({
    title,
    subject: guide.subject,
    grade_level: guide.grade_level,
    format: guide.format,
    content: out.text,
    topic_focus: guide.topic_focus,
    difficulty_level: guide.difficulty_level,
    additional_instructions: guide.additional_instructions,
    file_count: guide.file_count ?? 0,
    language: to,
    standards: guide.standards ?? null,
    // Not copied_from: that sends a student's copy back to an assigned original.
    translation_of: guide.id,
    token_usage: { input_tokens: out.usage.input_tokens, output_tokens: out.usage.output_tokens, total_tokens: out.usage.input_tokens + out.usage.output_tokens, cost },
    user_id: guide.user_id,
  }).select('id').single()
  if (error || !saved) throw error ?? new Error('Save failed')
  return { id: saved.id as string, title, content: out.text, language: to }
}

/**
 * What a student with a language set on their assignment is served: the guide's
 * translation, or null (no language, the guide's own language, or the translation
 * no longer lines up, in which case they get the original).
 */
export async function translationForStudent(supabase: SupabaseClient, assignmentId: string, rosterId: string, guide: Pick<GuideRow, 'id' | 'user_id' | 'format' | 'content' | 'language'>): Promise<Translation | null> {
  const { data: row } = await supabase.from('practice_assignment_students').select('language').eq('assignment_id', assignmentId).eq('roster_id', rosterId).maybeSingle()
  const language = row?.language as string | null | undefined
  if (!language || !GUIDE_LANGUAGES.some((l) => l.value === language) || language === normalizeLanguage(guide.language)) return null
  return findTranslation(supabase, guide, language as GuideLanguage)
}

/**
 * For scoring saved runs: the content each student with a language set actually
 * answered, keyed `${guideId}|${userId}`. Quiz and practice answers are saved as
 * the option's text, so they must be checked against the version the student saw.
 * Usually empty (one small query).
 */
export async function translatedContentByStudent(supabase: SupabaseClient, assignmentIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (!assignmentIds.length) return out
  const { data: rows } = await supabase.from('practice_assignment_students').select('assignment_id, language, class_roster(student_user_id)').in('assignment_id', assignmentIds).not('language', 'is', null)
  if (!rows?.length) return out
  const { data: assignments } = await supabase.from('practice_assignments').select('id, study_guide_id').in('id', [...new Set(rows.map((r) => r.assignment_id as string))])
  const guideOf = new Map((assignments ?? []).map((a) => [a.id as string, a.study_guide_id as string]))
  const { data: guides } = await supabase.from('study_guides').select('id, user_id, format, content, language').in('id', [...new Set(guideOf.values())])
  const found = new Map<string, Translation | null>()
  for (const r of rows) {
    const userId = ((Array.isArray(r.class_roster) ? r.class_roster[0] : r.class_roster) as { student_user_id: string | null } | null)?.student_user_id
    const guide = (guides ?? []).find((g) => g.id === guideOf.get(r.assignment_id as string))
    const language = r.language as string
    if (!userId || !guide || !GUIDE_LANGUAGES.some((l) => l.value === language) || language === normalizeLanguage(guide.language)) continue
    const key = `${guide.id}|${language}`
    if (!found.has(key)) found.set(key, await findTranslation(supabase, guide, language as GuideLanguage))
    const t = found.get(key)
    if (t) out.set(`${guide.id}|${userId}`, t.content)
  }
  return out
}

/** The language a teacher set for this student on an assignment of this guide (so Explain answers in it), or null. */
export async function assignedLanguage(supabase: SupabaseClient, userId: string, guideId: string): Promise<GuideLanguage | null> {
  const { data } = await supabase
    .from('practice_assignment_students')
    .select('language, class_roster!inner(student_user_id), practice_assignments!inner(study_guide_id)')
    .eq('class_roster.student_user_id', userId)
    .eq('practice_assignments.study_guide_id', guideId)
    .not('language', 'is', null)
    .limit(1)
  const language = data?.[0]?.language as string | undefined
  return language && GUIDE_LANGUAGES.some((l) => l.value === language) ? (language as GuideLanguage) : null
}
