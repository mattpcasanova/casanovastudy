// Browser side of the error log: send an error to /api/errors (scrubbed and
// grouped on the server). At most 10 reports per page load, each message once.
import { authFetch } from '@/lib/auth-fetch'

const sent = new Set<string>()

export function reportError(error: unknown, extra: { digest?: string } = {}): void {
  if (typeof window === 'undefined') return
  const e = error instanceof Error ? error : new Error(typeof error === 'string' ? error : JSON.stringify(error ?? 'Unknown error').slice(0, 300))
  const message = `${e.name && e.name !== 'Error' ? `${e.name}: ` : ''}${e.message}`
  if (sent.size >= 10 || sent.has(message)) return
  sent.add(message)
  const body = JSON.stringify({ message, stack: e.stack ?? null, path: window.location.pathname, digest: (e as Error & { digest?: string }).digest ?? extra.digest ?? null })
  void authFetch('/api/errors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
}
