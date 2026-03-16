/**
 * Save authentication session for Playwright demo recording.
 *
 * Usage: npx playwright test scripts/save-auth.ts --headed
 *
 * Opens a browser pointed at the app. Log in manually, then
 * press Enter in the terminal to save the session to scripts/auth-session.json.
 */
import { chromium } from '@playwright/test'
import * as readline from 'readline'

const APP_URL = process.env.APP_URL || 'https://www.casanovastudy.com'

async function main() {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(`${APP_URL}/auth/signin`)

  console.log('\n========================================')
  console.log('  Log in manually in the browser.')
  console.log('  Once logged in, press ENTER here.')
  console.log('========================================\n')

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  await new Promise<void>((resolve) => rl.question('', () => { rl.close(); resolve() }))

  // Save storage state (cookies + localStorage)
  await context.storageState({ path: 'scripts/auth-session.json' })
  console.log('Session saved to scripts/auth-session.json')

  await browser.close()
}

main().catch(console.error)
