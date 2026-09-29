// Minimal MDL V2000 SDF/MOL parser for PubChem 3D conformers.

import type { Model3DData, Vec3 } from './vsepr'

export function parseSdf(text: string): Model3DData | null {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const countsIdx = lines.findIndex((l) => /V2000\s*$/.test(l))
  if (countsIdx < 0) return null
  const counts = lines[countsIdx]
  const nAtoms = parseInt(counts.slice(0, 3), 10)
  const nBonds = parseInt(counts.slice(3, 6), 10)
  if (!(nAtoms > 0) || nAtoms > 400 || !(nBonds >= 0)) return null
  const atoms: Model3DData['atoms'] = []
  for (let i = 0; i < nAtoms; i++) {
    const l = lines[countsIdx + 1 + i]
    if (!l) return null
    const parts = l.trim().split(/\s+/)
    const pos = parts.slice(0, 3).map(Number) as Vec3
    if (pos.some((v) => !Number.isFinite(v)) || !parts[3]) return null
    atoms.push({ symbol: parts[3], pos })
  }
  const bonds: Model3DData['bonds'] = []
  for (let i = 0; i < nBonds; i++) {
    const l = lines[countsIdx + 1 + nAtoms + i]
    if (!l) break
    const a = parseInt(l.slice(0, 3), 10) - 1
    const b = parseInt(l.slice(3, 6), 10) - 1
    const order = parseInt(l.slice(6, 9), 10)
    if (a >= 0 && b >= 0 && a < nAtoms && b < nAtoms) bonds.push({ a, b, order: order >= 1 && order <= 3 ? order : 1 })
  }
  return { atoms, bonds, lonePairs: [] }
}
