"use client"

import { authFetch } from '@/lib/auth-fetch'

export interface GenerateGuideBody {
  studyGuideName: string
  subject: string
  gradeLevel: string
  format: string
  studyRequest?: string
  goal?: string
  sourcePolicy?: 'strict' | 'expand'
  planId?: string
  planUnit?: string
}

/**
 * Generate one guide through the streaming route without showing the stream.
 * Resolves with the new guide's id; rejects with the route's error message.
 */
export async function generateGuide(body: GenerateGuideBody, signal?: AbortSignal): Promise<string> {
  const response = await authFetch('/api/generate-study-guide-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok || !response.body) throw new Error(response.status === 401 ? 'Please sign in again' : 'Could not start generation')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() || ''
    for (const event of events) {
      if (!event.startsWith('data: ')) continue
      const data = JSON.parse(event.slice(6))
      if (data.type === 'error') throw new Error(data.message || 'Generation failed')
      if (data.type === 'complete') {
        const id = String(data.studyGuideUrl || '').split('/').pop()
        if (id) return id
      }
    }
  }
  throw new Error('Generation ended unexpectedly')
}
