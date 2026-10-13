import { describe, expect, it } from 'vitest'
import { arrangeStamped, missingPages, newCopyCode, parseQrPayload, qrPayload } from './codes'

describe('QR payloads', () => {
  it('round-trips and rejects anything else', () => {
    const code = newCopyCode()
    expect(code).toMatch(/^[A-Z2-9]{8}$/)
    expect(parseQrPayload(qrPayload(code, 3))).toEqual({ code, page: 3 })
    expect(parseQrPayload('cs1:abcd2345:12')).toEqual({ code: 'ABCD2345', page: 12 })
    expect(parseQrPayload('https://example.com')).toBeNull()
    expect(parseQrPayload(null)).toBeNull()
  })
})

describe('arrangeStamped', () => {
  it('puts each copy together in page order, whatever the scan order', () => {
    const A = 'AAAAAAAA', B = 'BBBBBBBB'
    const scans = [{ code: B, page: 2 }, { code: A, page: 1 }, null, { code: B, page: 1 }, { code: A, page: 2 }, { code: A, page: 2 }]
    expect(arrangeStamped(scans)).toEqual({
      order: [3, 0, 1, 4, 2],
      starts: [true, false, true, false, null],
      duplicates: [5],
    })
  })
})

describe('missingPages', () => {
  it('lists pages that never came back', () => {
    expect(missingPages([1, 2, 4], 4)).toEqual([3])
    expect(missingPages([1, 2], 2)).toEqual([])
  })
})
