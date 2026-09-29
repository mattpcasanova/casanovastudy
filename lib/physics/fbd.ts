// Free-body diagrams: an object, the surface it's on, and labeled force
// arrows at the right angles. Pure and unit-tested; drawn by FreeBodyFigure.
//
// kind: free-body
// object: box | dot | ball          (default box)
// surface: flat | incline 30 | none (incline angle in degrees, rising to the right)
// force: W | down | 49 N            (name | direction | optional magnitude)
// force: N | normal
// force: f | up-slope
// force: T | 35                     (degrees counterclockwise from +x)
// scale: off                        (arrows proportional to magnitudes when all are numbers; off = equal)
// axes: tilted                      (dashed axes along/perpendicular to the incline)
//
// Directions: up, down, left, right, normal (out of the surface),
// into-surface, up-slope, down-slope, or an angle in degrees.

export interface Force { name: string; angle: number; magnitude?: string; value?: number }
export interface FreeBodyData {
  object: 'box' | 'dot' | 'ball'
  surface: { kind: 'flat' | 'incline' | 'none'; angle: number }
  forces: Force[]
  proportional: boolean
  tiltedAxes: boolean
}

const WORDS: Record<string, (theta: number) => number> = {
  up: () => 90, down: () => 270, left: () => 180, right: () => 0,
  'up-right': () => 45, 'up-left': () => 135, 'down-left': () => 225, 'down-right': () => 315,
  normal: (t) => 90 + t, perpendicular: (t) => 90 + t, 'into-surface': (t) => 270 + t,
  'up-slope': (t) => t, 'up-the-slope': (t) => t, 'up-incline': (t) => t, 'along-slope': (t) => t,
  'down-slope': (t) => 180 + t, 'down-the-slope': (t) => 180 + t, 'down-incline': (t) => 180 + t,
}

export function directionAngle(dir: string, theta: number): number | null {
  const k = dir.trim().toLowerCase().replace(/\s+/g, '-').replace(/°$/, '')
  if (WORDS[k]) return ((WORDS[k](theta) % 360) + 360) % 360
  const n = Number(k.replace(/deg(rees)?$/, ''))
  return Number.isFinite(n) ? ((n % 360) + 360) % 360 : null
}

export function parseFreeBody(lines: { key: string; value: string; raw: string }[], w: string[]): FreeBodyData | string {
  const d: FreeBodyData = { object: 'box', surface: { kind: 'flat', angle: 0 }, forces: [], proportional: true, tiltedAxes: false }
  const pending: { name: string; dir: string; magnitude?: string; raw: string }[] = []
  for (const { key, value, raw } of lines) {
    if (key === 'object' || key === 'body') {
      const v = value.toLowerCase()
      d.object = /dot|point|particle/.test(v) ? 'dot' : /ball|sphere|circle/.test(v) ? 'ball' : 'box'
    } else if (key === 'surface' || key === 'ground') {
      const v = value.toLowerCase()
      const m = v.match(/incline|ramp|slope/)
      if (m) {
        const a = Number(v.match(/-?\d+(\.\d+)?/)?.[0] ?? 30)
        d.surface = { kind: 'incline', angle: Math.max(5, Math.min(75, a)) }
      } else d.surface = { kind: /none|air|space|hanging/.test(v) ? 'none' : 'flat', angle: 0 }
    } else if (key === 'force') {
      const [name, dir, ...mag] = value.split('|').map((p) => p.trim())
      if (!name || !dir) { w.push(`Bad force "${raw}"`); continue }
      pending.push({ name, dir, magnitude: mag.join(' | ') || undefined, raw })
    } else if (key === 'scale') d.proportional = !/^(off|no|false|equal)$/i.test(value.trim())
    else if (key === 'axes') d.tiltedAxes = /tilt|rotat|incline|slope/i.test(value)
    else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  for (const f of pending) {
    const angle = directionAngle(f.dir, d.surface.angle)
    if (angle === null) { w.push(`Bad direction "${f.raw}"`); continue }
    const value = f.magnitude ? parseFloat(f.magnitude.replace(/[^\d.\-eE]/g, ' ').trim().split(/\s+/)[0]) : NaN
    d.forces.push({ name: f.name, angle, magnitude: f.magnitude, value: Number.isFinite(value) && value > 0 ? value : undefined })
  }
  if (!d.forces.length) return 'A free-body diagram needs at least one force:'
  if (d.forces.length > 8) d.forces = d.forces.slice(0, 8)
  if (!d.forces.every((f) => f.value !== undefined)) d.proportional = false
  return d
}

/** Arrow lengths in px: proportional to magnitude (30-95px) or all equal. */
export function arrowLengths(d: FreeBodyData): number[] {
  if (!d.proportional) return d.forces.map(() => 72)
  const max = Math.max(...d.forces.map((f) => f.value!))
  return d.forces.map((f) => Math.max(30, (f.value! / max) * 95))
}
