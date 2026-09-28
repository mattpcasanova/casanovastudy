// Turns normalized guide markdown into a document structure shared by the
// Outline and Summary renderers:
//
//   title / subtitle  → the guide's own H1 (the page banner already shows the
//                       saved title, so renderers usually just show subtitle)
//   objectives        → "Learning Objectives" section, pulled to the top
//   blocks            → in document order, either a priority group
//                       (Essential / Important / Supporting) holding cards, or
//                       a standalone card (e.g. "Exam Review")
//
// Heading depth varies between generations (tiers are H1 in some guides, H2 in
// others), so cards are defined relative to the first heading seen inside a
// group rather than by absolute depth. Headings inside code fences are ignored.

import { detectTier, type Tier } from './design'
import { plainText } from './normalize'

export interface GuideCard {
  id: string
  title: string
  body: string // markdown, may contain deeper headings
  kind: 'section' | 'review' | 'objectives'
}

export interface GuideGroup {
  type: 'group'
  id: string
  tier: Tier
  title: string
  intro: string
  cards: GuideCard[]
}

export interface GuideLoose {
  type: 'card'
  card: GuideCard
}

export type GuideBlock = GuideGroup | GuideLoose

export interface GuideStructure {
  title: string | null
  subtitle: string | null
  preface: string // content before the first section (big idea, how-to-use)
  objectives: string | null
  blocks: GuideBlock[]
}

interface RawSection {
  depth: number
  title: string
  body: string[]
}

