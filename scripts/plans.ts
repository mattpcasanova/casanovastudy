// Access codes and comped Premium accounts (service role; run locally).
//
//   npx tsx --env-file=.env.local scripts/plans.ts code create --until 2027-06-30 --uses 40 [--code CHEM-2027] [--expires 2026-12-31] [--note "..."]
//   npx tsx --env-file=.env.local scripts/plans.ts code create --months 3 --uses 1
//   npx tsx --env-file=.env.local scripts/plans.ts code list
//   npx tsx --env-file=.env.local scripts/plans.ts code disable CHEM-2027
//   npx tsx --env-file=.env.local scripts/plans.ts comp someone@school.org --until 2027-06-30 [--note "..."]
//   npx tsx --env-file=.env.local scripts/plans.ts comp-teachers --until 2027-06-30
//   npx tsx --env-file=.env.local scripts/plans.ts revoke someone@school.org
//   npx tsx --env-file=.env.local scripts/plans.ts status someone@school.org
//
// --until dates end at 23:59 UTC that day. Codes are uppercase letters, digits
// and dashes; students type them in "Redeem a code" (account menu) or the
// Premium dialog. Tables: supabase/migrations/042_plans_usage_codes.sql.

import { createClient } from '@supabase/supabase-js'
import { randomInt } from 'node:crypto'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const args = process.argv.slice(2)
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const endOfDay = (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Use YYYY-MM-DD, got "${date}"`)
  return `${date}T23:59:59Z`
}
const fmt = (iso?: string | null) => (iso ? iso.slice(0, 10) : '-')

// No 0/O/1/I/L so codes read cleanly off a board.
function randomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const part = () => Array.from({ length: 4 }, () => chars[randomInt(chars.length)]).join('')
  return `CS-${part()}-${part()}`
}

async function userByEmail(email: string) {
  const { data, error } = await supabase.from('user_profiles').select('id, email, first_name, last_name, user_type').ilike('email', email.trim()).maybeSingle()
  if (error) throw error
  if (!data) throw new Error(`No account with email ${email}`)
  return data
}

async function setPlan(userId: string, until: string, source: 'comp', note?: string) {
  const { error } = await supabase.from('user_plans').upsert({ user_id: userId, premium_until: until, source, note: note ?? null, updated_at: new Date().toISOString() })
  if (error) throw error
}

async function main() {
  const [cmd, sub] = args

  if (cmd === 'code' && sub === 'create') {
    const until = flag('until')
    const months = flag('months')
    if (!!until === !!months) throw new Error('Give exactly one of --until YYYY-MM-DD or --months N')
    const code = (flag('code') ?? randomCode()).toUpperCase()
    if (!/^[A-Z0-9-]{4,40}$/.test(code)) throw new Error('Codes are 4-40 letters, digits or dashes')
    const row = {
      code,
      premium_until: until ? endOfDay(until) : null,
      months: months ? Number(months) : null,
      max_redemptions: Number(flag('uses') ?? 1),
      expires_at: flag('expires') ? endOfDay(flag('expires')!) : null,
      note: flag('note') ?? null,
    }
    const { error } = await supabase.from('access_codes').insert(row)
    if (error) throw error
    console.log(`Created ${code}: Premium ${until ? `until ${until}` : `for ${months} month(s)`}, ${row.max_redemptions} use(s)${row.expires_at ? `, redeem by ${flag('expires')}` : ''}`)
    return
  }

  if (cmd === 'code' && sub === 'list') {
    const { data, error } = await supabase.from('access_codes').select('*').order('created_at', { ascending: false })
    if (error) throw error
    if (!data.length) return console.log('No codes yet.')
    for (const c of data) {
      const grant = c.premium_until ? `until ${fmt(c.premium_until)}` : `${c.months} mo`
      console.log(`${c.code.padEnd(16)} ${grant.padEnd(16)} used ${c.redemptions}/${c.max_redemptions}  expires ${fmt(c.expires_at)}  ${c.note ?? ''}`)
    }
    return
  }

  if (cmd === 'code' && sub === 'disable') {
    const code = args[2]?.toUpperCase()
    const { data, error } = await supabase.from('access_codes').update({ expires_at: new Date().toISOString() }).eq('code', code).select('code')
    if (error) throw error
    console.log(data?.length ? `Disabled ${code} (accounts that already redeemed it keep Premium).` : `No code ${code}`)
    return
  }

  if (cmd === 'comp') {
    const until = flag('until')
    if (!until) throw new Error('Give --until YYYY-MM-DD')
    const u = await userByEmail(args[1])
    await setPlan(u.id, endOfDay(until), 'comp', flag('note'))
    console.log(`Comped ${u.email} (${u.user_type}) with Premium until ${until}`)
    return
  }

  if (cmd === 'comp-teachers') {
    const until = flag('until')
    if (!until) throw new Error('Give --until YYYY-MM-DD')
    const { data, error } = await supabase.from('user_profiles').select('id, email').eq('user_type', 'teacher')
    if (error) throw error
    for (const t of data) {
      await setPlan(t.id, endOfDay(until), 'comp', flag('note') ?? 'existing teacher')
      console.log(`Comped ${t.email} until ${until}`)
    }
    console.log(`${data.length} teacher account(s) comped.`)
    return
  }

  if (cmd === 'revoke') {
    const u = await userByEmail(args[1])
    const { error } = await supabase.from('user_plans').update({ premium_until: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('user_id', u.id)
    if (error) throw error
    console.log(`${u.email} is back on the free plan.`)
    return
  }

  if (cmd === 'status') {
    const u = await userByEmail(args[1])
    const { data: plan } = await supabase.from('user_plans').select('*').eq('user_id', u.id).maybeSingle()
    const week = new Date(Date.now() - 7 * 86_400_000).toISOString()
    const { data: events } = await supabase.from('usage_events').select('kind').eq('user_id', u.id).gt('created_at', week)
    const counts = (events ?? []).reduce<Record<string, number>>((m, e) => ({ ...m, [e.kind]: (m[e.kind] ?? 0) + 1 }), {})
    const premium = plan?.premium_until && new Date(plan.premium_until) > new Date()
    console.log(`${u.email} (${u.user_type}): ${premium ? `Premium until ${fmt(plan!.premium_until)} (${plan!.source})` : 'Free'}`)
    console.log(`Last 7 days: ${counts.guide ?? 0} guides, ${counts.explain ?? 0} explanations, ${counts.grading ?? 0} gradings`)
    return
  }

  console.log(readUsage())
}

function readUsage() {
  return 'Usage: scripts/plans.ts code create|list|disable, comp <email> --until DATE, comp-teachers --until DATE, revoke <email>, status <email> (see the comment at the top of this file)'
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
