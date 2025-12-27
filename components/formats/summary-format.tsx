"use client"

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Star, AlertCircle } from 'lucide-react'

interface SummaryFormatProps {
  content: string
  subject: string
}

export default function SummaryFormat({ content, subject }: SummaryFormatProps) {
  const sections = parseSummaryContent(content)

  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* Introduction Card */}
      <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <BookOpen className="h-8 w-8 text-blue-600 shrink-0" />
            <div>
              <h2 className="text-2xl font-bold text-blue-900 mb-2">Comprehensive Summary</h2>
              <p className="text-gray-700">
                This summary provides a comprehensive overview of {subject}. Read through each section carefully
                and take notes on key concepts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Sections */}
      <div className="space-y-6">
        {sections.map((section, index) => (
          <SummarySection key={index} section={section} index={index} />
        ))}
      </div>

      {/* Study Tips */}
      <Card className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 print:break-before-page">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <Star className="h-6 w-6 text-green-600 shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold text-green-900 mb-3">Study Tips for {subject}</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>Review each section above and identify the main concepts in {subject}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>Pay special attention to the key terms - understanding vocabulary is crucial for {subject}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>Try explaining each section to someone else or write a brief summary in your own words</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>Connect the concepts from different sections - look for relationships and patterns</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SummarySection({ section, index }: { section: ParsedSection; index: number }) {
  const getCardColor = () => {
    const colors = [
      'border-blue-300 bg-blue-50',
      'border-indigo-300 bg-indigo-50',
      'border-purple-300 bg-purple-50',
      'border-pink-300 bg-pink-50',
    ]
    return colors[index % colors.length]
  }

  const getTitleColor = () => {
    const colors = [
      'text-blue-900',
      'text-indigo-900',
      'text-purple-900',
      'text-pink-900',
    ]
    return colors[index % colors.length]
  }

  const hasKeyPoints = section.content.includes('•') || section.content.includes('-')

  return (
    <Card className={`border-2 ${getCardColor()} print:break-inside-avoid`}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Section Header */}
          <div className="flex items-start gap-3">
            <Badge className="mt-1 bg-white border-2 border-current text-current shrink-0">
              {index + 1}
            </Badge>
            <h2 className={`text-2xl font-bold ${getTitleColor()}`}>{section.title}</h2>
          </div>

          {/* Section Content */}
          <div className="prose prose-sm max-w-none">
            {hasKeyPoints ? (
              <div dangerouslySetInnerHTML={{ __html: formatContentWithKeyPoints(section.content) }} />
            ) : (
              <div dangerouslySetInnerHTML={{ __html: formatContent(section.content) }} />
            )}
          </div>

          {/* Key Terms */}
          {section.keyTerms && section.keyTerms.length > 0 && (
            <div className="mt-6 pt-4 border-t-2 border-current/20">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-current" />
                <h3 className="font-bold text-lg">Key Terms</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {section.keyTerms.map((term, termIndex) => (
                  <div
                    key={termIndex}
                    className="bg-white/80 backdrop-blur rounded-lg p-3 border border-current/20"
                  >
                    <span className="font-semibold text-current">{term.term}:</span>{' '}
                    <span className="text-gray-700">{term.definition}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
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

function formatContent(content: string): string {
  // Filter out empty placeholder content
  const cleanContent = content
    .replace(/^—$/gm, '')
    .replace(/^-{2,}$/gm, '')
    .trim()

  if (!cleanContent) return ''

  // Handle markdown tables with separator row
  const tableRegex = /\|(.+\|)+\n\|[-:\s|]+\|\n(\|.+\|(\n)?)+/gm
  let processedContent = cleanContent.replace(tableRegex, (match) => {
    const lines = match.trim().split('\n')
    if (lines.length < 2) return match

    const headerCells = lines[0].split('|').filter(cell => cell.trim())
    const bodyRows = lines.slice(2) // Skip header and separator

    let tableHtml = '<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border border-gray-300 rounded-lg overflow-hidden">'
    tableHtml += '<thead class="bg-blue-50"><tr>'
    headerCells.forEach(cell => {
      tableHtml += `<th class="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900">${cell.trim()}</th>`
    })
    tableHtml += '</tr></thead><tbody>'

    bodyRows.forEach((row, index) => {
      const cells = row.split('|').filter(cell => cell.trim())
      const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
      tableHtml += `<tr class="${bgClass}">`
      cells.forEach(cell => {
        tableHtml += `<td class="border border-gray-300 px-4 py-2 text-gray-700">${cell.trim()}</td>`
      })
      tableHtml += '</tr>'
    })

    tableHtml += '</tbody></table></div>'
    return tableHtml
  })

  // Handle simpler tables without separator row (consecutive lines with pipes)
  const simpleTableRegex = /(\|[^|\n]+\|[^|\n]*\|?\n?){2,}/gm
  processedContent = processedContent.replace(simpleTableRegex, (match) => {
    // Check if already processed (contains HTML)
    if (match.includes('<table') || match.includes('<div')) return match

    const lines = match.trim().split('\n').filter(l => l.includes('|'))
    if (lines.length < 2) return match

    // First line is header
    const headerCells = lines[0].split('|').filter(cell => cell.trim())
    if (headerCells.length < 2) return match // Not a real table

    // Check if second line is a separator (skip it if so)
    let startRow = 1
    if (lines[1] && /^[\s|:-]+$/.test(lines[1])) {
      startRow = 2
    }
    const bodyRows = lines.slice(startRow)

    let tableHtml = '<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border border-gray-300 rounded-lg overflow-hidden">'
    tableHtml += '<thead class="bg-blue-50"><tr>'
    headerCells.forEach(cell => {
      tableHtml += `<th class="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900">${cell.trim()}</th>`
    })
    tableHtml += '</tr></thead><tbody>'

    bodyRows.forEach((row, index) => {
      const cells = row.split('|').filter(cell => cell.trim())
      if (cells.length === 0) return
      const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
      tableHtml += `<tr class="${bgClass}">`
      cells.forEach(cell => {
        tableHtml += `<td class="border border-gray-300 px-4 py-2 text-gray-700">${cell.trim()}</td>`
      })
      tableHtml += '</tr>'
    })

    tableHtml += '</tbody></table></div>'
    return tableHtml
  })

  return processedContent
    // Handle markdown headers (#### first, then ###, then ##)
    .replace(/^#### (.+)$/gm, '<h4 class="text-base font-semibold text-gray-800 mt-4 mb-2">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-gray-900 mt-4 mb-2">$1</h3>')
    // Handle bold and italic
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    // Handle lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc ml-6 space-y-2 my-4">$&</ul>')
    // Handle paragraphs
    .split('\n\n')
    .filter(para => para.trim() && para.trim() !== '—')
    .map(para => {
      if (para.startsWith('<h') || para.startsWith('<ul') || para.startsWith('<div')) return para
      return `<p class="mb-4 text-gray-700 leading-relaxed">${para}</p>`
    })
    .join('')
}

function formatContentWithKeyPoints(content: string): string {
  const lines = content.split('\n')
  let html = ''
  let inList = false

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip placeholder content
    if (trimmed === '—' || trimmed === '--' || trimmed === '---') continue

    // Handle headers
    if (trimmed.startsWith('#### ')) {
      if (inList) { html += '</ul>'; inList = false }
      html += `<h4 class="text-base font-semibold text-gray-800 mt-4 mb-2">${trimmed.substring(5)}</h4>`
    } else if (trimmed.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false }
      html += `<h3 class="text-lg font-semibold text-gray-900 mt-4 mb-2">${trimmed.substring(4)}</h3>`
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      if (!inList) {
        html += '<ul class="space-y-3 my-4">'
        inList = true
      }
      const text = trimmed.substring(2).trim()
      html += `
        <li class="flex items-start gap-3 p-3 bg-white/50 rounded-lg">
          <span class="text-current font-bold mt-0.5">•</span>
          <span class="text-gray-700 leading-relaxed">${text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>')}</span>
        </li>`
    } else {
      if (inList) {
        html += '</ul>'
        inList = false
      }
      if (trimmed) {
        html += `<p class="mb-4 text-gray-700 leading-relaxed">${trimmed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>')}</p>`
      }
    }
  }

  if (inList) {
    html += '</ul>'
  }

  return html
}
