import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { areaBatchesFor } from '@/lib/classes/server'
import { classAreas } from '@/lib/classes/areas'
import { courseKey, courseName, sortYears } from '@/lib/classes/years'

// Courses across years. Without ?key: the teacher's courses (classes linked
// by course name, ignoring period) with their years. With ?key: that course's
// areas year by year, so this year's class can be compared with past ones.
export async function GET(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const supabase = createAdminClient()
  const { data: classes } = await supabase.from('classes').select('id, name, period, course, school_year').eq('teacher_id', user.id)
  const all = (classes ?? []).map((c) => ({ ...c, key: courseKey(c.name, c.course), courseName: courseName(c.name, c.course) }))

  const key = request.nextUrl.searchParams.get('key')
  if (!key) {
    const byKey = new Map<string, { key: string; name: string; years: string[]; classes: number }>()
    for (const c of all) {
      const entry = byKey.get(c.key) ?? { key: c.key, name: c.courseName, years: [], classes: 0 }
      entry.years.push(c.school_year)
      entry.classes += 1
      byKey.set(c.key, entry)
    }
    return NextResponse.json({ courses: [...byKey.values()].map((c) => ({ ...c, years: sortYears(c.years) })).sort((a, b) => a.name.localeCompare(b.name)) })
  }

  const inCourse = all.filter((c) => c.key === key)
  if (!inCourse.length) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  const years = sortYears(inCourse.map((c) => c.school_year))
  const perYear = await Promise.all(years.map(async (year) => {
    const ids = inCourse.filter((c) => c.school_year === year).map((c) => c.id)
    const batches = await areaBatchesFor(supabase, user.id, ids)
    return { year, sets: batches.length, students: new Set(batches.flatMap((b) => b.papers.map((p) => p.rosterId ?? p.name))).size, areas: classAreas(batches) }
  }))

  // One row per area, a column per year (weakest this year first).
  const rows = new Map<string, { name: string; byYear: Record<string, { pct: number; sets: number } | undefined> }>()
  for (const y of perYear) {
    for (const a of y.areas) {
      const k = a.name.trim().toLowerCase()
      const row = rows.get(k) ?? { name: a.name, byYear: {} }
      row.byYear[y.year] = { pct: a.pct, sets: a.sets }
      rows.set(k, row)
    }
  }
  const latest = years[0]
  const areas = [...rows.values()].sort((a, b) => (a.byYear[latest]?.pct ?? 101) - (b.byYear[latest]?.pct ?? 101))
  return NextResponse.json({
    name: inCourse[0].courseName,
    years: perYear.map(({ year, sets, students }) => ({ year, sets, students, classes: inCourse.filter((c) => c.school_year === year).map((c) => ({ id: c.id, name: c.name, period: c.period })) })),
    areas,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
