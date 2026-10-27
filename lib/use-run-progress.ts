"use client"

// Saves a quiz or practice run as it goes, so leaving the page doesn't lose it.
// Same idea as adaptive practice: the browser copy restores instantly, the
// account copy (study_progress) follows the student to another device and wins
// when it's newer, as long as they haven't answered anything here yet.

import { useCallback, useEffect, useRef, useState } from 'react'
import { loadProgress, saveProgress } from '@/lib/progress'
import { parseSaved, stableJson, type SavedRun } from '@/lib/run-progress-rules'

const storageKey = (kind: string, id: string) => `cs:${kind}:${id}`

function readLocal(kind: string, id: string): SavedRun<unknown> | null {
  try { return parseSaved(JSON.parse(localStorage.getItem(storageKey(kind, id)) || 'null')) } catch { return null }
}

/**
 * `restored` is the run to put back on screen (a new object each time one is
 * found). Call `save(run)` whenever the run changes and `clear()` when it ends
 * or starts over. Without a guide id (inline blocks) everything is a no-op.
 */
export function useRunProgress<T>(guideId: string | undefined, kind: 'quiz' | 'practice', clean: (raw: unknown) => T | null) {
  const [restored, setRestored] = useState<T | null>(null)
  const cleanRef = useRef(clean)
  cleanRef.current = clean
  const updatedAt = useRef(0)
  const lastJson = useRef<string | null>(null) // what's saved now, so re-saving a restored run is skipped
  const touched = useRef(false) // they changed something here: an older-looking account copy can't replace it
  const pending = useRef<SavedRun<T> | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const put = useCallback((run: T | null) => {
    if (!run) { lastJson.current = null; setRestored(null); return }
    lastJson.current = stableJson(run)
    setRestored(run)
  }, [])

  useEffect(() => {
    if (!guideId) return
    const local = readLocal(kind, guideId)
    updatedAt.current = local?.updatedAt ?? 0
    put(local?.run != null ? cleanRef.current(local.run) : null)
    let alive = true
    void loadProgress<unknown>(guideId, kind).then((raw) => {
      const remote = parseSaved(raw)
      if (!alive || !remote || remote.updatedAt <= updatedAt.current || touched.current) return
      updatedAt.current = remote.updatedAt
      try { localStorage.setItem(storageKey(kind, guideId), JSON.stringify(remote)) } catch {}
      put(remote.run != null ? cleanRef.current(remote.run) : null)
    })
    return () => { alive = false }
  }, [guideId, kind, put])

  const flush = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    const value = pending.current
    pending.current = null
    if (value && guideId) void saveProgress(guideId, kind, value)
  }, [guideId, kind])

  const write = useCallback((run: T | null) => {
    if (!guideId) return
    touched.current = true
    updatedAt.current = Date.now()
    const value: SavedRun<T> = { run, updatedAt: updatedAt.current }
    try { localStorage.setItem(storageKey(kind, guideId), JSON.stringify(value)) } catch {}
    pending.current = value
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, 1000)
  }, [guideId, kind, flush])

  const save = useCallback((run: T) => {
    const json = stableJson(run)
    if (json === lastJson.current) return
    lastJson.current = json
    write(run)
  }, [write])

  const clear = useCallback(() => {
    if (lastJson.current === null && !touched.current && updatedAt.current === 0) return // nothing was ever saved
    lastJson.current = null
    write(null)
  }, [write])

  // Leaving (closing the laptop, switching apps, closing the tab): send it now, not in a second.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [flush])

  return { restored, save, clear }
}
