"use client"

import { Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { displaySerif } from '@/lib/formats/fonts'
import { formatContent, formatContentWithKeyPoints } from '@/lib/formats/format-content'
import { fontDisplay, eyebrow, detectTier, stripTierEmoji, tierStyles, capitalizeFirst } from '@/lib/formats/design'

interface SummaryFormatProps {
  content: string
  subject: string
}

export default function SummaryFormat({ content, subject }: SummaryFormatProps) {
  const sections = parseSummaryContent(content)
  const subjectLabel = capitalizeFirst(subject)

  return (
    // Narrow reading column + flowing sections divided by rules — a "document"
    // read, deliberately distinct from the Outline's wide interactive boxes.
    <div className={cn(displaySerif.variable, 'max-w-2xl mx-auto px-5')}>
      {/* Masthead */}
      <header className="mb-2 pb-6 border-b border-slate-200">
        <p className={cn(eyebrow, 'text-green-600 mb-2')}>Comprehensive Summary</p>
        <h1 className={cn(fontDisplay, 'text-3xl font-semibold text-slate-900 leading-tight')}>{subjectLabel}</h1>
        <p className="mt-2 text-slate-500 leading-relaxed">
          Read each section in order and note the key concepts as you go.
        </p>
      </header>

      {/* Sections — flowing article, divided by hairline rules */}
      <div className="divide-y divide-slate-200">
        {sections.map((section, index) => (
          <SummarySection key={index} section={section} />
        ))}
      </div>

      {/* Study tips — a single quiet callout */}
      <aside className="mt-10 rounded-xl bg-slate-50 p-6 ring-1 ring-inset ring-slate-200 print:break-before-page print:break-inside-avoid">
        <div className="flex items-center gap-2.5 mb-3">
          <Lightbulb className="h-5 w-5 text-green-600" />
          <h3 className={cn(fontDisplay, 'text-lg font-semibold text-slate-900')}>How to study this</h3>
        </div>
        <ul className="space-y-2.5 text-sm text-slate-700">
          {[
            `Identify the main idea of each section of ${subjectLabel} before moving on.`,
            'Pay special attention to key terms — the vocabulary is what exams test most.',
            'Explain each section aloud, or rewrite it in your own words, to check recall.',
            'Look for the connections between sections — relationships are where deeper questions come from.',
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
              <span className="leading-relaxed">{tip}</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}

function SummarySection({ section }: { section: ParsedSection }) {
  const tier = detectTier(section.title)
  const tierStyle = tier ? tierStyles[tier] : null
  const title = stripTierEmoji(section.title)
  // Prefer the table-aware renderer when a section has a markdown table (common
  // now that generation emits comparison tables); only use the prettier
  // key-point bullet rows for table-free bullet content.
  const hasTable = /^\s*\|.*\|/m.test(section.content)
  const hasKeyPoints = !hasTable && (section.content.includes('•') || section.content.includes('- '))

  return (
    <section className="py-8 first:pt-8 print:break-inside-avoid">
      {tierStyle && (
        <span className={cn(eyebrow, 'inline-block rounded-full px-2.5 py-0.5 mb-2.5', tierStyle.chip)}>
          {tierStyle.label}
        </span>
      )}
      <h2 className={cn(fontDisplay, 'text-2xl font-semibold text-slate-900 leading-tight mb-4')}>{title}</h2>

      <div className="text-[0.98rem]">
        {hasKeyPoints ? (
          <div dangerouslySetInnerHTML={{ __html: formatContentWithKeyPoints(section.content) }} />
        ) : (
          <div dangerouslySetInnerHTML={{ __html: formatContent(section.content) }} />
        )}
      </div>

      {/* Key terms */}
      {section.keyTerms && section.keyTerms.length > 0 && (
        <div className="mt-5">
          <p className={cn(eyebrow, 'text-slate-500 mb-3')}>Key terms</p>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {section.keyTerms.map((term, i) => (
              <div key={i} className="border-l-2 border-slate-200 pl-3">
                <dt className="font-semibold text-slate-900">{term.term}</dt>
                <dd className="mt-0.5 text-sm text-slate-600 leading-relaxed">{term.definition}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  )
}

interface ParsedSection {
  title: string
  content: string
  keyTerms?: Array<{ term: string; definition: string }>
}

function parseSummaryContent(content: string): ParsedSection[] {
  const sections: ParsedSection[] = []
  const lines = content.split('\n')

  let currentSection: ParsedSection | null = null
  let inKeyTerms = false
  let skipSection = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Check for section headers
    if (line.startsWith('# ') || line.startsWith('## ')) {
      const title = line.replace(/^##?\s+/, '')

      // Skip Student Notes sections
      if (title.toLowerCase().includes('student notes') ||
          title.toLowerCase().includes('notes section') ||
          title.toLowerCase().includes('your notes')) {
        skipSection = true
        continue
      }

      // Skip empty title sections
      if (!title || title === '—') {
        skipSection = true
        continue
      }

      skipSection = false

      if (currentSection && currentSection.content.trim()) {
        sections.push(currentSection)
      }
      currentSection = {
        title,
        content: '',
        keyTerms: []
      }
      inKeyTerms = false
    } else if (skipSection) {
      // Skip content in skipped sections
      continue
    } else if (line.toLowerCase().includes('key terms') || line.toLowerCase().includes('vocabulary')) {
      inKeyTerms = true
    } else if (currentSection) {
      // Filter out placeholder content
      if (line === '—' || line === '--' || line === '---') continue

      if (inKeyTerms && line.includes(':')) {
        const colonIndex = line.indexOf(':')
        const term = line.substring(0, colonIndex).trim().replace(/^[-•*]\s*/, '')
        const definition = line.substring(colonIndex + 1).trim()
        if (term && definition && definition !== '—') {
          currentSection.keyTerms!.push({ term, definition })
        }
      } else {
        currentSection.content += (currentSection.content ? '\n' : '') + line
      }
    }
  }

  if (currentSection && currentSection.content.trim()) {
    sections.push(currentSection)
  }

  // Filter out sections with only placeholder content
  const filteredSections = sections.filter(s =>
    s.content.trim() &&
    s.content.trim() !== '—' &&
    s.title.trim() !== '—'
  )

  // If no sections found, create one from all content
  if (filteredSections.length === 0) {
    filteredSections.push({
      title: 'Summary',
      content: content.replace(/^—$/gm, '').trim(),
      keyTerms: []
    })
  }

  return filteredSections
}
