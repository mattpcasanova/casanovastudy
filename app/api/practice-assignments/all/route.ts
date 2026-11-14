import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { schoolYearFor } from '@/lib/classes/years'
import { loadPracticeList } from '@/lib/practice/list-server'

// GET -> every practice assignment the teacher made (counts and averages, no student rows),
// for the All practice page. Owner only.
export async function GET(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const { items } = await loadPracticeList(createAdminClient(), user.id)
  return NextResponse.json({ items, year: schoolYearFor() }, { headers: { 'Cache-Control': 'no-store' } })
}
