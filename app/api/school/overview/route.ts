import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getRequestUser } from '@/lib/request-user'
import { adminSchools, loadSchoolOverview } from '@/lib/school/server'

// GET ?domain= : teacher activity for a school the caller is an admin of.
// Counts per teacher only, no student names.
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  const supabase = createAdminClient()
  const schools = await adminSchools(supabase, user.id)
  const wanted = request.nextUrl.searchParams.get('domain')
  const school = wanted ? schools.find((s) => s.domain === wanted) : schools[0]
  if (!school) return NextResponse.json({ error: "You don't have a school overview." }, { status: 403 })
  try {
    const overview = await loadSchoolOverview(supabase, school.domain)
    return NextResponse.json({ school, schools, ...overview })
  } catch (e) {
    console.error('School overview failed:', e)
    return NextResponse.json({ error: "Couldn't load the school overview." }, { status: 500 })
  }
}
