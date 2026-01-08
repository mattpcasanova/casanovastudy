"use client"

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
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
  Calendar,
  GraduationCap,
  Plus,
  Filter,
  ArrowUpDown,
  Search,
  Trash2,
  FileText,
  User
} from 'lucide-react'

interface GradingResult {
  id: string
  student_name: string
  answer_sheet_filename: string | null
  student_exam_filename: string
  total_marks: number
  total_possible_marks: number
  percentage: number
  grade: string
  created_at: string
  user_id: string
}

const gradeColors: Record<string, string> = {
  'A': 'bg-green-100 text-green-800 border-green-300',
  'B': 'bg-blue-100 text-blue-800 border-blue-300',
  'C': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'D': 'bg-orange-100 text-orange-800 border-orange-300',
  'F': 'bg-red-100 text-red-800 border-red-300',
}

export default function GradedExamsPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [gradingResults, setGradingResults] = useState<GradingResult[]>([])
  const [resultsLoading, setResultsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter, sort, and search state
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'grade-asc' | 'grade-desc'>('date-desc')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDeleteResult = async (resultId: string) => {
    if (!user) return
    setDeletingId(resultId)
    try {
      const response = await fetch(`/api/grading-results/${resultId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete grading result')
      }

      // Remove from local state
      setGradingResults(prev => prev.filter(result => result.id !== resultId))
    } catch (err) {
      console.error('Error deleting grading result:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete grading result')
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    async function fetchMyResults() {
      // Wait for auth to finish loading before checking user
      if (authLoading) return

      // Only redirect to signin after auth has finished loading and user is null
      if (!user) {
        router.push('/auth/signin')
        return
      }

      try {
        setResultsLoading(true)
        const { data, error: fetchError } = await supabase
          .from('grading_results')
          .select('id, student_name, answer_sheet_filename, student_exam_filename, total_marks, total_possible_marks, percentage, grade, created_at, user_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError

        setGradingResults(data || [])
      } catch (err) {
        console.error('Error fetching grading results:', err)
        setError(err instanceof Error ? err.message : 'Failed to load grading results')
      } finally {
        setResultsLoading(false)
      }
    }

    fetchMyResults()
  }, [user, authLoading, router])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Filtered and sorted grading results
  const filteredAndSortedResults = useMemo(() => {
    let filtered = [...gradingResults]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(result =>
        result.student_name.toLowerCase().includes(query) ||
        result.student_exam_filename.toLowerCase().includes(query)
      )
    }

    // Apply grade filter
    if (gradeFilter !== 'all') {
      filtered = filtered.filter(result => result.grade === gradeFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'name-asc':
          return a.student_name.localeCompare(b.student_name)
        case 'name-desc':
          return b.student_name.localeCompare(a.student_name)
        case 'grade-asc':
          return a.grade.localeCompare(b.grade)
        case 'grade-desc':
          return b.grade.localeCompare(a.grade)
        default:
          return 0
      }
    })

    return filtered
  }, [gradingResults, gradeFilter, sortBy, searchQuery])

  // Get unique grades from results
  const availableGrades = useMemo(() => {
    const grades = new Set(gradingResults.map(result => result.grade))
    return Array.from(grades).sort()
  }, [gradingResults])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <NavigationHeader user={user} onSignOut={signOut} />

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-primary via-secondary to-accent text-white">
        <div className="container mx-auto px-4 py-10">
          <div className="relative">
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1">Graded Exams</h1>
              <p className="text-sm sm:text-base opacity-75">
                View and manage all your graded exam results
              </p>
            </div>
            <Button asChild size="lg" className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/50 absolute top-0 right-0 hidden sm:flex">
              <Link href="/grade-exam">
                <Plus className="h-5 w-5 mr-2" />
                Grade New Exam
              </Link>
            </Button>
            <Button asChild size="lg" className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/50 mt-4 sm:hidden w-full">
              <Link href="/grade-exam">
                <Plus className="h-5 w-5 mr-2" />
                Grade New Exam
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">

        {/* Filters and Sort - Only show if there are results */}
        {!authLoading && !resultsLoading && gradingResults.length > 0 && (
          <Card className="mb-6 border-2">
            <CardContent className="pt-6">
              {/* Search Input */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by student name or filename..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Grade Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filter by Grade
                  </label>
                  <Select value={gradeFilter} onValueChange={setGradeFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All grades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      {availableGrades.map(grade => (
                        <SelectItem key={grade} value={grade}>
                          Grade {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Sort By
                  </label>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Newest First</SelectItem>
                      <SelectItem value="date-asc">Oldest First</SelectItem>
                      <SelectItem value="name-asc">Student Name (A-Z)</SelectItem>
                      <SelectItem value="name-desc">Student Name (Z-A)</SelectItem>
                      <SelectItem value="grade-asc">Grade (A-F)</SelectItem>
                      <SelectItem value="grade-desc">Grade (F-A)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active filters summary */}
              {(gradeFilter !== 'all' || searchQuery.trim()) && (
                <div className="mt-4 flex items-center gap-2 flex-wrap text-sm text-gray-600">
                  <span>Active filters:</span>
                  {searchQuery.trim() && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setSearchQuery('')}>
                      Search: "{searchQuery}" ✕
                    </Badge>
                  )}
                  {gradeFilter !== 'all' && (
                    <Badge variant="secondary" className="cursor-pointer" onClick={() => setGradeFilter('all')}>
                      Grade {gradeFilter} ✕
                    </Badge>
                  )}
                  <Button
                    variant="link"
                    size="sm"
                    className="text-blue-600 h-auto p-0"
                    onClick={() => {
                      setGradeFilter('all')
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
        {(authLoading || resultsLoading) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="h-48">
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
        {!authLoading && !resultsLoading && !error && gradingResults.length === 0 && (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <GraduationCap className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No graded exams yet
              </h3>
              <p className="text-gray-500 mb-6 text-center max-w-md">
                Start grading your first exam! Upload a mark scheme and student exam to get AI-powered grading.
              </p>
              <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
                <Link href="/grade-exam">
                  <Plus className="h-5 w-5 mr-2" />
                  Grade Your First Exam
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Grading Results Grid */}
        {!authLoading && !resultsLoading && !error && gradingResults.length > 0 && (
          <div>
            <div className="mb-4 text-sm text-gray-600">
              Showing {filteredAndSortedResults.length} of {gradingResults.length} {gradingResults.length === 1 ? 'result' : 'results'}
            </div>
            {filteredAndSortedResults.length === 0 ? (
              <Card className="border-2 border-dashed border-gray-300">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Filter className="h-12 w-12 text-gray-400 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    No results match your filters
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Try adjusting your filters to see more results
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setGradeFilter('all')
                      setSearchQuery('')
                    }}
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedResults.map((result) => {
                  const gradeColor = gradeColors[result.grade] || gradeColors['F']

                  return (
                    <Card
                      key={result.id}
                      className="h-full hover:shadow-xl transition-shadow cursor-pointer border-2 hover:border-blue-300 group"
                      onClick={() => router.push(`/grade-report/${result.id}`)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <Badge className={`${gradeColor} border text-lg px-3 py-1`}>
                            {result.grade}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-blue-600">
                              {result.percentage.toFixed(0)}%
                            </span>
                            {/* Delete Button */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 bg-white"
                                  onClick={(e) => e.stopPropagation()}
                                  disabled={deletingId === result.id}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Grading Result</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the grading result for "{result.student_name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => handleDeleteResult(result.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        <CardTitle className="text-xl line-clamp-1 flex items-center gap-2">
                          <User className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          {result.student_name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-2">
                          <span className="font-medium text-blue-600">
                            {result.total_marks}/{result.total_possible_marks} marks
                          </span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(result.created_at)}
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600 line-clamp-1 flex items-center gap-1">
                          <FileText className="h-3 w-3 flex-shrink-0" />
                          {result.student_exam_filename}
                        </div>
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
