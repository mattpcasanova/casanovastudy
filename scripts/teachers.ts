// Teacher verification (service role; run locally). See migration 063.
//
//   npx tsx --env-file=.env.local scripts/teachers.ts list            # every teacher and their status
//   npx tsx --env-file=.env.local scripts/teachers.ts pending         # waiting for a decision
//   npx tsx --env-file=.env.local scripts/teachers.ts approve someone@school.org
//   npx tsx --env-file=.env.local scripts/teachers.ts reject someone@school.org
//   npx tsx --env-file=.env.local scripts/teachers.ts domain add school.org "School name"
//   npx tsx --env-file=.env.local scripts/teachers.ts domain remove school.org
//   npx tsx --env-file=.env.local scripts/teachers.ts domain list
//
// approve/reject here don't email the teacher; the review link in the
// ADMIN_EMAIL message does.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const args = process.argv.slice(2)

async function teacherByEmail(email: string) {
  const { data, error } = await supabase.from('user_profiles').select('id, email, first_name, last_name, user_type').ilike('email', email.trim()).maybeSingle()
  if (error) throw error
  if (!data) throw new Error(`No account with email ${email}`)
  if (data.user_type !== 'teacher') throw new Error(`${email} is a ${data.user_type} account`)
  return data
}

async function main() {
  const [cmd, sub, a, b] = args

  if (cmd === 'list' || cmd === 'pending') {
    const { data: teachers } = await supabase.from('user_profiles').select('id, email, first_name, last_name').eq('user_type', 'teacher')
    const { data: rows } = await supabase.from('teacher_verifications').select('user_id, status, method, school_email, school_name, email_confirmed_at')
    const byId = new Map((rows ?? []).map((r) => [r.user_id, r]))
    for (const t of teachers ?? []) {
      const v = byId.get(t.id)
      const status = v?.status ?? 'none'
      if (cmd === 'pending' && status !== 'pending') continue
      console.log([
        status.padEnd(9),
        `${[t.first_name, t.last_name].filter(Boolean).join(' ')} <${t.email}>`,
        v?.school_email ? `school: ${v.school_email}${v.email_confirmed_at ? ' (confirmed)' : ' (not confirmed)'}` : '',
        v?.school_name ?? '',
        v?.method ? `[${v.method}]` : '',
      ].filter(Boolean).join('  '))
    }
    return
  }

  if (cmd === 'approve' || cmd === 'reject') {
    if (!sub) throw new Error(`Usage: ${cmd} <email>`)
    const t = await teacherByEmail(sub)
    const now = new Date().toISOString()
    const { error } = await supabase.from('teacher_verifications').upsert({ user_id: t.id, status: cmd === 'approve' ? 'approved' : 'rejected', method: 'manual', decided_at: now, updated_at: now }, { onConflict: 'user_id' })
    if (error) throw error
    console.log(`${cmd === 'approve' ? 'Approved' : 'Rejected'} ${t.email}`)
    return
  }

  if (cmd === 'domain' && sub === 'add') {
    if (!a) throw new Error('Usage: domain add <domain> "School name"')
    const { error } = await supabase.from('verified_school_domains').upsert({ domain: a.toLowerCase().replace(/^@/, ''), school_name: b ?? null })
    if (error) throw error
    console.log(`Added ${a.toLowerCase()}`)
    return
  }
  if (cmd === 'domain' && sub === 'remove') {
    if (!a) throw new Error('Usage: domain remove <domain>')
    await supabase.from('verified_school_domains').delete().eq('domain', a.toLowerCase())
    console.log(`Removed ${a.toLowerCase()}`)
    return
  }
  if (cmd === 'domain' && sub === 'list') {
    const { data } = await supabase.from('verified_school_domains').select('domain, school_name').order('domain')
    for (const d of data ?? []) console.log(`${d.domain}  ${d.school_name ?? ''}`)
    return
  }

  console.log('Commands: list | pending | approve <email> | reject <email> | domain add|remove|list')
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