const OBJECTIVES = /\b(learning (objectives|intentions|goals|targets)|objectives|by the end of|what you('|’)ll learn|success criteria)\b/i
const REVIEW = /\b(exam (prep|preparation|review|summary|focus)|quick (review|recall|reference)|final review|review summary|key takeaways|summary of key|cheat sheet|top concepts|must[- ]know|study tips|how to study|wrap[- ]up)\b/i

function splitSections(md: string): { preface: string[]; sections: RawSection[] } {
  const preface: string[] = []
  const sections: RawSection[] = []
  let fence: string | null = null
  for (const line of md.split('\n')) {
    const t = line.trim()
    if (fence) {
      if (t.startsWith(fence)) fence = null
    } else {
      const f = t.match(/^(`{3,}|~{3,})/)
      if (f) fence = f[1]
      else {
        const h = line.match(/^(#{1,6})\s+(.+)$/)
        if (h) {
          sections.push({ depth: h[1].length, title: h[2].trim(), body: [] })
          continue
        }
      }
    }
    if (sections.length) sections[sections.length - 1].body.push(line)
    else preface.push(line)
  }
  return { preface, sections }
}

const tidy = (lines: string[]) => lines.join('\n').trim()

export function parseGuideStructure(md: string): GuideStructure {
  const { preface, sections } = splitSections(md)
  let title: string | null = null
  let subtitle: string | null = null
  const prefaceParts = [tidy(preface)]
  let objectives: string | null = null
  const blocks: GuideBlock[] = []
  let idCounter = 0
  const nextId = (p: string) => `${p}-${idCounter++}`

  let i = 0
  // Leading document title (H1 or the first heading) that isn't itself a section.
  const first = sections[0]
  if (first && first.depth === Math.min(...sections.map((s) => s.depth)) && !detectTier(first.title) && !OBJECTIVES.test(first.title) && !REVIEW.test(first.title)) {
    const sameDepthCount = sections.filter((s) => s.depth === first.depth).length
    const looksLikeTitle = first.depth === 1 || sameDepthCount === 1 || /study guide|unit|chapter|flashcards|quiz|summary|review/i.test(first.title)
    if (looksLikeTitle) {
      title = plainText(first.title)
      i = 1
      let body = tidy(first.body)
      // A deeper heading directly under the title with no body is its subtitle.
      const next = sections[1]
      if (!body && next && next.depth > first.depth && !/^\d/.test(next.title) && !detectTier(next.title) && !OBJECTIVES.test(next.title) && !REVIEW.test(next.title)) {
        subtitle = plainText(next.title)
        body = tidy(next.body)
        i = 2
      }
      // An italic line right after the title reads as a subtitle too.
      const italic = body.match(/^\*([^*\n]+)\*\s*(\n|$)/)
      if (!subtitle && italic) {
        subtitle = italic[1].trim()
        body = body.slice(italic[0].length).trim()
      }
      if (body) prefaceParts.push(body)
    }
  }

  let group: GuideGroup | null = null
  let groupDepth = 0
  let cardDepth: number | null = null
  let card: GuideCard | null = null
  // Depth of the card that loose (ungrouped) sections are measured against.
  let looseDepth: number | null = null

  const closeGroup = () => {
    if (group) blocks.push(group)
    group = null
    cardDepth = null
    card = null
  }

  for (; i < sections.length; i++) {
    const s = sections[i]
    const body = tidy(s.body)
    const tier = detectTier(s.title)
    const cleanTitle = s.title

    if (tier && !(group && s.depth > groupDepth && detectTier(group.title) === tier)) {
      closeGroup()
      looseDepth = null
      // Strip the tier word itself ("Essential Content", "Section 1: Essential Concepts").
      group = { type: 'group', id: nextId('group'), tier, title: cleanTitle, intro: '', cards: [] }
      groupDepth = s.depth
      // An italic one-liner right under a tier heading is its description.
      group.intro = body
      continue
    }

    if (OBJECTIVES.test(s.title) && !objectives) {
      objectives = body
      // Deeper headings directly under objectives stay with it.
      while (sections[i + 1] && sections[i + 1].depth > s.depth && !detectTier(sections[i + 1].title)) {
        i++
        objectives += `\n\n### ${sections[i].title}\n${tidy(sections[i].body)}`
      }
      continue
    }

    if (group && s.depth <= groupDepth) closeGroup()

    const isReview = REVIEW.test(s.title)
    if (group) {
      if (cardDepth === null || s.depth <= cardDepth) {
        cardDepth = s.depth
        card = { id: nextId('card'), title: cleanTitle, body, kind: isReview ? 'review' : 'section' }
        group.cards.push(card)
      } else if (card) {
        card.body += `\n\n${'#'.repeat(Math.min(6, Math.max(3, s.depth - cardDepth + 2)))} ${s.title}\n${body}`
      }
      continue
    }

    // Loose section outside any priority group.
    if (looseDepth === null || s.depth <= looseDepth || !card) {
      looseDepth = s.depth
      card = { id: nextId('card'), title: cleanTitle, body, kind: isReview ? 'review' : 'section' }
      blocks.push({ type: 'card', card })
    } else {
      card.body += `\n\n${'#'.repeat(Math.min(6, Math.max(3, s.depth - looseDepth + 2)))} ${s.title}\n${body}`
    }
  }
  closeGroup()

  // Drop empty cards/groups.
  const cleaned = blocks
    .map((b) => (b.type === 'group' ? { ...b, cards: b.cards.filter((c) => c.body.trim() || c.title) } : b))
    .filter((b) => (b.type === 'group' ? b.cards.length > 0 || b.intro.trim() : b.card.body.trim()))

  return {
    title,
    subtitle,
    preface: prefaceParts.filter(Boolean).join('\n\n'),
    objectives,
    blocks: cleaned,
  }
}

// The theme of a tier group heading with the tier word removed:
// "Essential: Cell Structure" → "Cell Structure", "Essential Content" → ""
// (empty = no specific theme; renderers then just show the tier label).
export function groupDisplayTitle(title: string): string {
  const t = plainText(title)
    .replace(/^(?:section|part|tier|priority|level)\s*\d*\s*[:.\-–—]?\s*/i, '')
    .replace(/^(essential|important|supporting)\b\s*[:.\-–—]?\s*/i, '')
    .trim()
  if (/^(content|concepts?|section|ideas|material|topics|flashcards|questions|details|knowledge)?$/i.test(t)) return ''
  return t
}

// Card titles often carry numbering ("1.1 What Is…", "3."). Split it out so it
// can be styled as a badge.
export function splitNumbering(title: string): { num: string | null; text: string } {
  const m = plainText(title).match(/^((?:\d+\.)*\d+)\.?\s+(.+)$/)
  if (m) return { num: m[1], text: m[2] }
  return { num: null, text: plainText(title) }
}
