import { describe, expect, it } from 'vitest'
import { digestGroups, fingerprint, isNoise, normalizePath, scrubMessage, scrubStack } from './errors'

describe('normalizePath', () => {
  it('drops queries, ids and share codes', () => {
    expect(normalizePath('/study-guide/0f8a1b2c-1111-2222-3333-444455556666/learn?assignment=x')).toBe('/study-guide/:id/learn')
    expect(normalizePath('https://www.casanovastudy.com/practice/ab3kq9zt')).toBe('/practice/:code')
    expect(normalizePath('/teacher/verify?u=1&t=secret')).toBe('/teacher/verify')
    expect(normalizePath('/grade-exam/batch')).toBe('/grade-exam/batch')
    expect(normalizePath(null)).toBe('')
  })
})

describe('scrubbing', () => {
  it('removes emails, tokens and ids from messages', () => {
    const m = scrubMessage('No account for ms.smith@school.org (0f8a1b2c-1111-2222-3333-444455556666) token eyJhbGciOi.eyJzdWIi.sig-1')
    expect(m).not.toContain('school.org')
    expect(m).not.toContain('0f8a1b2c')
    expect(m).toContain('<email>')
    expect(m).toContain('<token>')
  })
  it('removes query strings from stacks', () => {
    expect(scrubStack('at f (https://x.com/_next/chunk.js?dpl=abc:1:2)')).toBe('at f (https://x.com/_next/chunk.js:1:2)')
  })
})

describe('fingerprint', () => {
  it('groups the same bug with different numbers and line numbers', () => {
    const a = fingerprint({ source: 'client', message: 'Cannot read properties of undefined (reading 3)', stack: 'TypeError\n    at render (https://x.com/_next/static/chunks/app-1a2b3c4d5e.js:10:20)' })
    const b = fingerprint({ source: 'client', message: 'Cannot read properties of undefined (reading 7)', stack: 'TypeError\n    at render (https://x.com/_next/static/chunks/app-1a2b3c4d5e.js:11:5)' })
    expect(a).toBe(b)
    expect(fingerprint({ source: 'server', message: 'x' })).not.toBe(fingerprint({ source: 'client', message: 'x' }))
  })
})

describe('isNoise', () => {
  it('skips browser and extension noise', () => {
    expect(isNoise({ message: 'ResizeObserver loop limit exceeded' })).toBe(true)
    expect(isNoise({ message: 'Script error.' })).toBe(true)
    expect(isNoise({ message: 'x', stack: 'at y (chrome-extension://abc/content.js:1:1)' })).toBe(true)
    expect(isNoise({ message: 'TypeError: Failed to fetch' })).toBe(true)
    expect(isNoise({ message: '' })).toBe(true)
    expect(isNoise({ message: "Cannot read properties of null (reading 'map')" })).toBe(false)
  })
})

describe('digestGroups', () => {
  it('groups by fingerprint, counts people, most widespread first', () => {
    const row = (fp: string, user: string | null, at: string, path = '/a') => ({ fingerprint: fp, source: 'client' as const, message: fp, stack: null, path, user_id: user, created_at: at })
    const g = digestGroups([
      row('one', 'u1', '2026-10-20T01:00:00Z'), row('one', 'u1', '2026-10-20T02:00:00Z'), row('one', 'u1', '2026-10-20T03:00:00Z'),
      row('two', 'u1', '2026-10-20T01:00:00Z'), row('two', 'u2', '2026-10-20T05:00:00Z', '/b'),
    ])
    expect(g.map((x) => x.fingerprint)).toEqual(['two', 'one'])
    expect(g[0]).toMatchObject({ count: 2, users: 2, paths: ['/a', '/b'], first: '2026-10-20T01:00:00Z', last: '2026-10-20T05:00:00Z' })
    expect(g[1]).toMatchObject({ count: 3, users: 1 })
  })
})
