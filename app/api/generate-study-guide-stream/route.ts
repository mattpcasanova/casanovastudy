import { NextRequest } from 'next/server'
import { ClaudeService } from '@/lib/claude-api'
import { StudyGuideRequest } from '@/types'
import { createAdminClient } from '@/lib/supabase-server'
import { getRequestUser } from '@/lib/request-user'
import { GOAL_VALUES, MATERIALS_KINDS, normalizeDifficulty, normalizeLanguage, type MaterialsKind } from '@/lib/study-options'
import { hasPremiumFeatures, meterGuide, planBlockResponse, releaseUsage } from '@/lib/plans'
import { consentBlockResponse } from '@/lib/consent'
import { buildProfile, learnerHistoryNote } from '@/lib/learner/profile'
import { fetchUploadedImages } from '@/lib/uploads/server-images'
import { parseAdaptive } from '@/lib/adaptive/format'
import { detectExam, readScores, type SavedScores } from '@/lib/exams/profiles'
import { pickMaterialIds, trimForGuide } from '@/lib/classes/materials'
import { materialsForUser } from '@/lib/classes/materials-server'
import { UPLOAD_LIMITS } from '@/lib/uploads/kinds'

function sseError(message: string, status: number) {
  return new Response('data: ' + JSON.stringify({ type: 'error', message }) + '\n\n', { status, headers: { 'Content-Type': 'text/event-stream' } })
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  const startTime = Date.now()

  // Identity comes only from the session (never a body userId). Writes use the
  // admin client with that verified id, so they don't depend on RLS.
  const user = await getRequestUser(request)
  if (!user) return sseError('Please sign in to create a study guide', 401)
  // Under-13 students need a parent's OK before anything goes to the AI (COPPA).
  const consentBlock = await consentBlockResponse(user.id)
  if (consentBlock) return consentBlock
  const supabase = createAdminClient()

  // Validate before metering, so a bad request never uses up a guide.
  let body: StudyGuideRequest
  try { body = await request.json() } catch { return sseError('Invalid request', 400) }
  const hasDirectContent = body.directContent && body.directContent.length > 0
  const hasLegacyFiles = body.files && body.files.length > 0
  // Photos and scanned pages, prepared in the browser and put in the uploads bucket.
  const hasImages = Array.isArray(body.images) && body.images.length > 0
  // "Make another format": the existing guide's own content is the source material.
  // Guides are readable by link (public SELECT), so any guide the student can open works.
  let sourceGuide: { title: string; format: string; content: string } | null = null
  if (typeof body.sourceGuideId === 'string' && /^[0-9a-f-]{36}$/i.test(body.sourceGuideId)) {
    const { data } = await supabase.from('study_guides').select('title, format, content, custom_content').eq('id', body.sourceGuideId).single()
    if (data) sourceGuide = { title: data.title, format: data.format, content: guideSourceText(data).slice(0, 60000) }
  }
  // Slides and notes the teacher put on the student's class (migration 080).
  // Only ones on a class they're in (or their own) are used; others are dropped.
  const materials = await materialsForUser(supabase, user.id, pickMaterialIds(body.classMaterialIds))
  // Students can type what they want to study instead of uploading files.
  const studyRequest = typeof body.studyRequest === 'string' ? body.studyRequest.trim().slice(0, 8000) : ''
  if (!hasDirectContent && !hasLegacyFiles && !hasImages && !sourceGuide && !materials.length && studyRequest.length < 3) {
    return sseError('Upload a file or describe what you want to study', 400)
  }
  if (!body.studyGuideName || !body.subject || !body.gradeLevel || !body.format) {
    return sseError('Missing required fields', 400)
  }

  // Plan (lib/plans.ts): free accounts get the four original formats (no Long, no Hard) and 3 guides a week.
  const meter = await meterGuide(user.id, { format: body.format, length: body.length, difficulty: normalizeDifficulty(body.difficultyLevel) })
  if (meter.block) return planBlockResponse(meter.block)

  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log('🚀 Study guide streaming generation started')

        // Send progress update
        controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'progress', message: 'Processing your materials...' }) + '\n\n'))

        // Process files from multiple sources
        let allContent: Array<{ name: string; content: string }> = []

        // 1. Text read in the browser (lib/uploads/prepare.ts)
        if (hasDirectContent && body.directContent) {
          console.log('Adding direct content:', body.directContent.map((c) => c.name))
          allContent.push(...body.directContent)
        }

        // 2. Handle legacy files format (if any)
        if (hasLegacyFiles && !hasDirectContent) {
          allContent.push(...body.files!.map((f: { name: string; content: string }) => ({ name: f.name, content: f.content })))
        }

        if (sourceGuide?.content.trim()) {
          allContent.push({ name: `Existing ${sourceGuide.format} guide: ${sourceGuide.title}`, content: sourceGuide.content })
        }

        // 3. Class materials: their text, within one budget for all of them.
        allContent.push(...trimForGuide(materials))

        // 4. Photos and scanned pages go to Claude as images.
        let images: Awaited<ReturnType<typeof fetchUploadedImages>> = []
        if (hasImages) {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'progress', message: 'Loading your photos...' }) + '\n\n'))
          images = await fetchUploadedImages(body.images, user.id)
        }
        // Scanned pages of class materials live in the teacher's folder; the class
        // check above is what lets this student use them. Same 40-image cap overall.
        for (const m of materials) {
          const room = UPLOAD_LIMITS.maxGuideImages - images.length
          if (room <= 0) break
          if (m.images.length) images.push(...await fetchUploadedImages(m.images.slice(0, room), m.teacherId))
        }

        // Combine all content
        const combinedContent = allContent
          .map(file => `--- ${file.name} ---\n${file.content}`)
          .join('\n\n')

        controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'progress', message: allContent.length || images.length ? 'Creating your study guide...' : 'Writing your study guide from your topic...' }) + '\n\n'))

        // A big test the request names (lib/exams): remember a stated score on the
        // account, and use the saved one when this request doesn't state it.
        let examScores: SavedScores | undefined
        {
          const { data: prof } = await supabase.from('user_profiles').select('exam_scores').eq('id', user.id).maybeSingle()
          examScores = (prof?.exam_scores as SavedScores | null) ?? undefined
          const examText = [body.topicFocus, studyRequest, body.additionalInstructions].filter(Boolean).join('\n')
          const exam = detectExam(examText, body.subject)
          const stated = exam?.profile.scoreRange ? readScores(examText, exam.profile.scoreRange) : undefined
          if (exam && stated) {
            const next = { ...(examScores ?? {}), [exam.profile.id]: { ...(examScores?.[exam.profile.id] ?? {}), ...stated, at: new Date().toISOString() } }
            await supabase.from('user_profiles').update({ exam_scores: next }).eq('id', user.id)
          }
        }

        // Premium: lean the guide on this student's weak spots in this subject/topic.
        let learnerNote = ''
        if (await hasPremiumFeatures(user.id)) {
          const { data: history } = await supabase
            .from('study_results')
            .select('subject, topic, correct, answered_at, study_guide_id')
            .eq('user_id', user.id)
            .order('answered_at', { ascending: false })
            .limit(2000)
          if (history?.length) {
            learnerNote = learnerHistoryNote(buildProfile(history), {
              subject: body.subject,
              text: [studyRequest, body.topicFocus, body.studyGuideName].filter(Boolean).join('\n'),
            })
          }
        }

        // Generate with streaming
        const claudeService = new ClaudeService()
        let fullContent = ''
        let usage: any = null

        const streamGenerator = claudeService.generateStudyGuideStream({
          content: combinedContent,
          subject: body.subject,
          gradeLevel: body.gradeLevel,
          format: body.format,
          topicFocus: body.topicFocus,
          difficultyLevel: normalizeDifficulty(body.difficultyLevel),
          additionalInstructions: body.additionalInstructions,
          studyRequest: studyRequest || undefined,
          goal: body.goal && GOAL_VALUES.includes(body.goal) ? body.goal : undefined,
          sourcePolicy: body.sourcePolicy === 'expand' || sourceGuide ? 'expand' : 'strict',
          materialsKind: MATERIALS_KINDS.includes(body.materialsKind as MaterialsKind) ? (body.materialsKind as MaterialsKind) : undefined,
          visuals: body.visuals !== false,
          codeEditor: body.codeEditor !== false,
          length: body.length === 'short' || body.length === 'long' ? body.length : 'medium',
          images,
          learnerNote,
          examScores,
          fromGuide: sourceGuide ? { title: sourceGuide.title, format: sourceGuide.format } : undefined,
          language: normalizeLanguage(body.language),
        })

        // Iterate manually: for-await drops the generator's return value (the usage).
        while (true) {
          const next = await streamGenerator.next()
          if (next.done) {
            usage = next.value?.usage ?? null
            break
          }
          fullContent += next.value
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'content', chunk: next.value }) + '\n\n'))
        }

        // Adaptive practice is only playable with enough well-formed questions; otherwise
        // fail here (the catch gives the session back) rather than save a broken one.
        if (body.format === 'adaptive' && parseAdaptive(fullContent).questions.length < 8) {
          throw new Error("Your practice questions didn't come out right. Please try again.")
        }

        controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'progress', message: 'Saving to database...' }) + '\n\n'))

        // No name given: use the guide's own H1 title rather than the raw topic text.
        let title = body.studyGuideName
        if (body.autoTitle) {
          const h1 = fullContent.match(/^#\s+(.+)$/m)?.[1]
            ?.replace(/\p{Extended_Pictographic}\uFE0F?/gu, '')
            .replace(/[*_`]/g, '')
            .trim()
          if (h1 && h1.length >= 3) title = h1.slice(0, 120)
        }

        // Generated from a study plan unit? Link it back — only to the caller's own plan.
        let parentGuideId: string | null = null
        let planUnit: string | null = null
        if (body.planId && body.planUnit) {
          const { data: plan } = await supabase
            .from('study_guides')
            .select('id, format, user_id')
            .eq('id', body.planId)
            .single()
          const ownerId = user.id
          if (plan && plan.format === 'plan' && ownerId && plan.user_id === ownerId) {
            parentGuideId = plan.id
            planUnit = String(body.planUnit).slice(0, 40)
          }
        }

        // No subject given: work it out from the finished guide, so answers to it
        // land under the right subject on the Progress page.
        let subject = body.subject
        if (!subject || subject === 'general') {
          try {
            subject = (await claudeService.classifySubject({ title, request: studyRequest || body.topicFocus, excerpt: fullContent })) ?? 'general'
          } catch (e) {
            console.error('Subject classification failed:', e)
            subject = 'general'
          }
        }

        // Save to Supabase
        const { data: savedGuide, error: supabaseError } = await supabase
          .from('study_guides')
          .insert({
            title,
            subject,
            grade_level: body.gradeLevel,
            format: body.format,
            content: fullContent,
            topic_focus: body.topicFocus || (studyRequest ? studyRequest.slice(0, 200) : undefined),
            difficulty_level: normalizeDifficulty(body.difficultyLevel),
            language: normalizeLanguage(body.language),
            additional_instructions: body.additionalInstructions,
            file_count: (body.directContent?.length || 0) + (body.files?.length || 0) + (body.images?.length || 0) + materials.length,
            source_material_ids: materials.length ? materials.map((m) => m.id) : null,
            token_usage: usage,
            user_id: user.id,
            parent_guide_id: parentGuideId,
            plan_unit: planUnit
          })
          .select()
          .single()

        if (supabaseError || !savedGuide) {
          await releaseUsage(meter.eventId)
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'error', message: `Failed to save: ${supabaseError?.message}` }) + '\n\n'))
          controller.close()
          return
        }

        const totalTime = Date.now() - startTime
        console.log(`🎉 Streaming generation completed in ${totalTime}ms`)

        // Send completion with study guide URL
        controller.enqueue(encoder.encode('data: ' + JSON.stringify({
          type: 'complete',
          studyGuideUrl: `/study-guide/${savedGuide.id}`,
          id: savedGuide.id,
          title: savedGuide.title,
          format: savedGuide.format
        }) + '\n\n'))

        controller.close()

      } catch (error) {
        console.error('❌ Streaming generation error:', error)
        await releaseUsage(meter.eventId) // nothing was saved, so it doesn't count
        controller.enqueue(encoder.encode('data: ' + JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to generate study guide'
        }) + '\n\n'))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

/** A guide's content as plain source text (custom guides are stored as blocks). */
function guideSourceText(g: { content: string | null; custom_content: unknown }): string {
  if (g.content?.trim()) return g.content
  if (!g.custom_content) return ''
  // Drop editor ids/flags; the model only needs the words.
  return JSON.stringify(g.custom_content, (key, value) => (key === 'id' || key === 'collapsed' ? undefined : value))
}
