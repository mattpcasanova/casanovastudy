import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { ownedClass } from '@/lib/classes/server'
import { MATERIAL_LIMITS, materialKind } from '@/lib/classes/materials'
import { removeMaterialFiles } from '@/lib/classes/materials-server'
import { ownsUploadPath, pickUploadRefs } from '@/lib/uploads/refs'
import { isOpenClass } from '@/lib/student/classwork'
import { sortClasses } from '@/lib/classes/sort'

// Class materials (migration 080): slides and notes a teacher puts on classes so
// students can build guides from them. The browser prepares each file
// (prepareMaterials) and sends its text + uploaded page images here.
// GET ?classId= lists that class's materials (no classId: all of them, by class); POST { name, content, images,
// classIds, note? } adds one to those classes; DELETE { id } deletes it,
// { linkId } takes it off one class (and deletes it once it's on none).
const UUID = /^[0-9a-f-]{36}$/i

const pickClassIds = (v: unknown) => [...new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && UUID.test(x)) : [])].slice(0, MATERIAL_LIMITS.maxClasses)

async function ownedClassIds(supabase: ReturnType<typeof createAdminClient>, teacherId: string, ids: string[]) {
  const checks = await Promise.all(ids.map((id) => ownedClass(supabase, teacherId, id)))
  return ids.filter((_, i) => checks[i])
}

