// Shared markdown → HTML renderer for study-guide formats.
//
// Consolidated from the four format components (outline/flashcards/quiz/summary)
// which each carried a copy. Keeping ONE copy shrinks the surface for the
// catastrophic-backtracking table bug documented in CLAUDE.md.
//
// ⚠️ The two table regexes below are deliberately non-backtracking / line-anchored.
// Do NOT reintroduce nested quantifiers like (.+\|)+, and never flatten multi-line
// markdown onto a single line before table detection — either reopens the ReDoS
// that froze the browser on AI-generated tables.

function renderTables(input: string): string {
  // Markdown tables WITH a separator row (| --- | --- |)
  const tableRegex = /\|[^\n]+\|\n\|[-:\s|]+\|\n(?:\|[^\n]+\|\n?)+/gm
  let out = input.replace(tableRegex, (match) => {
    const lines = match.trim().split("\n")
    if (lines.length < 2) return match

    const headerCells = lines[0].split("|").filter((cell) => cell.trim())
    const bodyRows = lines.slice(2) // skip header + separator
    return buildTable(headerCells, bodyRows)
  })

  // Simpler tables WITHOUT a separator row (consecutive lines with pipes)
  const simpleTableRegex = /(?:^.*\|.*\|.*$\n?){2,}/gm
  out = out.replace(simpleTableRegex, (match) => {
    if (match.includes("<table") || match.includes("<div")) return match // already processed

    const lines = match
      .trim()
      .split("\n")
      .filter((l) => l.includes("|"))
    if (lines.length < 2) return match

    const headerCells = lines[0].split("|").filter((cell) => cell.trim())
    if (headerCells.length < 2) return match // not a real table

    let startRow = 1
    if (lines[1] && /^[\s|:-]+$/.test(lines[1])) startRow = 2
    return buildTable(headerCells, lines.slice(startRow))
  })

  return out
}

function buildTable(headerCells: string[], bodyRows: string[]): string {
  let html =
    '<div class="not-prose overflow-x-auto my-5 rounded-lg border border-slate-200"><table class="min-w-full border-collapse text-sm">'
  html += '<thead class="bg-slate-50"><tr>'
  headerCells.forEach((cell) => {
    html += `<th class="border-b border-slate-200 px-4 py-2.5 text-left font-semibold text-slate-900">${cell.trim()}</th>`
  })
  html += "</tr></thead><tbody>"
  bodyRows.forEach((row) => {
    const cells = row.split("|").filter((cell) => cell.trim())
    if (cells.length === 0) return
    html += '<tr class="border-b border-slate-100 last:border-0">'
    cells.forEach((cell) => {
      html += `<td class="px-4 py-2.5 text-slate-700 align-top">${cell.trim()}</td>`
    })
    html += "</tr>"
  })
  html += "</tbody></table></div>"
  return html
}

/**
 * Render markdown-ish study-guide content to HTML.
 * Handles tables, #### / ### / ## headers, bold/italic, and bullet lists.
 */
export function formatContent(content: string): string {
  const clean = content
    .replace(/^—$/gm, "")
    .replace(/^-{2,}$/gm, "")
    .trim()
  if (!clean) return ""

  return renderTables(clean)
    .replace(/^#### (.+)$/gm, '<h4 class="text-sm font-semibold text-slate-800 mt-4 mb-1.5">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-slate-900 mt-5 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-slate-900 mt-6 mb-2">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^[-•] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, '<ul class="list-disc pl-5 space-y-1.5 my-3 marker:text-slate-400">$&</ul>')
    // line breaks, but not right after block elements
    .replace(/(?<!<\/h[2-4]>|<\/table>|<\/div>|<\/ul>|<\/li>)\n/g, "<br>")
}

/**
 * Variant used by the Summary format for sections that are bullet-heavy:
 * renders each bullet as a soft "key point" row instead of a plain list.
 */
export function formatContentWithKeyPoints(content: string): string {
  const lines = content.split("\n")
  let html = ""
  let inList = false

  const bold = (t: string) => t.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
  const closeList = () => {
    if (inList) {
      html += "</ul>"
      inList = false
    }
  }

  for (const raw of lines) {
    const trimmed = raw.trim()
    if (trimmed === "—" || trimmed === "--" || trimmed === "---") continue

    if (trimmed.startsWith("#### ")) {
      closeList()
      html += `<h4 class="text-sm font-semibold text-slate-800 mt-4 mb-1.5">${trimmed.slice(5)}</h4>`
    } else if (trimmed.startsWith("### ")) {
      closeList()
      html += `<h3 class="text-base font-semibold text-slate-900 mt-5 mb-2">${trimmed.slice(4)}</h3>`
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      if (!inList) {
        html += '<ul class="space-y-2 my-3">'
        inList = true
      }
      html += `
        <li class="flex items-start gap-2.5">
          <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300"></span>
          <span class="text-slate-700 leading-relaxed">${bold(trimmed.slice(2).trim())}</span>
        </li>`
    } else {
      closeList()
      if (trimmed) html += `<p class="mb-3 text-slate-700 leading-relaxed">${bold(trimmed)}</p>`
    }
  }

  closeList()
  return html
}
