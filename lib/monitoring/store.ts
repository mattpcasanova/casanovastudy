// Writes scrubbed errors to app_errors (service role). Throttled per server
// instance so one broken page can't flood the table. See lib/monitoring/errors.ts.

import { createAdminClient } from '@/lib/supabase-server'
import { fingerprint, isNoise, normalizePath, scrubMessage, scrubStack, type ErrorReport } from './errors'

const WINDOW = 10 * 60 * 1000
const PER_FINGERPRINT = 20
const TOTAL = 300
let windowStart = 0
let total = 0
const perFingerprint = new Map<string, number>()

function allow(fp: string): boolean {
  const now = Date.now()
  if (now - windowStart > WINDOW) { windowStart = now; total = 0; perFingerprint.clear() }
  const n = perFingerprint.get(fp) ?? 0
  if (n >= PER_FINGERPRINT || total >= TOTAL) return false
  perFingerprint.set(fp, n + 1)
  total++
  return true
}

export async function recordError(report: ErrorReport, who: { userId?: string | null; userAgent?: string | null } = {}): Promise<boolean> {
  if (isNoise(report)) return false
  const message = scrubMessage(report.message)
  const stack = scrubStack(report.stack)
  const fp = fingerprint({ source: report.source, message, stack })
  if (!allow(fp)) return false
  const { error } = await createAdminClient().from('app_errors').insert({
    fingerprint: fp,
    source: report.source,
    message,
    stack,
    path: normalizePath(report.path) || null,
    digest: report.digest?.slice(0, 64) ?? null,
    user_id: who.userId ?? null,
    user_agent: who.userAgent?.slice(0, 200) ?? null,
  })
  if (error) { console.error('Error log insert failed:', error.message); return false }
  return true
}
