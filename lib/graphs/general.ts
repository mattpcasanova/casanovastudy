// General-purpose figures for ```graph fences: pictures that fit any subject.
// The guide writes a few short lines; the app lays them out (same idea as the
// subject packs, so a figure costs no more than the sentence it replaces).
//
// kind: venn       set: Mitosis | one division; two identical cells
//                  set: Meiosis | two divisions; four different cells
//                  both: DNA is copied first; cells divide
// kind: layers     shape: pyramid | stack     (listed top to bottom)
//                  layer: Tertiary consumers | hawks
// kind: spectrum   from: 0 | Acidic    to: 14 | Basic
//                  mark: 2 | Lemon juice      (numbers place the marks; without
//                                              numbers they are spread evenly)
// kind: parts      part: 78 | Nitrogen   part: 21 | Oxygen   unit: %
// kind: anatomy    part: y | output   part: =   part: mx | slope times input
// kind: timeline   event: 1765 | Stamp Act   event: 1773 | Boston Tea Party

interface CommonFields { title?: string; caption?: string; xLabel?: string; yLabel?: string; notes: string[] }
type Line = { key: string; value: string; raw: string }

export const GENERAL_LIMITS = { vennItems: 5, layers: 8, marks: 7, parts: 8, anatomy: 10, events: 8 }

export interface VennSpec extends CommonFields { kind: 'venn'; sets: [VennSet, VennSet]; both: string[] }
export interface VennSet { name: string; items: string[] }
export interface LayersSpec extends CommonFields { kind: 'layers'; shape: 'pyramid' | 'stack'; layers: Array<{ label: string; detail?: string }> }
export interface SpectrumSpec extends CommonFields {
  kind: 'spectrum'
  from: { value: number | null; label: string }
  to: { value: number | null; label: string }
  /** `at` is 0-1 along the bar. */
  marks: Array<{ at: number; label: string; value: string | null }>
}
export interface PartsSpec extends CommonFields { kind: 'parts'; unit: string; total: number; parts: Array<{ value: number; label: string; share: number }> }
export interface AnatomySpec extends CommonFields { kind: 'anatomy'; parts: Array<{ text: string; label?: string }> }
export interface MiniTimelineSpec extends CommonFields { kind: 'timeline'; events: Array<{ when: string; label: string }> }

export type GeneralSpec = VennSpec | LayersSpec | SpectrumSpec | PartsSpec | AnatomySpec | MiniTimelineSpec

const pipes = (v: string) => v.split('|').map((p) => p.trim())
const items = (v: string, max: number) => v.split(/;|\n/).map((p) => p.trim()).filter(Boolean).slice(0, max)
const num = (v: string | undefined): number | null => {
  if (!v) return null
  const t = v.trim().replace(/[−–]/g, '-').replace(/,(?=\d{3}\b)/g, '').replace(/%$/, '')
  if (!/^-?\d*\.?\d+$/.test(t)) return null
  return Number(t)
}

