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
  Map as MapIcon,
  History,
  Target,
  Blocks,
  LayoutGrid,
  ClipboardCheck,
  Bookmark,
} from 'lucide-react'
import { authFetch } from '@/lib/auth-fetch'
import { AssignmentRow, practiceHref, useClasswork } from '@/components/student/classwork'
import { dueLabel, openWork } from '@/lib/student/classwork-rules'
import type { StudentPractice } from '@/lib/student/classwork'
import { cn } from '@/lib/utils'
import { displaySerif } from '@/lib/formats/fonts'
import { fontDisplay } from '@/lib/formats/design'
import { LibraryHeader, SearchBox, FilterChip, SelectToggle, relativeDate, CardSkeletonGrid } from '@/components/library/library-parts'
import AssignToClassDialog from '@/components/assign-to-class-dialog'
import { CLASSES_ENABLED } from '@/lib/features'
import { displaySubject, displayLevel } from '@/lib/study-options'
import { signInPath } from '@/lib/sign-in-path'

// Cover styling per format. Class strings are literal so Tailwind keeps them.
const FORMAT_CARD = {
  outline: { label: 'Outline', icon: List, cover: 'from-blue-100 via-blue-50 to-white', text: 'text-blue-700', tile: 'bg-blue-50 text-blue-700', watermark: 'text-blue-200/80' },
  flashcards: { label: 'Flashcards', icon: CreditCard, cover: 'from-indigo-100 via-indigo-50 to-white', text: 'text-indigo-700', tile: 'bg-indigo-50 text-indigo-700', watermark: 'text-indigo-200/80' },
  quiz: { label: 'Quiz', icon: HelpCircle, cover: 'from-purple-100 via-purple-50 to-white', text: 'text-purple-700', tile: 'bg-purple-50 text-purple-700', watermark: 'text-purple-200/80' },
  summary: { label: 'Summary', icon: ScrollText, cover: 'from-green-100 via-green-50 to-white', text: 'text-green-700', tile: 'bg-green-50 text-green-700', watermark: 'text-green-200/80' },
  practice: { label: 'Practice', icon: Puzzle, cover: 'from-orange-100 via-orange-50 to-white', text: 'text-orange-700', tile: 'bg-orange-50 text-orange-700', watermark: 'text-orange-200/80' },
  plan: { label: 'Study plan', icon: MapIcon, cover: 'from-teal-100 via-teal-50 to-white', text: 'text-teal-700', tile: 'bg-teal-50 text-teal-700', watermark: 'text-teal-200/80' },
  cheatsheet: { label: 'Cheat sheet', icon: FileText, cover: 'from-slate-200 via-slate-100 to-white', text: 'text-slate-700', tile: 'bg-slate-100 text-slate-700', watermark: 'text-slate-300/80' },
  timeline: { label: 'Timeline', icon: History, cover: 'from-fuchsia-100 via-fuchsia-50 to-white', text: 'text-fuchsia-700', tile: 'bg-fuchsia-50 text-fuchsia-700', watermark: 'text-fuchsia-200/80' },
  adaptive: { label: 'Adaptive', icon: Target, cover: 'from-sky-100 via-sky-50 to-white', text: 'text-sky-700', tile: 'bg-sky-50 text-sky-700', watermark: 'text-sky-200/80' },
  custom: { label: 'Custom', icon: Blocks, cover: 'from-cyan-100 via-sky-50 to-white', text: 'text-cyan-700', tile: 'bg-cyan-50 text-cyan-700', watermark: 'text-cyan-200/80' },
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
      // The API identifies the owner from the session token, not the body.
      const { data: { session } } = await supabase.auth.getSession()
      const results = await Promise.allSettled(
        idsToDelete.map(id =>
          fetch(`/api/study-guides/${id}`, {
            method: 'DELETE',
            credentials: 'omit',
            headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
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
    const pickable = filteredAndSortedGuides.filter(isMine)
    if (selectedIds.size === pickable.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pickable.map(g => g.id)))
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
        router.push(signInPath())
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



  // Where a guide came from: assigned by a teacher, shared with their class, or saved from someone.
  const classwork = useClasswork()
  const [origins, setOrigins] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!user) return
    let live = true
    void authFetch('/api/study-guides/origins', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { origins: {} }))
      .then((d) => { if (live) setOrigins(d.origins ?? {}) })
      .catch(() => {})
    return () => { live = false }
  }, [user])
  const teacherOfClass = useMemo(() => new Map((classwork?.classes ?? []).map((c) => [c.id, c.teacherName])), [classwork])
  const classNameOf = useMemo(() => new Map((classwork?.classes ?? []).map((c) => [c.id, c.name])), [classwork])
  const assignedByGuide = useMemo(() => {
    const map = new Map<string, StudentPractice>()
    // Open work first, so a guide assigned twice points at the one still to do.
    const list = [...(classwork?.assignments ?? [])].sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done'))
    for (const a of list) if (!map.has(a.guideId)) map.set(a.guideId, a)
    return map
  }, [classwork])
  const sharedByGuide = useMemo(() => new Map((classwork?.shared ?? []).map((g) => [g.guideId, g])), [classwork])
  const openAssignments = openWork(classwork?.assignments ?? [])
  type Origin = { kind: 'assigned'; a: StudentPractice; teacher: string | null } | { kind: 'shared'; name: string | null } | { kind: 'from'; name: string }
  const originOf = (guide: StudyGuideRecord): Origin | null => {
    const a = assignedByGuide.get(guide.id) ?? (guide.copied_from ? assignedByGuide.get(guide.copied_from) : undefined)
    if (a) return { kind: 'assigned', a, teacher: teacherOfClass.get(a.classId) ?? null }
    const shared = sharedByGuide.get(guide.id) ?? (guide.copied_from ? sharedByGuide.get(guide.copied_from) : undefined)
    if (shared) return { kind: 'shared', name: teacherOfClass.get(shared.classId) ?? null }
    return origins[guide.id] ? { kind: 'from', name: origins[guide.id] } : null
  }

  // Guides teachers assigned or shared show here too, without a copy (one version, so
  // the work always counts). A copy saved before stands in for its original.
  const [teacherGuides, setTeacherGuides] = useState<StudyGuideRecord[]>([])
  // Students: hold the cards until these are in too, so nothing pops in after the page shows.
  // The tab's last copy shows at once on a return visit.
  const [teacherReady, setTeacherReady] = useState(false)
  const teacherKey = user ? `cs:teacher-guides:${user.id}` : null
  useEffect(() => {
    if (!teacherKey) return
    try {
      const cached = sessionStorage.getItem(teacherKey)
      if (cached) { setTeacherGuides(JSON.parse(cached)); setTeacherReady(true) }
    } catch {}
    // Never hold the page for long if class work can't load.
    const t = setTimeout(() => setTeacherReady(true), 5000)
    return () => clearTimeout(t)
  }, [teacherKey])
  const keepTeacherGuides = (list: StudyGuideRecord[]) => {
    setTeacherGuides(list)
    setTeacherReady(true)
    try { if (teacherKey) sessionStorage.setItem(teacherKey, JSON.stringify(list)) } catch {}
  }
  useEffect(() => {
    if (!classwork || !user || guidesLoading) return
    const dated = new Map<string, string>() // guide id -> when it was given to them
    for (const x of [...classwork.assignments, ...(classwork.shared ?? [])]) {
      if (!dated.has(x.guideId) || dated.get(x.guideId)! < x.createdAt) dated.set(x.guideId, x.createdAt)
    }
    const have = new Set(studyGuides.flatMap((g) => [g.id, g.copied_from].filter((v): v is string => !!v)))
    const ids = [...dated.keys()].filter((id) => !have.has(id))
    if (!ids.length) { keepTeacherGuides([]); return }
    let live = true
    void supabase.from('study_guides').select('*').in('id', ids).then(({ data }) => {
      if (live) keepTeacherGuides(((data ?? []) as StudyGuideRecord[]).map((g) => ({ ...g, created_at: dated.get(g.id) ?? g.created_at })))
    })
    return () => { live = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classwork, user, studyGuides, guidesLoading])
  const loading = authLoading || guidesLoading || (user?.user_type !== 'teacher' && !teacherReady)
  const allGuides = useMemo(() => [...studyGuides, ...teacherGuides], [studyGuides, teacherGuides])
  const isMine = (guide: StudyGuideRecord) => guide.user_id === user?.id
  const [fromTeachers, setFromTeachers] = useState(false)
  const teacherCount = allGuides.filter((g) => { const o = originOf(g); return o?.kind === 'assigned' || o?.kind === 'shared' }).length

  // Filtered and sorted study guides
  const filteredAndSortedGuides = useMemo(() => {
    let filtered = [...allGuides]
    if (fromTeachers) filtered = filtered.filter((g) => { const o = originOf(g); return o?.kind === 'assigned' || o?.kind === 'shared' })

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allGuides, fromTeachers, subjectFilter, formatFilter, sortBy, searchQuery, classwork, origins])

  // Get unique subjects from study guides
  const availableSubjects = useMemo(() => {
    const subjects = new Set(allGuides.map(guide => guide.subject))
    return Array.from(subjects).sort()
  }, [allGuides])

  const formatCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const g of allGuides) counts[g.format] = (counts[g.format] || 0) + 1
    return counts
  }, [allGuides])

  const selecting = selectedIds.size > 0

  // Titles of the user's study plans, to label guides made from a plan unit.
  const planTitles = useMemo(() => {
    const map: Record<string, string> = {}
    for (const g of studyGuides) if (g.format === 'plan') map[g.id] = g.title
    return map
  }, [studyGuides])
  const clearFilters = () => {
    setSubjectFilter('all')
    setFormatFilter('all')
    setSearchQuery('')
    setFromTeachers(false)
  }

  return (
    <div className={cn(displaySerif.variable, 'min-h-screen bg-slate-50')}>
      <NavigationHeader />

      <LibraryHeader
        title="My Guides"
        subtitle={teacherCount ? "Everything you've made or your teachers gave you." : "Everything you've made, ready to study."}
        count={allGuides.length}
        noun="guide"
        actionHref="/"
        actionLabel="New guide"
      />

      <div className="container mx-auto px-4 py-8">
        {/* Assigned work still to do lives here too: students look for it in My Guides. */}
        {!loading && openAssignments.length > 0 && (
          <section className="mb-8 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><ClipboardCheck className="h-5 w-5 text-emerald-700" /> Assigned to you</h2>
              <Link href="/my-class" className="text-sm font-semibold text-blue-700 hover:text-blue-800">All class work <ArrowRight className="inline h-4 w-4" /></Link>
            </div>
            <div className="space-y-2">
              {openAssignments.map((a) => <AssignmentRow key={a.id} a={a} className={classNameOf.get(a.classId) ?? null} />)}
            </div>
          </section>
        )}

        {/* Toolbar */}
        {!loading && allGuides.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <SearchBox value={searchQuery} onChange={setSearchQuery} placeholder="Search your guides…" />
              <div className="flex gap-3">
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger aria-label="Filter by subject" className="h-11 w-full rounded-xl bg-white sm:w-44">
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
                  <SelectTrigger aria-label="Sort guides" className="h-11 w-full rounded-xl bg-white sm:w-40">
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
            <div className="-mx-4 flex items-center gap-2.5 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:px-0">
              <FilterChip active={formatFilter === 'all' && !fromTeachers} onClick={() => { setFormatFilter('all'); setFromTeachers(false) }} count={allGuides.length} icon={<LayoutGrid />}>All</FilterChip>
              {teacherCount > 0 && (
                <FilterChip active={fromTeachers} onClick={() => setFromTeachers((v) => !v)} count={teacherCount} icon={<ClipboardCheck />} tile="bg-emerald-50 text-emerald-700">From your teachers</FilterChip>
              )}
              {(Object.keys(FORMAT_CARD) as Array<keyof typeof FORMAT_CARD>).filter((f) => formatCounts[f]).map((f) => {
                const Icon = FORMAT_CARD[f].icon
                return (
                  <FilterChip key={f} active={formatFilter === f} onClick={() => setFormatFilter(formatFilter === f ? 'all' : f)} count={formatCounts[f]} icon={<Icon />} tile={FORMAT_CARD[f].tile}>
                    {FORMAT_CARD[f].label}
                  </FilterChip>
                )
              })}
              <span className="ml-auto hidden text-sm text-slate-500 sm:block">
                {filteredAndSortedGuides.length !== allGuides.length && `${filteredAndSortedGuides.length} shown · `}
                <button type="button" onClick={toggleSelectAll} className="ml-2 inline-flex h-11 items-center rounded-2xl bg-white px-4 font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 transition hover:text-slate-900 hover:shadow-md hover:ring-slate-300">
                  {selectedIds.size === filteredAndSortedGuides.filter(isMine).length && selecting ? 'Deselect all' : 'Select'}
                </button>
              </span>
            </div>
          </div>
        )}

        {loading && <CardSkeletonGrid />}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">{error}</div>
        )}

        {/* Empty state */}
        {!loading && !error && allGuides.length === 0 && (
          <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><BookOpen className="h-8 w-8" /></span>
            <h3 className={cn(fontDisplay, 'text-2xl font-semibold text-slate-900')}>No study guides yet</h3>
            <p className="mt-2 max-w-md text-slate-500">Type a topic or upload your class slides and your first guide will be ready in about a minute.</p>
            <Button asChild size="lg" className="mt-6 bg-blue-600 hover:bg-blue-700">
              <Link href="/"><Plus className="mr-2 h-5 w-5" /> Create your first guide</Link>
            </Button>
          </div>
        )}

        {!loading && !error && allGuides.length > 0 && (
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
                const parentTitle = guide.parent_guide_id ? planTitles[guide.parent_guide_id] : undefined
                const origin = originOf(guide)
                return (
                  <article
                    key={guide.id}
                    onClick={() => (selecting && isMine(guide) ? toggleSelection(guide.id) : router.push(origin?.kind === 'assigned' ? practiceHref(origin.a) : getGuideUrl(guide)))}
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
                      {/* Teachers' guides can't be deleted from here, so they can't be picked. */}
                      {isMine(guide) && <SelectToggle selected={isSelected} selecting={selecting} onToggle={() => toggleSelection(guide.id)} className="absolute right-3 top-3" />}
                    </div>
                    {/* Body */}
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className={cn(fontDisplay, 'line-clamp-2 text-lg font-semibold leading-snug text-slate-900')}>{guide.title}</h3>
                      {origin?.kind === 'assigned' && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                          <ClipboardCheck className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {origin.teacher ? `Assigned by ${origin.teacher}` : 'Assigned to you'}
                            {origin.a.status === 'done' ? ' · Done' : origin.a.dueAt ? ` · ${dueLabel(origin.a.dueAt)}` : ''}
                          </span>
                        </p>
                      )}
                      {origin?.kind === 'shared' && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-blue-800">
                          <BookOpen className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{origin.name ? `From ${origin.name}` : 'From your teacher'}</span>
                        </p>
                      )}
                      {origin?.kind === 'from' && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                          <Bookmark className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">From {origin.name}</span>
                        </p>
                      )}
                      {parentTitle && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-teal-700">
                          <MapIcon className="h-3.5 w-3.5" /> {guide.plan_unit ? `Unit ${guide.plan_unit.replace(/^u/, '')} · ` : ''}{parentTitle}
                        </p>
                      )}
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
