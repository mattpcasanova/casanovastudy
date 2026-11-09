// The daily practice-reminder job: find assigned practice due within the window
// (lib/practice/reminders.ts), email each linked student who hasn't turned it in,
// and send the teacher one summary. Each is sent once (practice_assignment_students
// .reminded_at, practice_assignments.teacher_reminded_at). Called by
// /api/cron/practice-reminders and scripts/practice-reminders.ts.

import { createAdminClient } from '@/lib/supabase-server'
import { consentStep } from '@/lib/consent-rules'
import { sendEmail } from '@/lib/email/send'
import { practiceReminderEmail, practiceTeacherEmail } from '@/lib/email/templates'
import { oneClickUrl, unsubscribeUrl } from '@/lib/reminders/unsubscribe'
import { ASSIGNMENT_COLUMNS, assignmentProgress, type AssignmentRow } from './server'
import { PRACTICE_REMINDER_RULES, dueSoon, dueWord, formatDue, studentReminder, teacherSummary, type StudentReminderKind, type StudentReminderSkip } from './reminders'

type Admin = ReturnType<typeof createAdminClient>

export interface PracticeReminderOutcome {
  assignmentId: string
  title: string
  dueAt: string
  students: Array<{ rosterId: string; name: string; email: string | null; sent: boolean; kind?: StudentReminderKind; reason?: StudentReminderSkip | 'off' | 'consent' | 'no-email' | 'error'; error?: string }>
  teacher: { email: string | null; sent: boolean; reason?: 'already-reminded' | 'off' | 'no-email' | 'error' | 'nobody-behind'; error?: string }
}

export interface RunOptions {
  /** Decide and report, but send nothing and record nothing. */
  dryRun?: boolean
  /** Only these assignments (testing). */
  onlyAssignmentIds?: string[]
  /** Send every email in the run to this address instead (testing with your own inbox); nothing is recorded as sent. */
  redirectTo?: string
  now?: Date
  siteUrl?: string
}

interface Profile { id: string; email: string | null; first_name: string | null; last_name: string | null; user_type: string | null; birth_date: string | null; clever_id: string | null }

