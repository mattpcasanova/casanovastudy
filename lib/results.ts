"use client"

// Answer log for the weak-spot memory (table study_results, migration 041).
// Answers queue in localStorage first, so nothing is lost offline or when the
// tab closes mid-save, and flush in batches straight to Supabase (owner-only
// RLS). Signed-out answers are dropped: there is no account to remember them.

import { supabase } from '@/lib/supabase'

export type ResultSource = 'quiz' | 'practice' | 'learn' | 'custom'

export interface StudyResult {
  source: ResultSource
  itemId: string
  itemKind: string
  correct: boolean
  topic?: string
  score?: number
}

export interface ResultContext {
  guideId: string
  subject?: string
}

interface QueuedResult {
  study_guide_id: string
  source: ResultSource
  item_id: string
  item_kind: string
  subject: string | null
  topic: string | null
  correct: boolean
  score: number | null
  answered_at: string
}

const QUEUE_KEY = 'cs:results-queue'
const MAX_QUEUE = 1000
const BATCH = 200

function readQueue(): QueuedResult[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') } catch { return [] }
}

function writeQueue(q: QueuedResult[]) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_QUEUE))) } catch {}
}

const clip = (s: string | undefined, n: number) => (s ? s.trim().slice(0, n) || null : null)

let timer: ReturnType<typeof setTimeout> | null = null
let flushing = false

export function recordResult(ctx: ResultContext, r: StudyResult): void {
  if (typeof window === 'undefined' || !ctx.guideId) return
  const subject = ctx.subject && ctx.subject !== 'general' ? ctx.subject : undefined
  writeQueue([...readQueue(), {
    study_guide_id: ctx.guideId,
    source: r.source,
    item_id: r.itemId.slice(0, 200),
    item_kind: r.itemKind,
    subject: clip(subject, 120),
    topic: clip(r.topic, 200),
    correct: r.correct,
    score: typeof r.score === 'number' && Number.isFinite(r.score) ? r.score : null,
    answered_at: new Date().toISOString(),
  }])
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => { void flushResults() }, 1500)
}

/** Sends queued answers. Safe to call any time; keeps the queue on failure. */
export async function flushResults(): Promise<void> {
  if (flushing || typeof window === 'undefined' || !navigator.onLine) return
  const queue = readQueue()
  if (!queue.length) return
  flushing = true
  let more = false
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      writeQueue([]) // signed out: nothing to attach these to
      return
    }
    const batch = queue.slice(0, BATCH)
    const { error } = await supabase
      .from('study_results')
      .insert(batch.map((row) => ({ ...row, user_id: session.user.id })))
    if (error) {
      // A guide deleted since answering fails the FK; retry those rows without it.
      if (error.code === '23503') {
        const { error: retry } = await supabase
          .from('study_results')
          .insert(batch.map((row) => ({ ...row, study_guide_id: null, user_id: session.user.id })))
        if (retry) { console.warn('Could not save results:', retry.message); return }
      } else {
        console.warn('Could not save results:', error.message)
        return
      }
    }
    // Answers recorded while this request was in flight stay queued.
    writeQueue(readQueue().slice(batch.length))
    more = queue.length > BATCH
  } finally {
    flushing = false
  }
  if (more) await flushResults()
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { void flushResults() })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushResults()
  })
  setTimeout(() => { void flushResults() }, 3000) // leftovers from a previous visit
}
