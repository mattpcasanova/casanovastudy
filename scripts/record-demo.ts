/**
 * Record a demo video of CasanovaStudy for portfolio.
 *
 * Prerequisites:
 *   1. Run `npx tsx scripts/save-auth.ts` and log in to save session
 *   2. Place the PDF "Lesson 4.3 - Biodiversity.pdf" in scripts/assets/
 *
 * Usage:
 *   npx tsx scripts/record-demo.ts              # record both desktop & mobile
 *   npx tsx scripts/record-demo.ts desktop       # desktop only
 *   npx tsx scripts/record-demo.ts mobile        # mobile only
 */
import { chromium, type BrowserContext, type Page } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const APP_URL = process.env.APP_URL || 'https://www.casanovastudy.com'
const AUTH_SESSION = path.resolve(__dirname, 'auth-session.json')
const RECORDINGS_DIR = path.resolve(__dirname, 'recordings')
const ASSETS_DIR = path.resolve(__dirname, 'assets')
const PDF_FILE = path.join(ASSETS_DIR, 'Lesson 4.3 - Biodiversity.pdf')

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
} as const

// ---------------------------------------------------------------------------
// Helpers – human-like interactions
// ---------------------------------------------------------------------------

/** Pause for a natural-feeling duration */
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Random int in [min, max] */
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

/** Type text with variable per-character delay (55-90ms + occasional longer pauses) */
async function humanType(page: Page, selector: string, text: string) {
  await page.click(selector)
  for (const char of text) {
    await page.keyboard.type(char, { delay: 0 })
    // Occasional "thinking" pause after spaces
    if (char === ' ' && Math.random() < 0.25) {
      await pause(rand(120, 220))
    } else {
      await pause(rand(55, 90))
    }
  }
}

/** Smooth scroll by `distance` pixels over `duration` ms */
async function smoothScroll(page: Page, distance: number, duration = 1200) {
  const steps = 30
  const stepPx = distance / steps
  const stepMs = duration / steps
  for (let i = 0; i < steps; i++) {
    await page.evaluate((px) => window.scrollBy(0, px), stepPx)
    await pause(stepMs)
  }
}

/** Smooth scroll inside an element */
async function smoothScrollElement(page: Page, selector: string, distance: number, duration = 1200) {
  const steps = 30
  const stepPx = distance / steps
  const stepMs = duration / steps
  for (let i = 0; i < steps; i++) {
    await page.evaluate(
      ({ sel, px }) => {
        const el = document.querySelector(sel)
        if (el) el.scrollBy(0, px)
      },
      { sel: selector, px: stepPx },
    )
    await pause(stepMs)
  }
}

/** Wait for page to be idle */
async function waitForIdle(page: Page, ms = 500) {
  await page.waitForLoadState('networkidle').catch(() => {})
  await pause(ms)
}

