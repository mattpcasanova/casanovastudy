// General labeled diagrams: boxes and arrows the app lays out itself. The
// subject-agnostic visual for anything that branches or loops (causes and
// effects, feedback loops, food webs, concept maps, state machines).
//
// kind: diagram
// layout: down | right | cycle          (default down)
// node: stamp | Stamp Act (1765) | red   (id | label | optional color)
// stamp -> protest | taxation without representation
// protest -> repeal
// a <-> b      (both ways)    a -- b   (no arrow)
// Edges may name nodes by id or label; unknown names become nodes.
//
// Layout is layered (longest-path ranks, barycenter ordering), pure and unit-
// tested; DiagramFigure in components/formats/graph-figure.tsx draws it.

import type { Color } from './spec'

export interface DiagramNode { id: string; label: string; color?: Color }
export interface DiagramEdge { from: string; to: string; label?: string; arrow: 'to' | 'both' | 'none' }
export interface DiagramData { layout: 'down' | 'right' | 'cycle'; nodes: DiagramNode[]; edges: DiagramEdge[] }

export interface PlacedNode extends DiagramNode { x: number; y: number; w: number; h: number; lines: string[] }
export interface DiagramLayout { nodes: PlacedNode[]; edges: (DiagramEdge & { back: boolean })[]; width: number; height: number }

const COLORS = ['blue', 'red', 'green', 'orange', 'purple', 'gray']
export const EDGE_LINE = /^(.+?)\s*(<->|<-->|->|-->|→|⟶|--|—)\s*(.+)$/

export function parseDiagram(lines: { key: string; value: string; raw: string }[], w: string[]): DiagramData | string {
  const d: DiagramData = { layout: 'down', nodes: [], edges: [] }
  const byKey = new Map<string, DiagramNode>()
  const find = (name: string): DiagramNode => {
    const k = name.trim().toLowerCase()
    const hit = byKey.get(k) ?? d.nodes.find((n) => n.label.toLowerCase() === k)
    if (hit) return hit
    const node = { id: name.trim(), label: name.trim() }
    d.nodes.push(node)
    byKey.set(k, node)
    return node
  }
  for (const { key, value, raw } of lines) {
    if (key === 'layout' || key === 'direction') {
      const v = value.trim().toLowerCase()
      d.layout = /right|horizontal|lr/.test(v) ? 'right' : /cycle|circle|loop/.test(v) ? 'cycle' : 'down'
    } else if (key === 'node') {
      const [id, label, ...mods] = value.split('|').map((p) => p.trim())
      if (!id) { w.push(`Bad node "${raw}"`); continue }
      const existing = byKey.get(id.toLowerCase())
      const node = existing ?? { id, label: label || id }
      if (existing && label) existing.label = label
      const color = mods.find((m) => COLORS.includes(m.toLowerCase()))
      if (color) node.color = color.toLowerCase() as Color
      if (!existing) { d.nodes.push(node); byKey.set(id.toLowerCase(), node) }
    } else if (key === 'edge') {
      const [rel, ...labelParts] = value.split(/\s+\|\s+/)
      const m = rel.match(EDGE_LINE)
      if (!m) { w.push(`Bad edge "${raw}"`); continue }
      const a = find(m[1])
      const b = find(m[3])
      const arrow = m[2].startsWith('<') ? 'both' : m[2] === '--' || m[2] === '—' ? 'none' : 'to'
      d.edges.push({ from: a.id, to: b.id, label: labelParts.join(' | ') || undefined, arrow })
    } else if (key !== 'note') w.push(`Unknown line "${raw}"`)
    if (d.nodes.length > 24) return 'Diagrams support up to 24 boxes'
  }
  if (d.nodes.length < 2) return 'A diagram needs at least two boxes'
  return d
}

// ── Layout ──────────────────────────────────────────────────────────────────

const FONT_W = 7.1 // average px per character at 13px
const LINE_H = 17
const MAX_CHARS = 22

export function wrapLabel(label: string, max = MAX_CHARS): string[] {
  const words = label.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const word of words) {
    if (cur && (cur + ' ' + word).length > max) { lines.push(cur); cur = word } else cur = cur ? `${cur} ${word}` : word
  }
  if (cur) lines.push(cur)
  if (lines.length > 3) return [...lines.slice(0, 2), `${lines.slice(2).join(' ').slice(0, max - 1)}…`]
  return lines
}

function sized(n: DiagramNode): PlacedNode {
  const lines = wrapLabel(n.label)
  const w = Math.max(84, Math.min(190, Math.max(...lines.map((l) => l.length)) * FONT_W + 26))
  return { ...n, lines, w, h: lines.length * LINE_H + 16, x: 0, y: 0 }
}

