"use client"

// Free-body diagrams (spec: lib/physics/fbd.ts): the object, its surface
// (flat, incline or none) and labeled force arrows drawn from the object's
// center at the exact angles, proportional to magnitude when all are known.

import { useId, type ReactNode } from 'react'
import { arrowLengths, type FreeBodyData } from '@/lib/physics/fbd'

const INK = '#1e293b'
const COLORS = ['#2563eb', '#e11d48', '#059669', '#7c3aed', '#d97706', '#0891b2', '#db2777', '#4b5563']

/** "F_g" → F with subscript g; "F_{net}" → F with subscript net. */
function ForceName({ name }: { name: string }) {
  const m = name.match(/^([^_]+)_\{?([^}]+)\}?(.*)$/)
  if (!m) return <>{name}</>
  return <>{m[1]}<tspan baselineShift="sub" fontSize="0.72em">{m[2]}</tspan>{m[3]}</>
}

export function FreeBodyFigure({ data }: { data: FreeBodyData }) {
  const id = useId().replace(/:/g, '')
  const lengths = arrowLengths(data)
  const deg = Math.PI / 180
  const theta = data.surface.kind === 'incline' ? data.surface.angle : 0
  const BOX_W = 50, BOX_H = 34

  // Surface geometry (screen coordinates, y down), then the object's center.
  let center: [number, number] = [0, 0]
  let surface: ReactNode = null
  const pts: [number, number][] = []
  if (data.surface.kind === 'incline') {
    const t = Math.tan(theta * deg)
    const L = Math.min(300, 190 / t)
    const A: [number, number] = [-L / 2, 0], B: [number, number] = [L / 2, 0], C: [number, number] = [L / 2, -L * t]
    const M: [number, number] = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2]
    const nx = -Math.sin(theta * deg), ny = -Math.cos(theta * deg)
    const lift = data.object === 'box' ? BOX_H / 2 + 1 : data.object === 'ball' ? 19 : 5
    center = [M[0] + nx * lift, M[1] + ny * lift]
    pts.push(A, B, C)
    const r = 34
    surface = (
      <g>
        <polygon points={`${A.join(',')} ${B.join(',')} ${C.join(',')}`} fill="#f1f5f9" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
        <path d={`M${A[0] + r},${A[1]} A${r},${r} 0 0 0 ${A[0] + r * Math.cos(theta * deg)},${A[1] - r * Math.sin(theta * deg)}`} fill="none" stroke={INK} strokeWidth={1.2} />
        <text x={A[0] + r + 8} y={A[1] - 7} fontSize={12} fill={INK} style={{ fontFamily: 'inherit' }}>{theta}°</text>
      </g>
    )
  } else if (data.surface.kind === 'flat') {
    const lift = data.object === 'box' ? BOX_H / 2 : data.object === 'ball' ? 18 : 5
    center = [0, -lift]
    pts.push([-120, 0], [120, 8])
    surface = (
      <g stroke={INK}>
        <line x1={-120} x2={120} y1={0} y2={0} strokeWidth={1.8} />
        {Array.from({ length: 12 }, (_, i) => <line key={i} x1={-114 + i * 20} y1={1} x2={-122 + i * 20} y2={9} strokeWidth={1} />)}
      </g>
    )
  }

  const arrows = data.forces.map((f, i) => {
    const a = f.angle * deg
    const [cx, cy] = center
    const tip: [number, number] = [cx + Math.cos(a) * lengths[i], cy - Math.sin(a) * lengths[i]]
    const lab: [number, number] = [cx + Math.cos(a) * (lengths[i] + 16), cy - Math.sin(a) * (lengths[i] + 16)]
    pts.push(tip, [lab[0] - 30, lab[1] - 10], [lab[0] + 30, lab[1] + 10])
    return { f, tip, lab, color: COLORS[i % COLORS.length], i }
  })
  pts.push([center[0] - 40, center[1] - 40], [center[0] + 40, center[1] + 40])
  const minX = Math.min(...pts.map((p) => p[0])) - 14, maxX = Math.max(...pts.map((p) => p[0])) + 14
  const minY = Math.min(...pts.map((p) => p[1])) - 14, maxY = Math.max(...pts.map((p) => p[1])) + 14

  return (
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className="mx-auto block h-auto w-full" style={{ maxWidth: 440 }} role="img" aria-label="Free-body diagram">
      <defs>
        {arrows.map((a) => (
          <marker key={a.i} id={`${id}-m${a.i}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto">
            <path d="M0,0.5 L10,5 L0,9.5 z" fill={a.color} />
          </marker>
        ))}
      </defs>
      {surface}
      {data.tiltedAxes && (
        <g stroke="#94a3b8" strokeDasharray="5 4" strokeWidth={1.2}>
          {[theta, theta + 90].map((ang, k) => {
            const a = ang * deg
            return (
              <g key={k}>
                <line x1={center[0] - Math.cos(a) * 110} y1={center[1] + Math.sin(a) * 110} x2={center[0] + Math.cos(a) * 110} y2={center[1] - Math.sin(a) * 110} />
                <text x={center[0] + Math.cos(a) * 118} y={center[1] - Math.sin(a) * 118} fontSize={12} fill="#64748b" stroke="none" textAnchor="middle" dominantBaseline="central">{k === 0 ? 'x' : 'y'}</text>
              </g>
            )
          })}
        </g>
      )}
      {data.object === 'box' && (
        <rect x={center[0] - BOX_W / 2} y={center[1] - BOX_H / 2} width={BOX_W} height={BOX_H} rx={3} fill="#e2e8f0" stroke={INK} strokeWidth={1.6} transform={`rotate(${-theta} ${center[0]} ${center[1]})`} />
      )}
      {data.object === 'ball' && <circle cx={center[0]} cy={center[1]} r={18} fill="#e2e8f0" stroke={INK} strokeWidth={1.6} />}
      {arrows.map(({ f, tip, lab, color, i }) => (
        <g key={i}>
          <line x1={center[0]} y1={center[1]} x2={tip[0]} y2={tip[1]} stroke={color} strokeWidth={2.8} strokeLinecap="round" markerEnd={`url(#${id}-m${i})`} />
          <text x={lab[0]} y={lab[1]} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700} fill={color} stroke="#fff" strokeWidth={3.5} paintOrder="stroke" style={{ fontFamily: 'inherit' }}>
            <ForceName name={f.name} />{f.magnitude ? ` = ${f.magnitude}` : ''}
          </text>
        </g>
      ))}
      <circle cx={center[0]} cy={center[1]} r={3.2} fill={INK} />
    </svg>
  )
}
