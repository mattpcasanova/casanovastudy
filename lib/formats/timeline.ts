// Parser for the "timeline" study-guide format — eras of dated events, each
// with what happened and why it matters.
//
// Output contract (see the timeline skeleton in lib/claude-api.ts):
//   # <Title>
//   *<description>*
//   ## <Era name> (<date range>)
//   <optional one-sentence era summary>
//   EVENT: <date> | <event title>
//   WHAT: <1-2 sentences>
//   WHY: <1 sentence: why it matters / what it led to>
//   ## Key Themes            (free markdown — any heading without EVENT lines)
// Event keys (e1, e2, …) follow document order; Learn mode stores progress by
// them, so keep the parse order stable.

import { stripEmoji, toTitleCase, plainText } from './normalize'

export interface TimelineEvent {
  key: string
  date: string
  title: string
  what: string
  why: string
}

export interface TimelineEra {
  title: string
  range: string | null // "1600s–1788", from a trailing "(…)" in the heading
  summary: string
  events: TimelineEvent[]
}

export interface TimelineSection {
  title: string
  body: string // markdown
}

export interface ParsedTimeline {
  title: string | null
  description: string | null
  eras: TimelineEra[]
  extras: TimelineSection[] // key themes etc., rendered after the eras
}

const FIELD = /^\*{0,2}(EVENT|WHAT|WHY|SIGNIFICANCE|DETAIL)\s*:\*{0,2}\s*(.*)$/i

const clean = (s: string) => stripEmoji(s).replace(/^\*\*\s*|\s*\*\*$/g, '').trim()

/** "Era: The Old Regime (1600s–1788)" → title + range. */
export function splitEraHeading(text: string): { title: string; range: string | null } {
  const noPrefix = text.replace(/^(era|period|phase|part)\s*\d*\s*[:.\-–—]\s*/i, '').trim()
  const m = noPrefix.match(/^(.*?)\s*\(([^()]*\d[^()]*)\)\s*$/)
  if (m && m[1]) return { title: m[1].trim(), range: m[2].trim() }
  return { title: noPrefix, range: null }
}

/** "1789 | Storming of the Bastille" (or "1789 — Storming…") → date + title. */
export function splitEventLine(value: string): { date: string; title: string } {
  const bar = value.indexOf('|')
  if (bar >= 0) return { date: value.slice(0, bar).trim(), title: value.slice(bar + 1).trim() }
  const dash = value.match(/^(.{1,40}?\d.{0,20}?)\s+[—–:-]\s+(.+)$/)
  if (dash) return { date: dash[1].trim(), title: dash[2].trim() }
  return { date: '', title: value }
}

export function parseTimeline(content: string): ParsedTimeline {
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  const tl: ParsedTimeline = { title: null, description: null, eras: [], extras: [] }
  let count = 0
  let era: TimelineEra | null = null
  let section: TimelineSection | null = null // same heading, if it never gets events
  let event: TimelineEvent | null = null
  let fence: string | null = null

  const closeEvent = () => {
    if (event && era && event.title) era.events.push(event)
    event = null
  }
  const closeHeading = () => {
    closeEvent()
    if (era && era.events.length) tl.eras.push({ ...era, summary: era.summary.trim() })
    else if (section && section.body.trim()) tl.extras.push({ ...section, body: section.body.trim() })
    era = null
    section = null
  }

  for (const raw of lines) {
    const t = raw.trim()
    if (fence) {
      if (section) section.body += '\n' + raw
      if (t.startsWith(fence)) fence = null
      continue
    }
    const fm = t.match(/^(`{3,}|~{3,})/)
    if (fm) {
      fence = fm[1]
      if (section) section.body += (section.body ? '\n' : '') + raw
      continue
    }

    const h = t.match(/^(#{1,6})\s+(.+)$/)
    if (h) {
      const text = toTitleCase(plainText(stripEmoji(h[2])).trim())
      if (h[1].length === 1 && !tl.title) {
        tl.title = text
        continue
      }
      if (h[1].length > 2 && section) {
        // Sub-heading inside a free section stays in its body.
        section.body += (section.body ? '\n' : '') + raw
        continue
      }
      closeHeading()
      const { title, range } = splitEraHeading(text)
      era = { title, range, summary: '', events: [] }
      section = { title: text, body: '' }
      continue
    }

    const f = t.match(FIELD)
    if (f && era) {
      const key = f[1].toUpperCase()
      const value = clean(f[2])
      if (key === 'EVENT') {
        closeEvent()
        section = null // this heading is an era, not a free section
        count++
        const { date, title } = splitEventLine(value)
        event = { key: `e${count}`, date, title, what: '', why: '' }
      } else if (event) {
        if (key === 'WHAT' || key === 'DETAIL') event.what = event.what ? `${event.what} ${value}` : value
        else event.why = event.why ? `${event.why} ${value}` : value
      }
      continue
    }

    if (!era && !tl.description) {
      const italic = t.match(/^\*([^*].*[^*])\*$/) || t.match(/^_(.+)_$/)
      if (italic) {
        tl.description = italic[1].trim()
        continue
      }
    }

    if (era && !event && t && era.events.length === 0) era.summary += (era.summary ? ' ' : '') + clean(t)
    if (section) section.body += (section.body ? '\n' : '') + raw
  }
  closeHeading()
  return tl
}
