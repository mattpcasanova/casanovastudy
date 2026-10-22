import { describe, expect, it } from 'vitest'
import { isSessionPath, looksLikePhoneToken, orderPicked, phonePageName, phoneUploadPath } from './phone'
import { hashPhoneToken, newPhoneToken } from './phone-server'
import { nameFromFileName } from '@/lib/grading/file-names'

describe('phone links', () => {
  it('makes 32-character url-safe tokens and hashes them', () => {
    const t = newPhoneToken()
    expect(looksLikePhoneToken(t)).toBe(true)
    expect(hashPhoneToken(t)).toMatch(/^[0-9a-f]{64}$/)
    expect(looksLikePhoneToken('short')).toBe(false)
    expect(looksLikePhoneToken('../../etc/passwd-aaaaaaaaaaaaaaaa')).toBe(false)
  })
})

describe('paths and names', () => {
  it('builds paths only for page types and accepts only its own', () => {
    const p = phoneUploadPath('u1', 's1', 2, 6, 'image/jpeg')
    expect(p).toBe('u1/phone/s1/2-007.jpg')
    expect(phoneUploadPath('u1', 's1', 1, 0, 'text/html')).toBeNull()
    expect(isSessionPath(p!, 'u1', 's1', 2)).toBe(true)
    expect(isSessionPath(p!, 'u1', 's1', 1)).toBe(false)
    expect(isSessionPath('u2/phone/s1/2-007.jpg', 'u1', 's1', 2)).toBe(false)
    expect(isSessionPath('u1/phone/s1/2-007.jpg/../../x', 'u1', 's1', 2)).toBe(false)
  })

  it('names pages so they sort in phone order and never look like a student', () => {
    const names = [10, 1, 2].map((i) => phonePageName(1, i, 'image/jpeg'))
    expect([...names].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))).toEqual(['Phone 1-002.jpg', 'Phone 1-003.jpg', 'Phone 1-011.jpg'])
    expect(nameFromFileName(names[0])).toBeNull()
  })
})

describe('orderPicked', () => {
  it('puts camera names in the order they were taken', () => {
    const picked = [{ name: 'IMG_1203.JPG' }, { name: 'IMG_1201.JPG' }, { name: 'IMG_1202.JPG' }]
    expect(orderPicked(picked).map((f) => f.name)).toEqual(['IMG_1201.JPG', 'IMG_1202.JPG', 'IMG_1203.JPG'])
  })
  it('keeps tap order for generic or repeated names', () => {
    const generic = [{ name: 'image.jpg' }, { name: 'image.jpg' }]
    expect(orderPicked(generic)).toBe(generic)
    const mixed = [{ name: 'IMG_2.jpg' }, { name: 'scan.pdf' }]
    expect(orderPicked(mixed)).toBe(mixed)
  })
})