export function layoutDiagram(d: DiagramData): DiagramLayout {
  const nodes = d.nodes.map(sized)
  const index = new Map(nodes.map((n, i) => [n.id, i]))
  const edges = d.edges.map((e) => ({ ...e, back: false }))

  if (d.layout === 'cycle') {
    const n = nodes.length
    const maxW = Math.max(...nodes.map((x) => x.w))
    const r = Math.max(90, (n * (maxW + 24)) / (2 * Math.PI))
    nodes.forEach((node, i) => {
      const t = -Math.PI / 2 + (2 * Math.PI * i) / n
      node.x = r * Math.cos(t)
      node.y = r * Math.sin(t) * 0.8
    })
    return normalize(nodes, edges)
  }

  // Break cycles: DFS back edges don't count for ranking.
  const out = nodes.map(() => [] as number[])
  const state = nodes.map(() => 0) // 0 new, 1 on stack, 2 done
  const isBack = new Set<number>()
  const adj = nodes.map(() => [] as { to: number; edge: number }[])
  edges.forEach((e, k) => { const a = index.get(e.from)!, b = index.get(e.to)!; if (a !== b) adj[a].push({ to: b, edge: k }) })
  const dfs = (v: number) => {
    state[v] = 1
    for (const { to, edge } of adj[v]) {
      if (state[to] === 1) isBack.add(edge)
      else if (state[to] === 0) dfs(to)
    }
    state[v] = 2
  }
  nodes.forEach((_, v) => { if (state[v] === 0) dfs(v) })
  edges.forEach((e, k) => {
    if (isBack.has(k)) { e.back = true; return }
    const a = index.get(e.from)!, b = index.get(e.to)!
    if (a !== b) out[a].push(b)
  })

  // Longest-path ranks.
  const rank = nodes.map(() => 0)
  const indeg = nodes.map(() => 0)
  out.forEach((targets) => targets.forEach((t) => indeg[t]++))
  const queue = nodes.map((_, i) => i).filter((i) => indeg[i] === 0)
  while (queue.length) {
    const v = queue.shift()!
    for (const t of out[v]) {
      rank[t] = Math.max(rank[t], rank[v] + 1)
      if (--indeg[t] === 0) queue.push(t)
    }
  }
  const layers: number[][] = []
  nodes.forEach((_, i) => { (layers[rank[i]] ??= []).push(i) })

  // Barycenter ordering, two sweeps.
  const pos = new Map<number, number>()
  const setPos = () => layers.forEach((l) => l.forEach((v, i) => pos.set(v, i)))
  setPos()
  const preds = nodes.map(() => [] as number[])
  out.forEach((targets, v) => targets.forEach((t) => preds[t].push(v)))
  for (let sweep = 0; sweep < 2; sweep++) {
    for (let r = 1; r < layers.length; r++) {
      const bary = (v: number) => (preds[v].length ? preds[v].reduce((s, p) => s + pos.get(p)!, 0) / preds[v].length : pos.get(v)!)
      layers[r] = [...layers[r]].sort((a, b) => bary(a) - bary(b))
      setPos()
    }
  }

  const horizontal = d.layout === 'right'
  const GAP_ALONG = horizontal ? 70 : 64 // between layers
  const GAP_ACROSS = horizontal ? 18 : 22 // between siblings
  let along = 0
  for (const layer of layers) {
    const size = (v: number) => (horizontal ? nodes[v].h : nodes[v].w)
    const depth = Math.max(...layer.map((v) => (horizontal ? nodes[v].w : nodes[v].h)))
    const total = layer.reduce((s, v) => s + size(v), 0) + GAP_ACROSS * (layer.length - 1)
    let across = -total / 2
    for (const v of layer) {
      const c = across + size(v) / 2
      if (horizontal) { nodes[v].x = along + depth / 2; nodes[v].y = c } else { nodes[v].x = c; nodes[v].y = along + depth / 2 }
      across += size(v) + GAP_ACROSS
    }
    along += depth + GAP_ALONG
  }
  return normalize(nodes, edges)
}

function normalize(nodes: PlacedNode[], edges: DiagramLayout['edges']): DiagramLayout {
  const PAD = 16
  const minX = Math.min(...nodes.map((n) => n.x - n.w / 2)) - PAD
  const minY = Math.min(...nodes.map((n) => n.y - n.h / 2)) - PAD
  nodes.forEach((n) => { n.x -= minX; n.y -= minY })
  const width = Math.max(...nodes.map((n) => n.x + n.w / 2)) + PAD
  const height = Math.max(...nodes.map((n) => n.y + n.h / 2)) + PAD
  return { nodes, edges, width, height }
}

/** Where the line from box a's center toward (tx, ty) leaves the box. */
export function boxExit(n: PlacedNode, tx: number, ty: number): [number, number] {
  const dx = tx - n.x, dy = ty - n.y
  if (dx === 0 && dy === 0) return [n.x, n.y]
  const sx = (n.w / 2 + 3) / Math.abs(dx || 1e-9)
  const sy = (n.h / 2 + 3) / Math.abs(dy || 1e-9)
  const s = Math.min(sx, sy)
  return [n.x + dx * s, n.y + dy * s]
}
