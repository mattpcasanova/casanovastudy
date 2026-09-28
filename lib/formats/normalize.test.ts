import { describe, it, expect } from 'vitest'
import { normalizeGuideMarkdown, toTitleCase, stripEmoji, CHECK_ANSWER_SEPARATOR } from './normalize'
import { parseGuideStructure, groupDisplayTitle, splitNumbering } from './structure'

// Shaped like real generated guides (2026-09 outline/summary samples).
const LEGACY = `# 📊 STUDY GUIDE: Introduction to Statistical Science
### Chapter 1 | College-Level Mathematics/Statistics

---

## 🎯 LEARNING OBJECTIVES

1. **Define** statistical science.
2. **Classify** variables.

---
---

# 🔴 ESSENTIAL CONTENT
### *(Core concepts, key definitions, and fundamental principles)*

---

## 1.1 What Is Statistical Science?

> 📦 **KEY TERM BOX — Statistical Science**
> The **science of developing and applying methods.**
>
> 🔎 *In simple terms:* it helps us answer questions.

> ❓ **CHECK YOURSELF:** Is this descriptive or inferential?
> **Answer:** Inferential — it uses a sample.

### The Three Pillars

| Pillar | Definition |
|--------|-----------|
| **Design** | Planning<br>how to collect |

## 1.2 Populations

\`\`\`r
# this is an R comment, not a heading
y = c(1, 2)
\`\`\`

# 🟡 IMPORTANT CONTENT

## 2.1 Quartiles

- • not a double bullet
**🔑 WHY do atoms bond at all?**

# 🎓 EXAM PREPARATION SUMMARY

| # | Concept |
|---|---|
| 1 | Pillars |

### 📓 NOTES SPACE

**Concepts I need to review more:**
_______________________________________________

## After notes
Kept.
`

describe('normalizeGuideMarkdown', () => {
  const out = normalizeGuideMarkdown(LEGACY)

  it('strips emoji and title-cases all-caps headings', () => {
    expect(out).toContain('## Learning Objectives')
    expect(out).toContain('# Essential Content')
    expect(out).not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it('turns decorative italic sub-headings into a paragraph', () => {
    expect(out).toContain('*Core concepts, key definitions, and fundamental principles*')
    expect(out).not.toContain('### *(')
  })

  it('removes horizontal rules and notes-space sections', () => {
    expect(out).not.toMatch(/^---$/m)
    expect(out).not.toContain('Notes Space')
    expect(out).not.toContain('____')
    expect(out).toContain('## After notes')
  })

  it('rewrites blockquote boxes into typed callouts', () => {
    expect(out).toContain('~~~~callout-keyterm Key%20Term%20Box%20%E2%80%94%20Statistical%20Science')
    expect(out).toContain('~~~~callout-check Check%20Yourself')
    expect(out).toContain(CHECK_ANSWER_SEPARATOR)
    expect(out).not.toMatch(/^>/m)
  })

  it('leaves code fences untouched', () => {
    expect(out).toContain('# this is an R comment, not a heading')
  })

  it('replaces <br> in table cells and tidies bold labels left by emoji', () => {
    expect(out).toContain('Planning · how to collect')
    expect(out).toContain('**WHY do atoms bond at all?**')
    expect(out).toContain('\n- not a double bullet')
  })
})

describe('parseGuideStructure', () => {
  const s = parseGuideStructure(normalizeGuideMarkdown(LEGACY))

  it('extracts title, subtitle and objectives', () => {
    expect(s.title).toBe('Study Guide: Introduction to Statistical Science')
    expect(s.subtitle).toBe('Chapter 1 | College-Level Mathematics/Statistics')
    expect(s.objectives).toContain('**Define** statistical science.')
  })

  it('groups sections under priority tiers without treating code comments as headings', () => {
    const groups = s.blocks.filter((b) => b.type === 'group')
    expect(groups.map((g) => g.type === 'group' && g.tier)).toEqual(['essential', 'important'])
    const essential = groups[0]
    if (essential.type !== 'group') throw new Error()
    expect(essential.intro).toContain('Core concepts')
    expect(essential.cards.map((c) => c.title)).toEqual(['1.1 What Is Statistical Science?', '1.2 Populations'])
    expect(essential.cards[0].body).toContain('### The Three Pillars')
    expect(essential.cards[1].body).toContain('# this is an R comment')
  })

  it('keeps the exam review as a standalone review card', () => {
    const loose = s.blocks.filter((b) => b.type === 'card')
    expect(loose[0].type === 'card' && loose[0].card.kind).toBe('review')
  })
})

describe('helpers', () => {
  it('title-cases but keeps acronyms', () => {
    expect(toTitleCase('AP CHEMISTRY UNIT 2: CHEMICAL BONDING')).toBe('AP Chemistry Unit 2: Chemical Bonding')
    expect(toTitleCase('THE ROLE OF DNA IN CELLS')).toBe('The Role of DNA in Cells')
    expect(toTitleCase('Already Mixed Case')).toBe('Already Mixed Case')
  })
  it('keeps check marks', () => {
    expect(stripEmoji('Yes ✅ / No ❌ 🔥')).toBe('Yes ✓ / No ✗ ')
  })
  it('formats group titles and numbering', () => {
    expect(groupDisplayTitle('Section 1: Essential Concepts')).toBe('')
    expect(groupDisplayTitle('Essential Content')).toBe('')
    expect(groupDisplayTitle('Essential: Cell Structure')).toBe('Cell Structure')
    expect(splitNumbering('1.1 What Is It?')).toEqual({ num: '1.1', text: 'What Is It?' })
  })
})

describe('callout classification', () => {
  it('uses the emoji as a hint and keeps bold statements as the body', () => {
    const out = normalizeGuideMarkdown('> ⚠️ **Metal-or-nonmetal is ALWAYS the first question. Everything else is refinement.**')
    expect(out).toMatch(/^~~~~callout-warning$/m)
    expect(out).toContain('**Metal-or-nonmetal is ALWAYS the first question. Everything else is refinement.**')
  })
  it('treats a short unknown label as a key term', () => {
    const out = normalizeGuideMarkdown('> **Electronegativity (EN):** How hard an atom pulls on shared electrons.')
    expect(out).toContain('~~~~callout-keyterm Electronegativity%20(EN)')
  })
})

describe('math', () => {
  it('promotes a standalone $$equation$$ line to display math, leaves inline math alone', () => {
    const out = normalizeGuideMarkdown('Text $$x^2$$ here.\n\n$$6CO_2 + 6H_2O \\rightarrow C_6H_{12}O_6$$')
    expect(out).toContain('Text $$x^2$$ here.')
    expect(out).toContain('$$\n6CO_2 + 6H_2O \\rightarrow C_6H_{12}O_6\n$$')
  })
})

describe('split check-yourself answers', () => {
  it('joins an Answer quote that follows a Check yourself quote', () => {
    const md = '> **Check yourself:** Long-term or immediate?\n\n> **Answer:** Long-term.\n\nNext paragraph.'
    const out = normalizeGuideMarkdown(md)
    expect(out.match(/~~~~callout-check/g)).toHaveLength(1)
    expect(out).toContain(CHECK_ANSWER_SEPARATOR)
    expect(out).toContain('Next paragraph.')
  })

  it('leaves unrelated consecutive quotes alone', () => {
    const md = '> **Remember:** A\n\n> **Answer:** not a check answer'
    expect(normalizeGuideMarkdown(md).match(/~~~~callout-/g)).toHaveLength(2)
  })
})