export function parseVenn(ls: Line[], c: CommonFields, w: string[]): VennSpec | string {
  const sets: VennSet[] = []
  let both: string[] = []
  for (const { key, value, raw } of ls) {
    if (key === 'set' || key === 'circle' || key === 'left' || key === 'right') {
      const [name, rest = ''] = pipes(value)
      if (!name) { w.push(`Bad set "${raw}"`); continue }
      sets.push({ name, items: items(rest, GENERAL_LIMITS.vennItems) })
    } else if (key === 'both' || key === 'shared' || key === 'overlap' || key === 'middle') {
      both = items(pipes(value).pop() ?? '', GENERAL_LIMITS.vennItems)
    } else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (sets.length !== 2) return 'A Venn diagram needs exactly two set: lines'
  return { ...c, kind: 'venn', sets: [sets[0], sets[1]], both }
}

export function parseLayers(ls: Line[], c: CommonFields, w: string[]): LayersSpec | string {
  let shape: LayersSpec['shape'] = 'stack'
  const layers: LayersSpec['layers'] = []
  for (const { key, value, raw } of ls) {
    if (key === 'shape' || key === 'style') shape = /pyramid|triangle/i.test(value) ? 'pyramid' : 'stack'
    else if (key === 'layer' || key === 'level' || key === 'tier') {
      const [label, detail] = pipes(value)
      if (!label) { w.push(`Bad layer "${raw}"`); continue }
      if (layers.length < GENERAL_LIMITS.layers) layers.push({ label, detail: detail || undefined })
    } else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (layers.length < 2) return 'Layers need at least two layer: lines'
  return { ...c, kind: 'layers', shape, layers }
}

export function parseSpectrum(ls: Line[], c: CommonFields, w: string[]): SpectrumSpec | string {
  const end = (value: string) => {
    const [a, b] = pipes(value)
    return num(a) !== null ? { value: num(a), label: b ?? '' } : { value: null, label: a }
  }
  let from: SpectrumSpec['from'] | null = null
  let to: SpectrumSpec['to'] | null = null
  const raw: Array<{ value: number | null; text: string | null; label: string }> = []
  for (const line of ls) {
    const { key, value } = line
    if (key === 'from' || key === 'left' || key === 'low') from = end(value)
    else if (key === 'to' || key === 'right' || key === 'high') to = end(value)
    else if (key === 'mark' || key === 'point' || key === 'item') {
      const [a, b] = pipes(value)
      if (!a) { w.push(`Bad mark "${line.raw}"`); continue }
      if (raw.length < GENERAL_LIMITS.marks) raw.push(b === undefined ? { value: null, text: null, label: a } : { value: num(a), text: a, label: b })
    } else if (key !== 'note') w.push(`Unknown line "${line.raw}"`)
  }
  if (!from || !to) return 'A spectrum needs from: and to:'
  if (!raw.length) return 'A spectrum needs at least one mark:'
  // Numbers at both ends and on every mark place them to scale; otherwise the marks are spread evenly in the order written.
  const scaled = from.value !== null && to.value !== null && from.value !== to.value && raw.every((m) => m.value !== null)
  const marks = raw.map((m, i) => ({
    at: scaled ? Math.min(1, Math.max(0, (m.value! - from!.value!) / (to!.value! - from!.value!))) : (i + 1) / (raw.length + 1),
    label: m.label,
    value: m.text,
  }))
  return { ...c, kind: 'spectrum', from, to, marks }
}

export function parseParts(ls: Line[], c: CommonFields, w: string[]): PartsSpec | string {
  let unit = ''
  const parts: Array<{ value: number; label: string }> = []
  for (const { key, value, raw } of ls) {
    if (key === 'unit' || key === 'units') unit = value.trim().slice(0, 12)
    else if (key === 'part' || key === 'slice' || key === 'segment') {
      const [a, b] = pipes(value)
      const v = num(a)
      if (v === null || v < 0 || !b) { w.push(`Bad part "${raw}"`); continue }
      if (parts.length < GENERAL_LIMITS.parts) parts.push({ value: v, label: b })
    } else if (key !== 'note' && key !== 'total') w.push(`Unknown line "${raw}"`)
  }
  const total = parts.reduce((n, p) => n + p.value, 0)
  if (parts.length < 2 || total <= 0) return 'Parts of a whole need at least two part: lines with numbers'
  return { ...c, kind: 'parts', unit, total, parts: parts.map((p) => ({ ...p, share: p.value / total })) }
}

export function parseAnatomy(ls: Line[], c: CommonFields, w: string[]): AnatomySpec | string {
  const parts: AnatomySpec['parts'] = []
  for (const { key, value, raw } of ls) {
    if (key === 'part' || key === 'piece' || key === 'token') {
      const [text, label] = pipes(value)
      if (!text) { w.push(`Bad part "${raw}"`); continue }
      if (parts.length < GENERAL_LIMITS.anatomy) parts.push({ text, label: label || undefined })
    } else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (!parts.some((p) => p.label)) return 'Labelled parts need at least one "part: text | label" line'
  return { ...c, kind: 'anatomy', parts }
}

export function parseMiniTimeline(ls: Line[], c: CommonFields, w: string[]): MiniTimelineSpec | string {
  const events: MiniTimelineSpec['events'] = []
  for (const { key, value, raw } of ls) {
    if (key === 'event' || key === 'date' || key === 'step') {
      const [when, label] = pipes(value)
      if (!when || !label) { w.push(`Bad event "${raw}"`); continue }
      if (events.length < GENERAL_LIMITS.events) events.push({ when, label })
    } else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (events.length < 2) return 'A timeline needs at least two "event: when | what" lines'
  return { ...c, kind: 'timeline', events }
}

/** Whether `part:` lines are amounts ("78 | Nitrogen") or pieces of text ("mx | slope"), when no kind is given. */
export function partsAreAmounts(values: string[]): boolean {
  return values.length > 0 && values.every((v) => { const [a, b] = pipes(v); return num(a) !== null && !!b })
}

/** One sentence for screen readers and the Explain prompt. */
export function describeGeneral(spec: GeneralSpec): string {
  switch (spec.kind) {
    case 'venn': return `Venn diagram comparing ${spec.sets[0].name} (${spec.sets[0].items.join('; ')}) and ${spec.sets[1].name} (${spec.sets[1].items.join('; ')})${spec.both.length ? `; both: ${spec.both.join('; ')}` : ''}.`
    case 'layers': return `${spec.shape === 'pyramid' ? 'Pyramid' : 'Layers'}, top to bottom: ${spec.layers.map((l) => (l.detail ? `${l.label} (${l.detail})` : l.label)).join(', ')}.`
    case 'spectrum': return `Scale from ${[spec.from.value, spec.from.label].filter((x) => x !== null && x !== '').join(' ')} to ${[spec.to.value, spec.to.label].filter((x) => x !== null && x !== '').join(' ')} with ${spec.marks.map((m) => (m.value ? `${m.label} at ${m.value}` : m.label)).join(', ')}.`
    case 'parts': return `Parts of a whole: ${spec.parts.map((p) => `${p.label} ${p.value}${spec.unit} (${Math.round(p.share * 100)}%)`).join(', ')}.`
    case 'anatomy': return `Labelled parts of "${spec.parts.map((p) => p.text).join(' ')}": ${spec.parts.filter((p) => p.label).map((p) => `${p.text} is the ${p.label}`).join('; ')}.`
    case 'timeline': return `Timeline: ${spec.events.map((e) => `${e.when} ${e.label}`).join('; ')}.`
  }
}