// ---------------------------------------------------------------------------
// Demo walkthrough
// ---------------------------------------------------------------------------
async function runDemo(context: BrowserContext, viewport: keyof typeof VIEWPORTS) {
  const vp = VIEWPORTS[viewport]
  const page = await context.newPage()
  await page.setViewportSize(vp)

  // ── 1. Navigate to home page ──────────────────────────────────────────
  console.log(`[${viewport}] Navigating to home page...`)
  await page.goto(APP_URL, { waitUntil: 'networkidle' })
  await pause(2000) // Let viewer see the hero section

  // ── 2. Scroll down to the upload area ─────────────────────────────────
  console.log(`[${viewport}] Scrolling to upload area...`)
  await smoothScroll(page, 500, 1500)
  await pause(1000)

  // ── 3. Upload PDF ─────────────────────────────────────────────────────
  console.log(`[${viewport}] Uploading PDF...`)
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(PDF_FILE)
  await pause(1500) // Let the file appear in the list

  // ── 4. Scroll down to the form fields ─────────────────────────────────
  await smoothScroll(page, 300, 1000)
  await pause(800)

  // ── 5. Type study guide name ──────────────────────────────────────────
  console.log(`[${viewport}] Filling in study guide name...`)
  await humanType(page, '#studyGuideName', 'Lesson 4.3 - Biodiversity')
  await pause(1000)

  // ── 6. Select Subject = Science ───────────────────────────────────────
  console.log(`[${viewport}] Selecting subject...`)
  // Click the first Select trigger (Subject)
  const subjectTrigger = page.locator('button[role="combobox"]').first()
  await subjectTrigger.click()
  await pause(400)
  await page.locator('[role="option"]').filter({ hasText: 'Science' }).click()
  await pause(800)

  // ── 7. Select Grade Level = 11th Grade ────────────────────────────────
  console.log(`[${viewport}] Selecting grade level...`)
  const gradeTrigger = page.locator('button[role="combobox"]').nth(1)
  await gradeTrigger.click()
  await pause(400)
  await page.locator('[role="option"]').filter({ hasText: '11th Grade' }).click()
  await pause(800)

  // ── 8. Scroll to format selection ─────────────────────────────────────
  await smoothScroll(page, 250, 800)
  await pause(600)

  // ── 9. Select Outline format ──────────────────────────────────────────
  console.log(`[${viewport}] Selecting Outline format...`)
  // The format cards contain the text "Outline"
  const outlineCard = page.locator('div.cursor-pointer').filter({ hasText: /^Outline/ }).first()
  await outlineCard.click()
  await pause(1200)

  // ── 10. Scroll past optional section to Generate button ───────────────
  await smoothScroll(page, 500, 1200)
  await pause(1000)

  // ── 11. Click Generate ────────────────────────────────────────────────
  console.log(`[${viewport}] Clicking Generate...`)
  const generateBtn = page.locator('button').filter({ hasText: 'Generate Study Guide' })
  await generateBtn.click()
  await pause(2000) // Let the generation screen appear

  // ── 12. Generation phase – timelapse ──────────────────────────────────
  // We'll wait for the "Complete! Redirecting..." message.
  // During generation, we speed up the video by taking fewer pauses.
  console.log(`[${viewport}] Waiting for generation (this takes ~20-40s)...`)

  // Record start time for timelapse metadata
  const genStart = Date.now()

  // Wait for completion - the page will show "Complete! Redirecting..."
  // then auto-redirect to the study guide page
  try {
    await page.waitForURL(/\/study-guide\//, { timeout: 120000 })
  } catch {
    // If redirect doesn't happen, try to wait for the study guide content
    console.log(`[${viewport}] Waiting for redirect...`)
    await page.waitForURL(/\/study-guide\//, { timeout: 60000 })
  }

  const genDuration = ((Date.now() - genStart) / 1000).toFixed(1)
  console.log(`[${viewport}] Generation took ${genDuration}s`)

  // ── 13. Study guide viewer – let it load ──────────────────────────────
  console.log(`[${viewport}] Study guide loaded, starting scroll-through...`)
  await waitForIdle(page, 2000)

  // ── 14. Slowly scroll through the study guide content ─────────────────
  // Get total page height to know how far to scroll
  const totalHeight = await page.evaluate(() => document.body.scrollHeight)
  const viewportHeight = vp.height
  const scrollDistance = totalHeight - viewportHeight

  // Scroll through the entire study guide in ~15 seconds
  if (scrollDistance > 0) {
    console.log(`[${viewport}] Scrolling through ${scrollDistance}px of content...`)
    await smoothScroll(page, scrollDistance, Math.min(scrollDistance * 4, 20000))
  }

  await pause(2000) // Hold at the bottom

  // ── 15. Scroll back to top ────────────────────────────────────────────
  await smoothScroll(page, -scrollDistance, 3000)
  await pause(2000)

  console.log(`[${viewport}] Demo complete!`)
  await page.close()
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  // Validate prerequisites
  if (!fs.existsSync(AUTH_SESSION)) {
    console.error('Auth session not found. Run: npx tsx scripts/save-auth.ts')
    process.exit(1)
  }
  if (!fs.existsSync(PDF_FILE)) {
    console.error(`PDF not found at ${PDF_FILE}`)
    console.error('Place "Lesson 4.3 - Biodiversity.pdf" in scripts/assets/')
    process.exit(1)
  }

  fs.mkdirSync(RECORDINGS_DIR, { recursive: true })

  const mode = process.argv[2] as 'desktop' | 'mobile' | undefined
  const targets: Array<keyof typeof VIEWPORTS> =
    mode ? [mode] : ['desktop', 'mobile']

  for (const viewport of targets) {
    const vp = VIEWPORTS[viewport]
    console.log(`\n${'='.repeat(50)}`)
    console.log(`Recording ${viewport} (${vp.width}x${vp.height})`)
    console.log(`${'='.repeat(50)}\n`)

    const browser = await chromium.launch({ headless: false })
    const context = await browser.newContext({
      storageState: AUTH_SESSION,
      viewport: vp,
      recordVideo: {
        dir: RECORDINGS_DIR,
        size: vp,
      },
    })

    await runDemo(context, viewport)

    // Close context to finalize the video file
    const pages = context.pages()
    for (const p of pages) {
      const videoPath = await p.video()?.path()
      if (videoPath) {
        console.log(`Raw video saved: ${videoPath}`)
      }
    }
    await context.close()
    await browser.close()

    // Rename the output file to something meaningful
    const files = fs.readdirSync(RECORDINGS_DIR)
      .filter((f) => f.endsWith('.webm'))
      .map((f) => ({
        name: f,
        time: fs.statSync(path.join(RECORDINGS_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time)

    if (files.length > 0) {
      const latest = files[0].name
      const newName = `demo-${viewport}.webm`
      const oldPath = path.join(RECORDINGS_DIR, latest)
      const newPath = path.join(RECORDINGS_DIR, newName)
      if (fs.existsSync(newPath)) fs.unlinkSync(newPath)
      fs.renameSync(oldPath, newPath)
      console.log(`\nRenamed to: ${newPath}`)
      console.log(`Convert to mp4: ffmpeg -i ${newPath} -c:v libx264 -preset slow -crf 22 ${newPath.replace('.webm', '.mp4')}`)
    }
  }

  console.log('\nDone! Recordings are in scripts/recordings/')
  console.log('\nTo timelapse the generation portion, use ffmpeg:')
  console.log('  ffmpeg -i demo-desktop.webm -vf "setpts=0.1*PTS" -an timelapse-generation.mp4')
  console.log('\nOr splice normal + timelapse + normal with ffmpeg concat.')
}

main().catch(console.error)
