import { describe, expect, it } from 'vitest'
import { isUploadPath, ownsUploadPath, pickUploadRefs, uploadFileName, uploadPath } from './refs'

const USER = '3f2a1c9e-1111-4222-8333-444455556666'

describe('upload paths', () => {
  it('accepts <user>/<kind>/<file> and nothing else', () => {
    expect(isUploadPath(`${USER}/grading-pages/IMG_0001-ab12cd34.jpg`)).toBe(true)
    expect(isUploadPath(`${USER}/grading-pages/`)).toBe(false)
    expect(isUploadPath(`${USER}/IMG_0001.jpg`)).toBe(false)
    expect(isUploadPath(`not-a-uuid/grading-pages/x.jpg`)).toBe(false)
    expect(isUploadPath(`${USER}/grading-pages/../other/x.jpg`)).toBe(false)
    expect(isUploadPath(`https://res.cloudinary.com/x/raw/upload/v1/grading-pages/x.jpg`)).toBe(false)
    expect(isUploadPath(42)).toBe(false)
  })

  it('knows who owns a path', () => {
    const path = `${USER}/guide-images/notes-ab12cd34.jpg`
    expect(ownsUploadPath(path, USER)).toBe(true)
    expect(ownsUploadPath(path, USER.toUpperCase())).toBe(true)
    expect(ownsUploadPath(path, '3f2a1c9e-1111-4222-8333-000000000000')).toBe(false)
  })

  it('makes safe, unique file names', () => {
    expect(uploadFileName('Sean Miller (P2).HEIC', 'r4nd0m12')).toBe('Sean_Miller_P2-r4nd0m12.heic')
    expect(uploadFileName('.jpg', 'r4nd0m12')).toBe('file-r4nd0m12.jpg')
    expect(uploadFileName('é/../x.png', 'r4nd0m12')).toBe('e_x-r4nd0m12.png')
    expect(uploadPath(USER, 'Grading Pages', 'a.jpg')).toMatch(new RegExp(`^${USER}/grading-pages/a-[a-z0-9]+\\.jpg$`))
    expect(isUploadPath(uploadPath(USER, 'grading-pages', 'IMG_0001 (1).jpg'))).toBe(true)
  })

  it('picks well-formed refs from a request body', () => {
    const good = `${USER}/grading-pages/p1-ab12cd34.jpg`
    expect(pickUploadRefs([{ path: good, name: 'page 1' }, { path: 'nope' }, { url: 'https://x' }, null, { path: good }], 10)).toEqual([
      { path: good, name: 'page 1' },
      { path: good, name: 'p1-ab12cd34.jpg' },
    ])
    expect(pickUploadRefs([{ path: good }, { path: good }, { path: good }], 2)).toHaveLength(2)
    expect(pickUploadRefs('x', 5)).toEqual([])
  })
})
