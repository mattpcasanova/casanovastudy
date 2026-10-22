import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { classFromCourse, listCourses, matchClassForCourse } from '@/lib/google/classroom'
import { schoolYearFor } from '@/lib/classes/years'

// The teacher's active Classroom courses, each with the class it would become
// (tidied name + period) and the class it should go into: the one imported from
// it before, else this year's class it matches (same period, name fits), so a
// class made from a gradebook file gets the Classroom emails instead of a copy.
export async function GET(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const supabase = createAdminClient()
  const { data: tok } = await supabase.from('google_classroom_tokens').select('access_token, expires_at').eq('user_id', user.id).maybeSingle()
  if (!tok || new Date(tok.expires_at).getTime() < Date.now()) return NextResponse.json({ error: 'Connect Google Classroom again', reconnect: true }, { status: 401 })
  try {
    const [courses, { data: classRows }] = await Promise.all([
      listCourses(tok.access_token),
      supabase.from('classes').select('id, name, period, course, subject, google_course_id, school_year').eq('teacher_id', user.id).eq('is_archived', false),
    ])
    const year = schoolYearFor()
    const classes = (classRows ?? []).filter((c) => !c.school_year || c.school_year === year)
    const classOf = new Map((classRows ?? []).filter((c) => c.google_course_id).map((c) => [c.google_course_id as string, c.id as string]))
    return NextResponse.json({
      courses: courses.map((c) => {
        const importedClassId = classOf.get(c.id) ?? null
        // Only classes not already tied to another Classroom course can take this one.
        const free = classes.filter((k) => !k.google_course_id || k.google_course_id === c.id)
        const suggested = classFromCourse(c)
        return {
          id: c.id, name: c.name, section: c.section ?? null,
          suggestedName: suggested.name, suggestedPeriod: suggested.period,
          importedClassId,
          targetClassId: importedClassId ?? matchClassForCourse(c, free),
        }
      }),
      classes: classes.map((c) => ({ id: c.id, name: c.name, period: c.period, subject: c.subject, googleCourseId: c.google_course_id })),
    })
  } catch (e) {
    console.error('Classroom courses failed:', e)
    return NextResponse.json({ error: 'Google Classroom did not answer. Try connecting again.', reconnect: true }, { status: 502 })
  }
}
