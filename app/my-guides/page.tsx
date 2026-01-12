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
  Trash2,
  Check,
  Loader2,
  X
} from 'lucide-react'

const formatIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  outline: AlignLeft,
  flashcards: Layers,
  quiz: ListChecks,
  summary: Brain,
  custom: BookOpen
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
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [studyGuides, setStudyGuides] = useState<StudyGuideRecord[]>([])
  const [guidesLoading, setGuidesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter, sort, and search state
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [formatFilter, setFormatFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title-asc' | 'title-desc'>('date-desc')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const handleBulkDelete = async () => {
    if (!user || selectedIds.size === 0) return

    const idsToDelete = Array.from(selectedIds)
    setDeletingIds(new Set(idsToDelete))

    try {
      const results = await Promise.allSettled(
        idsToDelete.map(id =>
          fetch(`/api/study-guides/${id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id }),
          })
        )
      )

      const successfulDeletes = idsToDelete.filter((_, index) =>
        results[index].status === 'fulfilled' &&
        (results[index] as PromiseFulfilledResult<Response>).value.ok
      )

      setStudyGuides(prev => prev.filter(guide => !successfulDeletes.includes(guide.id)))
      setSelectedIds(new Set())
      setShowBulkDeleteDialog(false)

      const failedCount = idsToDelete.length - successfulDeletes.length
      if (failedCount > 0) {
        alert(`${successfulDeletes.length} guides deleted. ${failedCount} failed to delete.`)
      }
    } catch (err) {
      console.error('Error bulk deleting:', err)
      alert('Failed to delete some guides')
    } finally {
      setDeletingIds(new Set())
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedGuides.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredAndSortedGuides.map(g => g.id)))
    }
  }

  // Get the correct URL for a guide (handles static guides)
  const getGuideUrl = (guide: StudyGuideRecord): string => {
    // Check if this is a static guide with a custom route
    const customContent = guide.custom_content as { static_route?: string; is_static?: boolean } | undefined
    if (customContent?.is_static && customContent?.static_route) {
      return customContent.static_route
    }
    return `/study-guide/${guide.id}`
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
      <NavigationHeader />

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
            {/* Results header with select all */}
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {filteredAndSortedGuides.length} of {studyGuides.length} {studyGuides.length === 1 ? 'guide' : 'guides'}
                {selectedIds.size > 0 && (
                  <span className="ml-2 text-blue-600 font-medium">
                    ({selectedIds.size} selected)
                  </span>
                )}
              </div>
              {filteredAndSortedGuides.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="text-gray-600"
                >
                  {selectedIds.size === filteredAndSortedGuides.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
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
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAndSortedGuides.map((guide) => {
                    const FormatIcon = formatIcons[guide.format]
                    const subjectColor = subjectColors[guide.subject as keyof typeof subjectColors] || subjectColors.other
                    const isSelected = selectedIds.has(guide.id)
                    const isDeleting = deletingIds.has(guide.id)

                    return (
                      <Card
                      key={guide.id}
                      className={`h-full hover:shadow-xl transition-all cursor-pointer border-2 group relative ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-200'
                          : 'hover:border-blue-300'
                      } ${isDeleting ? 'opacity-50' : ''}`}
                      onClick={() => router.push(getGuideUrl(guide))}
                    >
                      {/* Format icon and selection checkbox */}
                      <div className="absolute top-2 right-2 flex items-center gap-3 z-10">
                        <FormatIcon className="h-6 w-6 text-gray-400" />
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-100'
                              : 'bg-transparent hover:bg-gray-100'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSelection(guide.id)
                          }}
                        >
                          <div
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-blue-500 border-blue-500 shadow-md'
                                : 'bg-white border-gray-300 shadow-sm group-hover:border-gray-400'
                            }`}
                          >
                            {isSelected && <Check className="h-4 w-4 text-white" />}
                          </div>
                        </div>
                      </div>

                      <CardHeader className="pr-16">
                        <div className="flex items-start justify-between mb-2">
                          <Badge className={`${subjectColor} border`}>
                            {formatSubject(guide.subject)}
                          </Badge>
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

                {/* Hint text */}
                {filteredAndSortedGuides.length > 0 && (
                  <p className="text-center text-sm text-gray-500 mt-6">
                    Click a guide to open it. Use the checkbox to select multiple.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Floating action bar when items are selected */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-gray-900 text-white rounded-lg shadow-2xl px-4 py-3 flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedIds.size} {selectedIds.size === 1 ? 'guide' : 'guides'} selected
            </span>
            <div className="h-6 w-px bg-gray-600" />
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:bg-red-900/50 hover:text-red-300"
              onClick={() => setShowBulkDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:bg-gray-700 hover:text-white h-8 w-8"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} {selectedIds.size === 1 ? 'Guide' : 'Guides'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} {selectedIds.size === 1 ? 'study guide' : 'study guides'}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleBulkDelete}
            >
              Delete {selectedIds.size} {selectedIds.size === 1 ? 'Guide' : 'Guides'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
