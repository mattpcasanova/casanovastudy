"use client"

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { supabase, StudyGuideRecord } from '@/lib/supabase'
import NavigationHeader from '@/components/navigation-header'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Plus,
  Filter,
  ArrowUpDown,
  ArrowRight,
  Trash2,
  X,
  School,
  Puzzle,
  List,
  CreditCard,
  HelpCircle,
  ScrollText,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { displaySerif } from '@/lib/formats/fonts'
import { fontDisplay } from '@/lib/formats/design'
import { LibraryHeader, SearchBox, FilterChip, SelectToggle, relativeDate, CardSkeletonGrid } from '@/components/library/library-parts'
import AssignToClassDialog from '@/components/assign-to-class-dialog'
import { CLASSES_ENABLED } from '@/lib/features'
import { displaySubject, displayLevel } from '@/lib/study-options'

// Cover styling per format. Class strings are literal so Tailwind keeps them.
const FORMAT_CARD = {
  outline: { label: 'Outline', icon: List, cover: 'from-blue-100 via-blue-50 to-white', text: 'text-blue-700', watermark: 'text-blue-200/80' },
  flashcards: { label: 'Flashcards', icon: CreditCard, cover: 'from-indigo-100 via-indigo-50 to-white', text: 'text-indigo-700', watermark: 'text-indigo-200/80' },
  quiz: { label: 'Quiz', icon: HelpCircle, cover: 'from-purple-100 via-purple-50 to-white', text: 'text-purple-700', watermark: 'text-purple-200/80' },
  summary: { label: 'Summary', icon: ScrollText, cover: 'from-green-100 via-green-50 to-white', text: 'text-green-700', watermark: 'text-green-200/80' },
  practice: { label: 'Practice', icon: Puzzle, cover: 'from-orange-100 via-orange-50 to-white', text: 'text-orange-700', watermark: 'text-orange-200/80' },
  custom: { label: 'Custom', icon: Sparkles, cover: 'from-cyan-100 via-sky-50 to-white', text: 'text-cyan-700', watermark: 'text-cyan-200/80' },
} as const

