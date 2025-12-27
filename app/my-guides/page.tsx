"use client"

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase, StudyGuideRecord } from '@/lib/supabase'
import NavigationHeader from '@/components/navigation-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BookOpen,
  FileText,
  Calendar,
  GraduationCap,
  Plus,
  Layers,
  Brain,
  ListChecks,
  AlignLeft,
  Filter,
  ArrowUpDown
} from 'lucide-react'

const formatIcons = {
  outline: AlignLeft,
  flashcards: Layers,
  quiz: ListChecks,
  summary: Brain
}

const subjectColors = {
  mathematics: 'bg-blue-100 text-blue-800 border-blue-300',
  science: 'bg-green-100 text-green-800 border-green-300',
  english: 'bg-purple-100 text-purple-800 border-purple-300',
  history: 'bg-amber-100 text-amber-800 border-amber-300',
  'foreign-language': 'bg-pink-100 text-pink-800 border-pink-300',
  other: 'bg-gray-100 text-gray-800 border-gray-300'
}

export default function MyGuidesPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [studyGuides, setStudyGuides] = useState<StudyGuideRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter and sort state
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [formatFilter, setFormatFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title-asc' | 'title-desc'>('date-desc')

  useEffect(() => {
    async function fetchMyGuides() {
      if (!user) {
        router.push('/auth/signin')
        return
      }

      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('study_guides')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError

        setStudyGuides(data || [])
      } catch (err) {
        console.error('Error fetching study guides:', err)
        setError(err instanceof Error ? err.message : 'Failed to load study guides')
      } finally {
        setLoading(false)
      }
    }

    fetchMyGuides()
  }, [user, router])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatSubject = (subject: string) => {
    return subject.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  // Filtered and sorted study guides
  const filteredAndSortedGuides = useMemo(() => {
    let filtered = [...studyGuides]

    // Apply subject filter
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(guide => guide.subject === subjectFilter)
    }

    // Apply format filter
    if (formatFilter !== 'all') {
      filtered = filtered.filter(guide => guide.format === formatFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'title-asc':
          return a.title.localeCompare(b.title)
        case 'title-desc':
          return b.title.localeCompare(a.title)
        default:
          return 0
      }
    })

    return filtered
  }, [studyGuides, subjectFilter, formatFilter, sortBy])

  // Get unique subjects from study guides
  const availableSubjects = useMemo(() => {
    const subjects = new Set(studyGuides.map(guide => guide.subject))
    return Array.from(subjects).sort()
  }, [studyGuides])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <NavigationHeader user={user} onSignOut={signOut} />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">My Study Guides</h1>
              <p className="text-gray-600">
                All your personalized study materials in one place
              </p>
            </div>
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Link href="/">
                <Plus className="h-5 w-5 mr-2" />
                Create New Guide
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters and Sort - Only show if there are guides */}
        {!loading && studyGuides.length > 0 && (
          <Card className="mb-6 border-2">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Subject Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filter by Subject
                  </label>
                  <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                    <SelectTrigger className="w-full">
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

                {/* Format Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Filter by Format
                  </label>
                  <Select value={formatFilter} onValueChange={setFormatFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All formats" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Formats</SelectItem>
                      <SelectItem value="outline">Outline</SelectItem>
                      <SelectItem value="flashcards">Flashcards</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="summary">Summary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Sort By
                  </label>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                    <SelectTrigger className="w-full">
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

              {/* Active filters summary */}
              {(subjectFilter !== 'all' || formatFilter !== 'all') && (
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                  <span>Active filters:</span>
                  {subjectFilter !== 'all' && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setSubjectFilter('all')}>
                      {formatSubject(subjectFilter)} ✕
                    </Badge>
                  )}
                  {formatFilter !== 'all' && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setFormatFilter('all')}>
                      {formatFilter} ✕
                    </Badge>
                  )}
                  <Button
                    variant="link"
                    size="sm"
                    className="text-blue-600 h-auto p-0"
                    onClick={() => {
                      setSubjectFilter('all')
                      setFormatFilter('all')
                    }}
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="h-64">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800 text-center">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && studyGuides.length === 0 && (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookOpen className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No study guides yet
              </h3>
              <p className="text-gray-500 mb-6 text-center max-w-md">
                Start creating your first study guide! Upload your materials and let AI generate personalized study content.
              </p>
              <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
                <Link href="/">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Guide
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Study Guides Grid */}
        {!loading && !error && studyGuides.length > 0 && (
          <div>
            <div className="mb-4 text-sm text-gray-600">
              Showing {filteredAndSortedGuides.length} of {studyGuides.length} {studyGuides.length === 1 ? 'guide' : 'guides'}
            </div>
            {filteredAndSortedGuides.length === 0 ? (
              <Card className="border-2 border-dashed border-gray-300">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Filter className="h-12 w-12 text-gray-400 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    No guides match your filters
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Try adjusting your filters to see more results
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSubjectFilter('all')
                      setFormatFilter('all')
                    }}
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedGuides.map((guide) => {
                const FormatIcon = formatIcons[guide.format]
                const subjectColor = subjectColors[guide.subject as keyof typeof subjectColors] || subjectColors.other

                return (
                  <Link key={guide.id} href={`/study-guide/${guide.id}`}>
                    <Card className="h-full hover:shadow-xl transition-shadow cursor-pointer border-2 hover:border-blue-300">
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <Badge className={`${subjectColor} border`}>
                            {formatSubject(guide.subject)}
                          </Badge>
                          <FormatIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <CardTitle className="text-xl line-clamp-2">
                          {guide.title}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            {guide.grade_level}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {guide.format}
                          </span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(guide.created_at)}
                          </div>
                          {guide.file_count > 0 && (
                            <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {guide.file_count} {guide.file_count === 1 ? 'file' : 'files'}
                            </div>
                          )}
                        </div>
                        {guide.topic_focus && (
                          <div className="mt-3 text-sm text-gray-600 line-clamp-2">
                            <span className="font-medium">Focus:</span> {guide.topic_focus}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
