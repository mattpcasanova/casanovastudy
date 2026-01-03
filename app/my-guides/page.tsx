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
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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
  ArrowUpDown,
  Search,
  Trash2
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
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [studyGuides, setStudyGuides] = useState<StudyGuideRecord[]>([])
  const [guidesLoading, setGuidesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter, sort, and search state
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [formatFilter, setFormatFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title-asc' | 'title-desc'>('date-desc')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDeleteGuide = async (guideId: string) => {
    if (!user) return
    setDeletingId(guideId)
    try {
      const response = await fetch(`/api/study-guides/${guideId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete study guide')
      }

      // Remove from local state
      setStudyGuides(prev => prev.filter(guide => guide.id !== guideId))
    } catch (err) {
      console.error('Error deleting study guide:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete study guide')
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    async function fetchMyGuides() {
      // Wait for auth to finish loading before checking user
      if (authLoading) return

      // Only redirect to signin after auth has finished loading and user is null
      if (!user) {
        router.push('/auth/signin')
        return
      }

      try {
        setGuidesLoading(true)
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
        setGuidesLoading(false)
      }
    }

    fetchMyGuides()
  }, [user, authLoading, router])

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

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(guide =>
        guide.title.toLowerCase().includes(query)
      )
    }

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
  }, [studyGuides, subjectFilter, formatFilter, sortBy, searchQuery])

  // Get unique subjects from study guides
  const availableSubjects = useMemo(() => {
    const subjects = new Set(studyGuides.map(guide => guide.subject))
    return Array.from(subjects).sort()
  }, [studyGuides])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <NavigationHeader user={user} onSignOut={signOut} />

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-primary via-secondary to-accent text-white">
        <div className="container mx-auto px-4 py-10">
          <div className="relative">
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1">My Study Guides</h1>
              <p className="text-sm sm:text-base opacity-75">
                All your personalized study materials in one place
              </p>
            </div>
            <Button asChild size="lg" className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/50 absolute top-0 right-0 hidden sm:flex">
              <Link href="/">
                <Plus className="h-5 w-5 mr-2" />
                Create New Guide
              </Link>
            </Button>
            <Button asChild size="lg" className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/50 mt-4 sm:hidden w-full">
              <Link href="/">
                <Plus className="h-5 w-5 mr-2" />
                Create New Guide
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">

        {/* Filters and Sort - Only show if there are guides */}
        {!authLoading && !guidesLoading && studyGuides.length > 0 && (
          <Card className="mb-6 border-2">
            <CardContent className="pt-6">
              {/* Search Input */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

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
              {(subjectFilter !== 'all' || formatFilter !== 'all' || searchQuery.trim()) && (
                <div className="mt-4 flex items-center gap-2 flex-wrap text-sm text-gray-600">
                  <span>Active filters:</span>
                  {searchQuery.trim() && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setSearchQuery('')}>
                      Search: "{searchQuery}" ✕
                    </Badge>
                  )}
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
                      setSearchQuery('')
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
        {(authLoading || guidesLoading) && (
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
        {!authLoading && !guidesLoading && !error && studyGuides.length === 0 && (
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
        {!authLoading && !guidesLoading && !error && studyGuides.length > 0 && (
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
                  <Card
                    key={guide.id}
                    className="h-full hover:shadow-xl transition-shadow cursor-pointer border-2 hover:border-blue-300 group"
                    onClick={() => router.push(`/study-guide/${guide.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <Badge className={`${subjectColor} border`}>
                          {formatSubject(guide.subject)}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <FormatIcon className="h-5 w-5 text-gray-400" />
                          {/* Delete Button - Aligned with format icon */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 bg-white"
                                onClick={(e) => e.stopPropagation()}
                                disabled={deletingId === guide.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Study Guide</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{guide.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => handleDeleteGuide(guide.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
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