export async function GET(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const classId = request.nextUrl.searchParams.get('classId')
  const supabase = createAdminClient()
  // No class: everything on this year's classes, for the guide maker's picker.
  if (!classId) return NextResponse.json(await allMaterials(supabase, user.id), { headers: { 'Cache-Control': 'no-store' } })
  if (!UUID.test(classId)) return NextResponse.json({ error: 'Which class?' }, { status: 400 })
  const { data: links } = await supabase
    .from('class_material_links')
    .select('id, material_id, note, created_at, teacher_materials(name, kind, char_count, image_count)')
    .eq('teacher_id', user.id).eq('class_id', classId)
    .order('created_at', { ascending: false }).limit(200)
  const materialIds = (links ?? []).map((l) => l.material_id as string)
  const [{ data: elsewhere }, { data: guides }] = materialIds.length
    ? await Promise.all([
        supabase.from('class_material_links').select('material_id, class_id, classes(name, period)').in('material_id', materialIds).neq('class_id', classId),
        supabase.from('study_guides').select('source_material_ids').overlaps('source_material_ids', materialIds).limit(5000),
      ])
    : [{ data: [] }, { data: [] }]
  const used = new Map<string, number>()
  for (const g of guides ?? []) for (const id of (g.source_material_ids as string[] | null) ?? []) used.set(id, (used.get(id) ?? 0) + 1)
  const one = <T,>(v: unknown): T | null => ((Array.isArray(v) ? v[0] : v) as T | null) ?? null
  return NextResponse.json({
    materials: (links ?? []).map((l) => {
      const m = one<{ name: string; kind: string; char_count: number; image_count: number }>(l.teacher_materials)
      return {
        id: l.id, materialId: l.material_id, note: l.note, createdAt: l.created_at,
        name: m?.name ?? '', kind: m?.kind ?? 'other', chars: m?.char_count ?? 0, pages: m?.image_count ?? 0,
        guides: used.get(l.material_id as string) ?? 0,
        otherClasses: (elsewhere ?? []).filter((e) => e.material_id === l.material_id).map((e) => {
          const c = one<{ name: string; period: string | null }>(e.classes)
          return { id: e.class_id as string, name: c?.name ?? '', period: c?.period ?? null }
        }),
      }
    }),
  }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const body = await request.json().catch(() => ({})) as { name?: string; content?: string; images?: unknown; classIds?: unknown; note?: string }
  const name = (body.name ?? '').trim().slice(0, 200)
  const content = typeof body.content === 'string' ? body.content.slice(0, MATERIAL_LIMITS.maxChars) : ''
  const images = pickUploadRefs(body.images, MATERIAL_LIMITS.maxImages)
  if (!name) return NextResponse.json({ error: 'The file needs a name' }, { status: 400 })
  if (!content.trim() && !images.length) return NextResponse.json({ error: `Nothing could be read from ${name}` }, { status: 400 })
  if (images.some((i) => !ownsUploadPath(i.path, user.id))) return NextResponse.json({ error: 'Files must be uploaded through the app' }, { status: 403 })
  const supabase = createAdminClient()
  const classIds = await ownedClassIds(supabase, user.id, pickClassIds(body.classIds))
  if (!classIds.length) return NextResponse.json({ error: 'Pick a class' }, { status: 400 })
  const { data: material, error: insertError } = await supabase
    .from('teacher_materials')
    .insert({ teacher_id: user.id, name, kind: materialKind(name), content, images, char_count: content.length, image_count: images.length })
    .select('id').single()
  if (insertError || !material) return NextResponse.json({ error: 'Could not save it' }, { status: 500 })
  const note = (body.note ?? '').trim().slice(0, 300) || null
  const { error: linkError } = await supabase.from('class_material_links').insert(classIds.map((class_id) => ({ class_id, material_id: material.id, teacher_id: user.id, note })))
  if (linkError) {
    await supabase.from('teacher_materials').delete().eq('id', material.id)
    return NextResponse.json({ error: 'Could not add it to the class' }, { status: 500 })
  }
  return NextResponse.json({ id: material.id })
}

export async function DELETE(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const body = await request.json().catch(() => ({})) as { id?: string; linkId?: string }
  const supabase = createAdminClient()
  if (body.linkId && UUID.test(body.linkId)) {
    const { data: link } = await supabase.from('class_material_links').select('material_id').eq('id', body.linkId).eq('teacher_id', user.id).maybeSingle()
    if (!link) return NextResponse.json({ ok: true })
    await supabase.from('class_material_links').delete().eq('id', body.linkId)
    // Off its last class: nobody can use it any more, so the file goes too.
    const { count } = await supabase.from('class_material_links').select('id', { count: 'exact', head: true }).eq('material_id', link.material_id)
    if (!count) await deleteMaterial(supabase, user.id, link.material_id as string)
    return NextResponse.json({ ok: true })
  }
  if (!body.id || !UUID.test(body.id)) return NextResponse.json({ error: 'Which file?' }, { status: 400 })
  await deleteMaterial(supabase, user.id, body.id)
  return NextResponse.json({ ok: true })
}

async function deleteMaterial(supabase: ReturnType<typeof createAdminClient>, teacherId: string, id: string) {
  const { data } = await supabase.from('teacher_materials').select('images').eq('id', id).eq('teacher_id', teacherId).maybeSingle()
  if (!data) return
  await removeMaterialFiles(supabase, data.images)
  await supabase.from('teacher_materials').delete().eq('id', id).eq('teacher_id', teacherId)
}

/** The teacher's materials on this year's classes, shaped like a student's classwork (classes + materials). */
async function allMaterials(supabase: ReturnType<typeof createAdminClient>, teacherId: string) {
  const { data: classRows } = await supabase.from('classes').select('id, name, period, is_archived, school_year').eq('teacher_id', teacherId)
  const classes = sortClasses((classRows ?? []).filter((c) => isOpenClass(c)).map((c) => ({ id: c.id as string, name: c.name as string, period: (c.period as string | null) ?? null })))
  const { data: links } = classes.length
    ? await supabase.from('class_material_links').select('id, class_id, material_id, note, created_at, teacher_materials(name, kind)').eq('teacher_id', teacherId).in('class_id', classes.map((c) => c.id)).order('created_at', { ascending: false }).limit(500)
    : { data: [] }
  const materials = (links ?? []).map((l) => {
    const m = (Array.isArray(l.teacher_materials) ? l.teacher_materials[0] : l.teacher_materials) as { name: string; kind: string } | null
    return { id: l.id as string, materialId: l.material_id as string, name: m?.name ?? '', kind: m?.kind ?? 'other', note: l.note as string | null, classId: l.class_id as string, createdAt: l.created_at as string }
  })
  return { classes, materials }
}
