"use client"

// "Bring me back here after signing up": a student opening a practice link
// may have to create an account and do the consent step first, which land on
// / or /consent. Kept in localStorage for 2 hours; ReturnToResume sends them on.

const KEY = 'cs:return-to'
const TTL = 2 * 60 * 60 * 1000

export function rememberReturnTo(path: string) {
  try { localStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() })) } catch {}
}

export function takeReturnTo(): string | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    localStorage.removeItem(KEY)
    const { path, at } = JSON.parse(raw) as { path?: string; at?: number }
    return typeof path === 'string' && /^\/(?!\/)/.test(path) && Date.now() - (at ?? 0) < TTL ? path : null
  } catch {
    return null
  }
}

export function hasReturnTo(): boolean {
  try { return !!localStorage.getItem(KEY) } catch { return false }
}
