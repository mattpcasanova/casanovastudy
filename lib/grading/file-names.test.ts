import { describe, expect, it } from 'vitest'
import { looksLikeOnePerFile, nameFromFileName, studentNameForFile } from './file-names'

describe('nameFromFileName', () => {
  it('reads names', () => {
    expect(nameFromFileName('Mya .pdf')).toBe('Mya')
    expect(nameFromFileName('sean smester.pdf')).toBe('sean smester')
    expect(nameFromFileName('Miller_Sean_P2.pdf')).toBe('Miller Sean')
    expect(nameFromFileName('Mary-Ann Lee (1).jpg')).toBe('Mary Ann Lee')
    expect(nameFromFileName("O'Neil, Sam.HEIC")).toBe("O'Neil, Sam")
    expect(nameFromFileName('Miller,Sean.pdf')).toBe('Miller, Sean')
    expect(nameFromFileName('José Núñez.pdf')).toBe('José Núñez')
  })
  it('rejects camera, scanner and generic names', () => {
    for (const f of ['IMG_1234.HEIC', 'Scan 2026-10-13.pdf', 'Document.pdf', 'Unit 3 test.pdf', 'PXL_20261013.jpg', 'Screenshot 2026.png', 'Period 3 stack.pdf', 'answers.pdf', 'CamScanner 10-13.pdf']) {
      expect(nameFromFileName(f)).toBeNull()
    }
  })
})

describe('looksLikeOnePerFile', () => {
  it('needs 2+ files, mostly named like people', () => {
    expect(looksLikeOnePerFile(['Mya.pdf'])).toBe(false)
    expect(looksLikeOnePerFile(['Mya.pdf', 'Muhammed.pdf', 'sean smester.pdf'])).toBe(true)
    expect(looksLikeOnePerFile(['IMG_1.jpg', 'IMG_2.jpg', 'Mya.pdf'])).toBe(false)
  })
})

describe('studentNameForFile', () => {
  it('uses the roster spelling when it matches', () => {
    const roster = [{ id: 'r1', firstName: 'Sean', lastName: 'Semester' }]
    expect(studentNameForFile('sean smester.pdf', roster)).toBe('Sean Semester')
    expect(studentNameForFile('Mya.pdf', roster)).toBe('Mya')
    expect(studentNameForFile('IMG_1.jpg', roster)).toBeNull()
    expect(studentNameForFile('Kim, Ava.pdf')).toBe('Ava Kim')
  })
})
