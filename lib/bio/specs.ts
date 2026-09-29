// Biology kinds for ```graph fences (shared format: lib/graphs/spec.ts).
//
// kind: punnett    cross: Tt x Tt   dominant: tall   recessive: short
//                  dominance: incomplete   ratios: hide
//                  (dihybrid "RrYy x RrYy"; X-linked "XHXh x XHY")
// kind: pedigree   see lib/bio/pedigree.ts

import { computePunnett, type Dominance, type PunnettResult } from './punnett'
import { layoutPedigree, parsePedigree as parsePedigreeData, type PedigreeData, type PedigreeLayout } from './pedigree'

interface CommonFields { title?: string; caption?: string; xLabel?: string; yLabel?: string; notes: string[] }
type Line = { key: string; value: string; raw: string }

export interface PunnettSpec extends CommonFields { kind: 'punnett'; result: PunnettResult; cross: string; showRatios: boolean }
export interface PedigreeSpec extends CommonFields { kind: 'pedigree'; data: PedigreeData; layout: PedigreeLayout }
export type BioSpec = PunnettSpec | PedigreeSpec

export function parsePunnett(ls: Line[], c: CommonFields, w: string[]): PunnettSpec | string {
  let cross = ''
  let dominance: Dominance = 'complete'
  let dominantName: string | undefined
  let recessiveName: string | undefined
  let showRatios = true
  for (const { key, value, raw } of ls) {
    if (key === 'cross' || key === 'parents') cross = value
    else if (key === 'dominant') dominantName = value.trim()
    else if (key === 'recessive') recessiveName = value.trim()
    else if (key === 'dominance' || key === 'inheritance') dominance = /incomplete|codominan|blend/i.test(value) ? 'incomplete' : 'complete'
    else if (key === 'ratios' || key === 'ratio') showRatios = !/^(off|no|false|hide|hidden)$/i.test(value.trim())
    else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (!cross) return 'A Punnett square needs cross: (e.g. Tt x Tt)'
  const result = computePunnett({ cross, dominance, dominantName, recessiveName })
  if (typeof result === 'string') return result
  if (result.total > 16) return 'Punnett squares support up to two genes'
  return { ...c, kind: 'punnett', result, cross, showRatios }
}

export function parsePedigree(ls: Line[], c: CommonFields, w: string[]): PedigreeSpec | string {
  const data = parsePedigreeData(ls, w)
  if (typeof data === 'string') return data
  const layout = layoutPedigree(data)
  if (typeof layout === 'string') return layout
  return { ...c, kind: 'pedigree', data, layout }
}