// Skip the topic snippet when it just repeats the title (guides made from a typed topic).
function showTopic(title: string, topic?: string | null): boolean {
  if (!topic) return false
  const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const t = norm(title).replace(/ $/, '')
  const f = norm(topic)
  return !(f.startsWith(t) || t.startsWith(f.slice(0, Math.max(12, t.length - 3))))
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

  const formatCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const g of studyGuides) counts[g.format] = (counts[g.format] || 0) + 1
    return counts
  }, [studyGuides])

  const selecting = selectedIds.size > 0
  const clearFilters = () => {
    setSubjectFilter('all')
    setFormatFilter('all')
    setSearchQuery('')
  }

  return (
    <div className={cn(displaySerif.variable, 'min-h-screen bg-slate-50')}>
      <NavigationHeader />

      <LibraryHeader
        title="My Guides"
        subtitle="Everything you've made, ready to study."
        count={studyGuides.length}
        noun="guide"
        actionHref="/"
        actionLabel="New guide"
      />

      <div className="container mx-auto px-4 py-8">
        {/* Toolbar */}
        {!authLoading && !guidesLoading && studyGuides.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <SearchBox value={searchQuery} onChange={setSearchQuery} placeholder="Search your guides…" />
              <div className="flex gap-3">
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger className="h-11 w-full rounded-xl bg-white sm:w-44">
                    <SelectValue placeholder="All subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All subjects</SelectItem>
                    {availableSubjects.filter((s) => s !== 'general').map(subject => (
                      <SelectItem key={subject} value={subject}>{displaySubject(subject)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                  <SelectTrigger className="h-11 w-full rounded-xl bg-white sm:w-40">
                    <ArrowUpDown className="mr-1 h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Newest first</SelectItem>
                    <SelectItem value="date-asc">Oldest first</SelectItem>
                    <SelectItem value="title-asc">Title A–Z</SelectItem>
                    <SelectItem value="title-desc">Title Z–A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              <FilterChip active={formatFilter === 'all'} onClick={() => setFormatFilter('all')} count={studyGuides.length}>All</FilterChip>
              {(Object.keys(FORMAT_CARD) as Array<keyof typeof FORMAT_CARD>).filter((f) => formatCounts[f]).map((f) => {
                const Icon = FORMAT_CARD[f].icon
                return (
                  <FilterChip key={f} active={formatFilter === f} onClick={() => setFormatFilter(formatFilter === f ? 'all' : f)} count={formatCounts[f]}>
                    <Icon className="h-3.5 w-3.5" /> {FORMAT_CARD[f].label}
                  </FilterChip>
                )
              })}
              <span className="ml-auto hidden text-sm text-slate-500 sm:block">
                {filteredAndSortedGuides.length !== studyGuides.length && `${filteredAndSortedGuides.length} shown · `}
                <button type="button" onClick={toggleSelectAll} className="font-medium text-blue-700 hover:underline">
                  {selectedIds.size === filteredAndSortedGuides.length && selecting ? 'Deselect all' : 'Select'}
                </button>
              </span>
            </div>
          </div>
        )}

        {(authLoading || guidesLoading) && <CardSkeletonGrid />}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">{error}</div>
        )}

        {/* Empty state */}
        {!authLoading && !guidesLoading && !error && studyGuides.length === 0 && (
          <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><BookOpen className="h-8 w-8" /></span>
            <h3 className={cn(fontDisplay, 'text-2xl font-semibold text-slate-900')}>No study guides yet</h3>
            <p className="mt-2 max-w-md text-slate-500">Type a topic or upload your class slides and your first guide will be ready in about a minute.</p>
            <Button asChild size="lg" className="mt-6 bg-blue-600 hover:bg-blue-700">
              <Link href="/"><Plus className="mr-2 h-5 w-5" /> Create your first guide</Link>
            </Button>
          </div>
        )}

        {!authLoading && !guidesLoading && !error && studyGuides.length > 0 && (
          filteredAndSortedGuides.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <Filter className="mb-3 h-10 w-10 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-800">No guides match</h3>
              <p className="mb-4 mt-1 text-slate-500">Try a different search or filter.</p>
              <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedGuides.map((guide) => {
                const meta = FORMAT_CARD[guide.format as keyof typeof FORMAT_CARD] ?? FORMAT_CARD.custom
                const Icon = meta.icon
                const isSelected = selectedIds.has(guide.id)
                const details = [displaySubject(guide.subject), displayLevel(guide.grade_level)].filter(Boolean)
                return (
                  <article
                    key={guide.id}
                    onClick={() => (selecting ? toggleSelection(guide.id) : router.push(getGuideUrl(guide)))}
                    className={cn(
                      'group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
                      isSelected ? 'border-blue-500 ring-4 ring-blue-500/15' : 'border-slate-200 hover:border-slate-300',
                      deletingIds.has(guide.id) && 'pointer-events-none opacity-50'
                    )}
                  >
                    {/* Cover */}
                    <div className={cn('relative h-24 overflow-hidden bg-gradient-to-br', meta.cover)}>
                      <Icon className={cn('absolute -bottom-4 -right-3 h-24 w-24 rotate-[-12deg] transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105', meta.watermark)} strokeWidth={1.5} />
                      <span className={cn('absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold shadow-sm', meta.text)}>
                        <Icon className="h-3.5 w-3.5" /> {meta.label}
                      </span>
                      <SelectToggle selected={isSelected} selecting={selecting} onToggle={() => toggleSelection(guide.id)} className="absolute right-3 top-3" />
                    </div>
                    {/* Body */}
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className={cn(fontDisplay, 'line-clamp-2 text-lg font-semibold leading-snug text-slate-900')}>{guide.title}</h3>
                      {details.length > 0 && <p className="mt-1.5 text-sm font-medium text-slate-500">{details.join(' · ')}</p>}
                      {showTopic(guide.title, guide.topic_focus) && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500">{guide.topic_focus}</p>}
                      {CLASSES_ENABLED && user?.user_type === 'teacher' && (
                        <div className="mt-3" onClick={e => e.stopPropagation()}>
                          <AssignToClassDialog
                            studyGuideIds={[guide.id]}
                            studyGuideTitle={guide.title}
                            trigger={
                              <Button variant="outline" size="sm" className="w-full border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800">
                                <School className="mr-1.5 h-3 w-3" /> Assign to Class
                              </Button>
                            }
                          />
                        </div>
                      )}
                    </div>
                    {/* Footer */}
                    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
                      <span className="flex items-center gap-3">
                        <span>{relativeDate(guide.created_at)}</span>
                        {guide.file_count > 0 && (
                          <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {guide.file_count}</span>
                        )}
                      </span>
                      <span className={cn('flex items-center gap-1 font-semibold opacity-0 transition group-hover:opacity-100', meta.text)}>
                        Open <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>
          )
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
            {CLASSES_ENABLED && user?.user_type === 'teacher' && (
              <AssignToClassDialog
                studyGuideIds={Array.from(selectedIds)}
                onSaved={() => setSelectedIds(new Set())}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-400 hover:bg-green-900/50 hover:text-green-300"
                  >
                    <School className="h-4 w-4 mr-2" />
                    Assign
                  </Button>
                }
              />
            )}
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
