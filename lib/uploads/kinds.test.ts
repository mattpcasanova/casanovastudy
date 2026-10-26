import { describe, expect, it } from 'vitest'
import { jpegInfo, legacyHelp, looksLikeHeic, uploadKind } from './kinds'
import { sniffImageType } from './server-images'

describe('uploadKind', () => {
  it('reads the extension first', () => {
    expect(uploadKind('IMG_1234.HEIC', '')).toBe('heic')
    expect(uploadKind('notes.pdf', 'application/octet-stream')).toBe('pdf')
    expect(uploadKind('photo.jpeg', 'image/jpeg')).toBe('image')
    expect(uploadKind('slides.pptx', '')).toBe('pptx')
    expect(uploadKind('essay.docx', '')).toBe('docx')
    expect(uploadKind('list.md', '')).toBe('text')
    expect(uploadKind('deck.key', '')).toBe('legacy')
    expect(uploadKind('old.ppt', 'application/vnd.ms-powerpoint')).toBe('legacy')
  })
  it('falls back to the MIME type when there is no known extension', () => {
    expect(uploadKind('image', 'image/heic')).toBe('heic')
    expect(uploadKind('blob', 'image/png')).toBe('image')
    expect(uploadKind('scan', 'application/pdf')).toBe('pdf')
    expect(uploadKind('mystery.xyz', '')).toBe('unsupported')
  })
})

describe('looksLikeHeic', () => {
  const box = (brand: string) => new Uint8Array([0, 0, 0, 24, ...'ftyp'.split('').map((c) => c.charCodeAt(0)), ...brand.split('').map((c) => c.charCodeAt(0))])
  it('spots HEIC brands', () => {
    expect(looksLikeHeic(box('heic'))).toBe(true)
    expect(looksLikeHeic(box('mif1'))).toBe(true)
  })
  it('ignores other files', () => {
    expect(looksLikeHeic(box('isom'))).toBe(false) // an MP4
    expect(looksLikeHeic(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(false) // a JPEG
  })
})

describe('legacyHelp', () => {
  it('gives format-specific export steps', () => {
    expect(legacyHelp('Unit 3.key')).toMatch(/Keynote.*Export To > PDF/)
    expect(legacyHelp('old.ppt')).toMatch(/\.pptx/)
  })
})

describe('sniffImageType', () => {
  it('reads real image types from the first bytes', () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe('image/png')
    expect(sniffImageType(new Uint8Array([...'RIFF'].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 0], [...'WEBP'].map((c) => c.charCodeAt(0)))))).toBe('image/webp')
    expect(sniffImageType(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBeNull() // %PDF
  })
})

describe('jpegInfo', () => {
  const seg = (marker: number, body: number[]) => [0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 0xff, ...body]
  const sof = (w: number, h: number) => seg(0xc0, [8, h >> 8, h & 0xff, w >> 8, w & 0xff, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1])
  it('reads the size from the frame header and spots EXIF', () => {
    const plain = new Uint8Array([0xff, 0xd8, ...seg(0xe0, [0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]), ...sof(1568, 2090)])
    expect(jpegInfo(plain)).toEqual({ width: 1568, height: 2090, hasExif: false })
    const exif = new Uint8Array([0xff, 0xd8, ...seg(0xe1, [0x45, 0x78, 0x69, 0x66, 0, 0, 1, 2, 3]), ...sof(4032, 3024)])
    expect(jpegInfo(exif)).toEqual({ width: 4032, height: 3024, hasExif: true })
  })
  it('skips a progressive frame marker the same way and gives up on non-JPEGs', () => {
    expect(jpegInfo(new Uint8Array([0xff, 0xd8, ...sof(10, 20).map((b, k) => (k === 1 ? 0xc2 : b))]))).toEqual({ width: 10, height: 20, hasExif: false })
    expect(jpegInfo(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull()
    expect(jpegInfo(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toBeNull()
  })
})
