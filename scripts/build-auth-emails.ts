// Writes Supabase Auth email templates (supabase/templates/*.html) from the
// shared layout in lib/email. Paste each into Supabase → Authentication →
// Emails → Templates. Run: npx tsx scripts/build-auth-emails.ts
import { writeFileSync } from 'fs'
import { authEmails } from '../lib/email/templates'

const site = 'https://www.casanovastudy.com'
const emails = authEmails(site)
for (const [name, { subject, html }] of Object.entries(emails)) {
  writeFileSync(`supabase/templates/${name}.html`, html)
  console.log(`${name}.html  (subject: ${subject})`)
}
