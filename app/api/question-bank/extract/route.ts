import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireTeacher } from '@/lib/api-auth'
import { extractQuestionsFromMaterial } from '@/lib/mastery/ai'

export const maxDuration = 300 // vision extraction over full documents

interface ExtractBody {
  file_urls?: Array<{ url: string; name?: string; type?: string }>
}

const MAX_FILES = 5
const MAX_FILE_BYTES = 30 * 1024 * 1024

function isAllowedUrl(url: string): boolean {
  try {
    const u = new URL(url)
    // Files come from the app's own Cloudinary upload flow
    return u.protocol === 'https:' && u.hostname.endsWith('cloudinary.com')
  } catch {
    return false
  }
}

// POST - Extract concept-tagged questions from uploaded material (PDF/images).
// Everything lands as status='suggested' for review; questions that don't fit
// an existing concept auto-create one (returned so the UI can say so).
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireTeacher(request)
    if (error) return error

    const body = (await request.json()) as ExtractBody
    const fileUrls = (body.file_urls ?? [])
      .filter(f => f && typeof f.url === 'string' && isAllowedUrl(f.url))
      .slice(0, MAX_FILES)
    if (fileUrls.length === 0) {
      return NextResponse.json({ error: 'Upload at least one PDF or image first' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: concepts } = await supabase
      .from('concepts')
      .select('id, name, description')
      .eq('teacher_id', user.id)

    // Fetch files into buffers
    const files: Array<{ buffer: Buffer; mediaType: string; name?: string }> = []
    for (const f of fileUrls) {
      const res = await fetch(f.url)
      if (!res.ok) {
        return NextResponse.json({ error: `Could not fetch ${f.name ?? 'file'}` }, { status: 400 })
      }
      const buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.length > MAX_FILE_BYTES) {
        return NextResponse.json({ error: `${f.name ?? 'File'} is too large (30MB max)` }, { status: 400 })
      }
      const mediaType = f.type || res.headers.get('content-type') || 'application/pdf'
      files.push({ buffer, mediaType: mediaType.split(';')[0], name: f.name })
    }

    let extracted
    try {
      extracted = await extractQuestionsFromMaterial({
        files,
        concepts: concepts ?? [],
      })
    } catch (err) {
      console.error('Extraction failed:', err)
      return NextResponse.json(
        { error: 'Could not extract questions from this material — try a clearer PDF' },
        { status: 502 }
      )
    }
    if (extracted.length === 0) {
      return NextResponse.json({ error: 'No questions found in this material' }, { status: 422 })
    }

    // Resolve proposed concepts: create each distinct new name once
    const validConceptIds = new Set((concepts ?? []).map(c => c.id))
    const createdConcepts: Array<{ id: string; name: string }> = []
    const proposedNames = new Map<string, string>() // lowercased name -> concept id

    for (const q of extracted) {
      if (q.concept_id && validConceptIds.has(q.concept_id)) continue
      const proposed = q.proposed_new_concept?.trim()
      if (!proposed) continue
      const key = proposed.toLowerCase()
      if (proposedNames.has(key)) continue
      // Reuse an existing concept with the same name if present
      const existing = (concepts ?? []).find(c => c.name.toLowerCase() === key)
      if (existing) {
        proposedNames.set(key, existing.id)
        continue
      }
      const { data: newConcept } = await supabase
        .from('concepts')
        .insert({ teacher_id: user.id, name: proposed })
        .select('id, name')
        .single()
      if (newConcept) {
        proposedNames.set(key, newConcept.id)
        createdConcepts.push(newConcept)
      }
    }

    const sourceUrl = fileUrls[0]?.url ?? null
    const rows = extracted
      .map(q => {
        const conceptId =
          q.concept_id && validConceptIds.has(q.concept_id)
            ? q.concept_id
            : q.proposed_new_concept
              ? proposedNames.get(q.proposed_new_concept.trim().toLowerCase()) ?? null
              : null
        if (!conceptId) return null
        return {
          teacher_id: user.id,
          concept_id: conceptId,
          type: q.type,
          question_text: q.question_text,
          options: q.type === 'multiple_choice' ? q.options : null,
          correct_answer: q.correct_answer,
          explanation: q.explanation ?? null,
          difficulty: q.difficulty,
          source: 'ai_extracted',
          status: 'suggested',
          source_material_url: sourceUrl,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No questions could be tagged to a concept' }, { status: 422 })
    }

    const { error: insertError } = await supabase.from('question_bank_questions').insert(rows)
    if (insertError) {
      console.error('Failed to insert extracted questions:', insertError)
      return NextResponse.json({ error: 'Failed to save extracted questions' }, { status: 500 })
    }

    // Per-concept counts for the UI summary
    const byConcept = new Map<string, number>()
    for (const r of rows) byConcept.set(r.concept_id, (byConcept.get(r.concept_id) ?? 0) + 1)

    return NextResponse.json(
      {
        total_created: rows.length,
        created_concepts: createdConcepts,
        by_concept: [...byConcept.entries()].map(([concept_id, count]) => ({ concept_id, count })),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Extract questions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
