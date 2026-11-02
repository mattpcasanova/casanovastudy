// Renders an HTML page (default docs/one-pager/student-data.html) to a letter-size PDF with Playwright's Chromium.
// Usage: node docs/one-pager/render.mjs [out.pdf] [in.html]
import { chromium } from "playwright"
import { fileURLToPath } from "node:url"
import path from "node:path"

const here = path.dirname(fileURLToPath(import.meta.url))
const out = process.argv[2] || path.join(here, "student-data.pdf")
const input = path.resolve(process.argv[3] || path.join(here, "student-data.html"))
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto("file://" + input, { waitUntil: "load" })
const overflow = await page.evaluate(() => document.body.scrollHeight - document.body.clientHeight)
await page.pdf({ path: out, format: "Letter", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } })
await browser.close()
console.log(`${out}${overflow > 0 ? ` (content overflows the page by ${overflow}px)` : ""}`)
