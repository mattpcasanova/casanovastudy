import { createHmac } from 'crypto'
import { describe, expect, it } from 'vitest'
import { inboxAddress, newInboxToken, tokenFromRecipients, usableAttachment, verifyWebhook } from './inbox'

describe('inbox addresses', () => {
  it('round-trips a token through an address', () => {
    const token = newInboxToken()
    expect(token).toMatch(/^[a-z2-9]{10}$/)
    expect(tokenFromRecipients(['Copier <' + inboxAddress(token, 'scan.example.com').toUpperCase() + '>'], 'scan.example.com')).toBe(token)
  })
  it('ignores other domains and addresses', () => {
    expect(tokenFromRecipients(['grade-abc12345@evil.com', 'hello@scan.example.com'], 'scan.example.com')).toBeNull()
  })
})

describe('verifyWebhook', () => {
  const secret = 'whsec_' + Buffer.from('super-secret-key').toString('base64')
  const sign = (id: string, ts: string, body: string) =>
    'v1,' + createHmac('sha256', Buffer.from('super-secret-key')).update(`${id}.${ts}.${body}`).digest('base64')
  const now = 1_800_000_000
  it('accepts a valid signature (among several)', () => {
    const body = '{"type":"email.received"}'
    expect(verifyWebhook(body, { id: 'msg_1', timestamp: String(now), signature: `v1,bogus ${sign('msg_1', String(now), body)}` }, secret, now)).toBe(true)
  })
  it('rejects a changed body, old timestamps and missing headers', () => {
    const sig = sign('msg_1', String(now), '{}')
    expect(verifyWebhook('{"x":1}', { id: 'msg_1', timestamp: String(now), signature: sig }, secret, now)).toBe(false)
    expect(verifyWebhook('{}', { id: 'msg_1', timestamp: String(now), signature: sig }, secret, now + 600)).toBe(false)
    expect(verifyWebhook('{}', { id: null, timestamp: String(now), signature: sig }, secret, now)).toBe(false)
  })
})

describe('usableAttachment', () => {
  it('takes PDFs and photos only', () => {
    expect(usableAttachment('scan001.pdf', 'application/pdf')).toBe(true)
    expect(usableAttachment('IMG_1.HEIC', 'application/octet-stream')).toBe(true)
    expect(usableAttachment('notes.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(false)
  })
})
