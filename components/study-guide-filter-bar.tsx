"use client"

import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Filter, FileText, ArrowUpDown } from 'lucide-react'

export type SortOption = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc'

interface StudyGuideFilterBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  subjectFilter: string
  onSubjectChange: (value: string) => void
  formatFilter: string
  onFormatChange: (value: string) => void
  sortBy: SortOption
  onSortChange: (value: SortOption) => void
  availableSubjects: string[]
}

function formatSubject(subject: string) {
  return subject.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export default function StudyGuideFilterBar({
  searchQuery,
  onSearchChange,
  subjectFilter,
  onSubjectChange,
  formatFilter,
  onFormatChange,
  sortBy,
  onSortChange,
  availableSubjects,
}: StudyGuideFilterBarProps) {
  const hasActiveFilters =
    subjectFilter !== 'all' || formatFilter !== 'all' || searchQuery.trim().length > 0

  return (
    <Card className="mb-4 border">
      <CardContent className="pt-4 pb-4">
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by title..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              <Filter className="h-3 w-3" />
              Subject
            </label>
            <Select value={subjectFilter} onValueChange={onSubjectChange}>
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="All subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {availableSubjects.map(subject => (
                  <SelectItem key={subject} value={subject}>
                    {formatSubject(subject)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              Format
            </label>
            <Select value={formatFilter} onValueChange={onFormatChange}>
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="All formats" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
                <SelectItem value="flashcards">Flashcards</SelectItem>
                <SelectItem value="quiz">Quiz</SelectItem>
                <SelectItem value="summary">Summary</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5">
              <ArrowUpDown className="h-3 w-3" />
              Sort
            </label>
            <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                <SelectItem value="title-desc">Title (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 flex items-center gap-2 flex-wrap text-xs text-gray-600">
            <span>Active:</span>
            {searchQuery.trim() && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => onSearchChange('')}>
                &ldquo;{searchQuery}&rdquo; ✕
              </Badge>
            )}
            {subjectFilter !== 'all' && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => onSubjectChange('all')}>
                {formatSubject(subjectFilter)} ✕
              </Badge>
            )}
            {formatFilter !== 'all' && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => onFormatChange('all')}>
                {formatFilter} ✕
              </Badge>
            )}
            <Button
              variant="link"
              size="sm"
              className="text-blue-600 h-auto p-0"
              onClick={() => {
                onSearchChange('')
                onSubjectChange('all')
                onFormatChange('all')
              }}
            >
              Clear all
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface FilterableGuide {
  title: string
  subject: string
  format: string
  created_at: string
}

export function applyGuideFilters<T extends FilterableGuide>(
  guides: T[],
  opts: { search: string; subject: string; format: string; sort: SortOption }
): T[] {
  let filtered = [...guides]

  if (opts.search.trim()) {
    const q = opts.search.toLowerCase()
    filtered = filtered.filter(g => g.title.toLowerCase().includes(q))
  }
  if (opts.subject !== 'all') {
    filtered = filtered.filter(g => g.subject === opts.subject)
  }
  if (opts.format !== 'all') {
    filtered = filtered.filter(g => g.format === opts.format)
  }

  filtered.sort((a, b) => {
    switch (opts.sort) {
      case 'date-desc':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'date-asc':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'title-asc':
        return a.title.localeCompare(b.title)
      case 'title-desc':
        return b.title.localeCompare(a.title)
    }
  })

  return filtered
}
