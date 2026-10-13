import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'

// One scan in the teacher's inbox. GET: short-lived signed download links (the
// browser fetches the files directly; they're too big to pass through here)
// and marks it used. DELETE: removes the files and the row. Owner only.

async function ownItem(userId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data } = await createAdminClient().from('scan_inbox_items').select('id, user_id, files').eq('id', id).maybeSingle()
  return data && data.user_id === userId ? data : null
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const { id } = await params
  const item = await ownItem(user.id, id)
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const supabase = createAdminClient()
  const files = item.files as Array<{ name: string; path: string; contentType: string }>
  const links = []
  for (const f of files) {
    const { data } = await supabase.storage.from('scan-inbox').createSignedUrl(f.path, 600)
    if (data?.signedUrl) links.push({ name: f.name, contentType: f.contentType, url: data.signedUrl })
  }
  await supabase.from('scan_inbox_items').update({ used_at: new Date().toISOString() }).eq('id', id)
  return NextResponse.json({ files: links }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const { id } = await params
  const item = await ownItem(user.id, id)
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const supabase = createAdminClient()
  const paths = (item.files as Array<{ path: string }>).map((f) => f.path)
  if (paths.length) await supabase.storage.from('scan-inbox').remove(paths)
  await supabase.from('scan_inbox_items').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
