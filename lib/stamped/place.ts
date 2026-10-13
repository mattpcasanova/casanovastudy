"use client"

// Batch grader: find name-stamped pages in a stack and place them. Reads the
// QR codes (read-qr.ts), asks the server who each copy belongs to
// (/api/stamped-tests/resolve), and returns the new page order with a header
// for every stamped page (unstamped pages get undefined and go through the
// usual AI name read).

import { authFetch } from '@/lib/auth-fetch'
import type { PageHeader } from '@/lib/grading/batch'
import { arrangeStamped } from './codes'
import { readStamps } from './read-qr'

interface ResolvedCopy {
  code: string
  title: string | null
  pages: number
  classId: string | null
  className: string | null
  classPeriod: string | null
  rosterId: string | null
  name: string
}

export async function placeStampedPages(images: Blob[], onProgress?: (done: number) => void): Promise<{
  order: number[]
  headers: Array<PageHeader | undefined>
  duplicates: number
}> {
  const reads = await readStamps(images, onProgress)
  const codes = [...new Set(reads.filter(Boolean).map((r) => r!.code))]
  const copies = new Map<string, ResolvedCopy>()
  if (codes.length) {
    const res = await authFetch('/api/stamped-tests/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codes }) })
    if (res.ok) for (const c of ((await res.json()).copies ?? []) as ResolvedCopy[]) copies.set(c.code, c)
  }
  // Codes that aren't this teacher's copies are treated as unstamped.
  const valid = reads.map((r) => (r && copies.has(r.code) ? r : null))
  const { order, starts, duplicates } = arrangeStamped(valid)
  const headers = order.map((i, k): PageHeader | undefined => {
    const r = valid[i]
    if (!r) return undefined
    const c = copies.get(r.code)!
    return {
      name: c.name,
      firstPage: starts[k] === true,
      title: c.title,
      course: c.className,
      period: c.classPeriod,
      stamp: { code: r.code, page: r.page, total: c.pages, rosterId: c.rosterId, classId: c.classId, className: c.className, classPeriod: c.classPeriod },
    }
  })
  return { order, headers, duplicates: duplicates.length }
}