export async function runPracticeReminders(opts: RunOptions = {}): Promise<PracticeReminderOutcome[]> {
  const now = opts.now ?? new Date()
  const siteUrl = (opts.siteUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://casanovastudy.com').replace(/\/$/, '')
  const admin = createAdminClient()

  let q = admin.from('practice_assignments').select(`${ASSIGNMENT_COLUMNS}, teacher_reminded_at`)
    .gt('due_at', now.toISOString())
    .lte('due_at', new Date(now.getTime() + PRACTICE_REMINDER_RULES.windowHours * 3_600_000).toISOString())
    .order('due_at').limit(300)
  if (opts.onlyAssignmentIds) q = q.in('id', opts.onlyAssignmentIds)
  const { data: rows, error } = await q
  if (error) throw new Error(error.message)
  const assignments = ((rows ?? []) as Array<AssignmentRow & { teacher_reminded_at: string | null }>).filter((a) => dueSoon(a.due_at, now))
  if (!assignments.length) return []

  const ids = assignments.map((a) => a.id)
  const [progress, { data: who }] = await Promise.all([
    assignmentProgress(admin, assignments),
    admin.from('practice_assignment_students').select('assignment_id, roster_id, reminded_at, class_roster(student_user_id)').in('assignment_id', ids),
  ])
  const linkOf = new Map<string, { userId: string | null; remindedAt: string | null }>()
  for (const w of who ?? []) {
    const r = (Array.isArray(w.class_roster) ? w.class_roster[0] : w.class_roster) as { student_user_id: string | null } | null
    linkOf.set(`${w.assignment_id}|${w.roster_id}`, { userId: r?.student_user_id ?? null, remindedAt: (w.reminded_at as string | null) ?? null })
  }

  const userIds = [...new Set([...[...linkOf.values()].map((l) => l.userId).filter((x): x is string => !!x), ...assignments.map((a) => a.teacher_id)])]
  const classIds = [...new Set(assignments.map((a) => a.class_id).filter((x): x is string => !!x))]
  const [{ data: profiles }, { data: consents }, { data: prefs }, { data: classes }] = await Promise.all([
    admin.from('user_profiles').select('id, email, first_name, last_name, user_type, birth_date, clever_id').in('id', userIds),
    admin.from('parental_consents').select('user_id, status').in('user_id', userIds),
    admin.from('reminder_prefs').select('user_id, email_enabled').in('user_id', userIds),
    classIds.length ? admin.from('classes').select('id, name, period').in('id', classIds) : Promise.resolve({ data: [] as Array<{ id: string; name: string; period: string | null }> }),
  ])
  const profileById = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p]))
  const consentById = new Map((consents ?? []).map((c) => [c.user_id as string, c.status as 'pending' | 'granted' | 'school' | null]))
  const enabled = (userId: string) => (prefs ?? []).find((p) => p.user_id === userId)?.email_enabled ?? true
  const classById = new Map((classes ?? []).map((c) => [c.id, c]))
  const consentOk = (p: Profile | undefined) => !!p && consentStep({ userType: p.user_type, birthDate: p.birth_date, viaSchool: !!p.clever_id, status: consentById.get(p.id) ?? null, now }) === 'ok'

  const outcomes: PracticeReminderOutcome[] = []
  for (const a of assignments) {
    const students = progress.get(a.id) ?? []
    const teacher = profileById.get(a.teacher_id)
    const teacherName = teacher ? [teacher.first_name, teacher.last_name].filter(Boolean).join(' ') || null : null
    const cls = a.class_id ? classById.get(a.class_id) : undefined
    const className = cls ? (cls.period ? `${cls.name}, period ${cls.period}` : cls.name) : null
    const word = dueWord(a.due_at!, now)
    const when = formatDue(a.due_at!)
    const outcome: PracticeReminderOutcome = { assignmentId: a.id, title: a.title, dueAt: a.due_at!, students: [], teacher: { email: teacher?.email ?? null, sent: false } }
    outcomes.push(outcome)

    for (const s of students) {
      const link = linkOf.get(`${a.id}|${s.rosterId}`)
      const decision = studentReminder({ status: s.status, linked: !!link?.userId, remindedAt: link?.remindedAt ?? null, inProgress: s.inProgress })
      const row: PracticeReminderOutcome['students'][number] = { rosterId: s.rosterId, name: s.name, email: null, sent: false }
      outcome.students.push(row)
      if (!decision.send) { row.reason = decision.reason; continue }
      row.kind = decision.kind
      const profile = profileById.get(link!.userId!)
      row.email = profile?.email ?? null
      if (!enabled(link!.userId!)) { row.reason = 'off'; continue }
      if (!consentOk(profile)) { row.reason = 'consent'; continue }
      if (!profile?.email) { row.reason = 'no-email'; continue }
      if (opts.dryRun) continue
      const mail = practiceReminderEmail({
        firstName: profile.first_name,
        title: a.title,
        teacherName,
        dueWord: word,
        dueAt: when,
        progress: s.inProgress && s.inProgress.answered > 0 ? { answered: s.inProgress.answered, total: s.inProgress.total, unit: s.inProgress.unit === 'activities' ? 'activities' : 'questions' } : null,
        url: `${siteUrl}/study-guide/${a.study_guide_id}?assignment=${a.id}`,
        unsubscribeUrl: unsubscribeUrl(siteUrl, profile.id),
        siteUrl,
      })
      try {
        await sendEmail({ to: opts.redirectTo ?? profile.email, ...mail, headers: { 'List-Unsubscribe': `<${oneClickUrl(siteUrl, profile.id)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
        row.sent = true
        if (!opts.redirectTo) await admin.from('practice_assignment_students').update({ reminded_at: now.toISOString() }).eq('assignment_id', a.id).eq('roster_id', s.rosterId)
      } catch (e) {
        row.reason = 'error'
        row.error = e instanceof Error ? e.message : String(e)
      }
    }

    // The teacher's summary, once per assignment, only when someone is behind.
    const summary = teacherSummary(students)
    if (a.teacher_reminded_at) { outcome.teacher.reason = 'already-reminded'; continue }
    if (summary.total - summary.done === 0) { outcome.teacher.reason = 'nobody-behind'; continue }
    if (!teacher || !enabled(teacher.id)) { outcome.teacher.reason = 'off'; continue }
    if (!teacher.email) { outcome.teacher.reason = 'no-email'; continue }
    if (opts.dryRun) continue
    const mail = practiceTeacherEmail({
      firstName: teacher.first_name,
      title: a.title,
      className,
      dueWord: word,
      dueAt: when,
      summary,
      maxNames: PRACTICE_REMINDER_RULES.maxNamesListed,
      url: `${siteUrl}/teacher/practice/${a.id}`,
      unsubscribeUrl: unsubscribeUrl(siteUrl, teacher.id),
      siteUrl,
    })
    try {
      await sendEmail({ to: opts.redirectTo ?? teacher.email, ...mail, headers: { 'List-Unsubscribe': `<${oneClickUrl(siteUrl, teacher.id)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
      outcome.teacher.sent = true
      if (!opts.redirectTo) await admin.from('practice_assignments').update({ teacher_reminded_at: now.toISOString() }).eq('id', a.id)
    } catch (e) {
      outcome.teacher.reason = 'error'
      outcome.teacher.error = e instanceof Error ? e.message : String(e)
    }
  }
  return outcomes
}

/** One line per assignment for logs and the preview script. */
export function describeOutcomes(outcomes: PracticeReminderOutcome[]): string[] {
  return outcomes.map((o) => {
    const sent = o.students.filter((s) => s.sent).length
    const would = o.students.filter((s) => s.kind && !s.reason).length
    const skipped = o.students.filter((s) => s.reason).reduce<Record<string, number>>((m, s) => ({ ...m, [s.reason!]: (m[s.reason!] ?? 0) + 1 }), {})
    return `${o.title} (due ${formatDue(o.dueAt)}): students ${sent} sent, ${would} to send${Object.keys(skipped).length ? `, skipped ${Object.entries(skipped).map(([k, n]) => `${n} ${k}`).join(', ')}` : ''}; teacher ${o.teacher.sent ? 'sent' : o.teacher.reason ?? 'to send'}`
  })
}

export type { Admin }
