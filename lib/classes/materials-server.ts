// Server side of class materials (migration 080, rules in materials.ts). Service
// role; callers pass the signed-in user's id from the session.

import type { SupabaseClient } from '@supabase/supabase-js'
import { studentClassIds } from '@/lib/student/classwork'
import { UPLOAD_BUCKET, pickUploadRefs, type UploadRef } from '@/lib/uploads/refs'
import { MATERIAL_LIMITS } from './materials'

export interface MaterialForGuide { id: string; teacherId: string; name: string; content: string; images: UploadRef[] }

/**
 * The materials in `ids` this user may build a guide from: ones on a class
 * they're in now, or their own (a teacher trying it out). Others are dropped.
 * Order follows `ids`.
 */
export async function materialsForUser(supabase: SupabaseClient, userId: string, ids: string[]): Promise<MaterialForGuide[]> {
  if (!ids.length) return []
  const [{ data: rows }, classIds] = await Promise.all([
    supabase.from('teacher_materials').select('id, teacher_id, name, content, images').in('id', ids),
    studentClassIds(supabase, userId),
  ])
  const { data: links } = classIds.length
    ? await supabase.from('class_material_links').select('material_id').in('material_id', ids).in('class_id', classIds)
    : { data: [] }
  const allowed = new Set((links ?? []).map((l) => l.material_id as string))
  const byId = new Map((rows ?? []).map((r) => [r.id as string, r]))
  return ids.flatMap((id) => {
    const r = byId.get(id)
    if (!r || (r.teacher_id !== userId && !allowed.has(id))) return []
    return [{ id, teacherId: r.teacher_id as string, name: r.name as string, content: (r.content as string) ?? '', images: pickUploadRefs(r.images, MATERIAL_LIMITS.maxImages) }]
  })
}

/** Removes a material's page images from the teacher's uploads folder. */
export async function removeMaterialFiles(supabase: SupabaseClient, images: unknown): Promise<void> {
  const paths = pickUploadRefs(images, MATERIAL_LIMITS.maxImages).map((r) => r.path)
  for (let i = 0; i < paths.length; i += 100) await supabase.storage.from(UPLOAD_BUCKET).remove(paths.slice(i, i + 100))
}
