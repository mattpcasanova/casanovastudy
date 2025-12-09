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
    <div className="max-w-4xl mx-auto">
      {/* Introduction Card */}
      <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <BookOpen className="h-8 w-8 text-blue-600 mt-1" />
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
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Star className="h-6 w-6 text-green-600 mt-1" />
            <div>
              <h3 className="text-xl font-bold text-green-900 mb-3">Study Tips</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>Focus on understanding the main concepts and their relationships</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>Create your own examples to reinforce learning</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>Practice explaining concepts in your own words</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>Review regularly to strengthen memory retention</span>
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Check for section headers
    if (line.startsWith('# ')) {
      if (currentSection) {
        sections.push(currentSection)
      }
      currentSection = {
        title: line.replace(/^#\s+/, ''),
        content: '',
        keyTerms: []
      }
      inKeyTerms = false
    } else if (line.startsWith('## ')) {
      if (currentSection) {
        sections.push(currentSection)
      }
      currentSection = {
        title: line.replace(/^##\s+/, ''),
        content: '',
        keyTerms: []
      }
      inKeyTerms = false
    } else if (line.toLowerCase().includes('key terms') || line.toLowerCase().includes('vocabulary')) {
      inKeyTerms = true
    } else if (currentSection) {
      if (inKeyTerms && line.includes(':')) {
        const colonIndex = line.indexOf(':')
        const term = line.substring(0, colonIndex).trim().replace(/^[-•*]\s*/, '')
        const definition = line.substring(colonIndex + 1).trim()
        if (term && definition) {
          currentSection.keyTerms!.push({ term, definition })
        }
      } else {
        currentSection.content += (currentSection.content ? '\n' : '') + line
      }
    }
  }

  if (currentSection) {
    sections.push(currentSection)
  }

  // If no sections found, create one from all content
  if (sections.length === 0) {
    sections.push({
      title: 'Summary',
      content: content,
      keyTerms: []
    })
  }

  return sections
}

function formatContent(content: string): string {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc ml-6 space-y-2 my-4">$&</ul>')
    .split('\n\n')
    .map(para => `<p class="mb-4 text-gray-700 leading-relaxed">${para}</p>`)
    .join('')
}

function formatContentWithKeyPoints(content: string): string {
  const lines = content.split('\n')
  let html = ''
  let inList = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
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
