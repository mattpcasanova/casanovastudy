import { describe, expect, it } from 'vitest'
import { playerText, playerTextComplete } from './player'

describe('playerText', () => {
  it('has every key in every language', () => {
    expect(playerTextComplete()).toBe(true)
  })
  it('keeps English for English guides and English with Spanish support', () => {
    expect(playerText('en').checkAnswer).toBe('Check answer')
    expect(playerText('en-es').true).toBe('True')
    expect(playerText(null).next).toBe('Next')
    expect(playerText('xx').next).toBe('Next')
  })
  it('switches for the other guide languages', () => {
    expect(playerText('es').true).toBe('Verdadero')
    expect(playerText('pt').checkAnswer).toBe('Verificar resposta')
    expect(playerText('fr').yourAnswer).toBe('Ta réponse')
    expect(playerText('ht').correct).toBe('Kòrèk!')
  })
  it('uses no em dashes', () => {
    for (const lang of ['es', 'pt', 'fr', 'ht']) expect(Object.values(playerText(lang)).join(' ')).not.toContain('—')
  })
})
