// School years and courses for classes (migration 056). Pure; unit-tested.
// School years run July 1 to June 30 and are written "2026-27" (the database
// default, cs_school_year, uses the same rule in Eastern time).

export function schoolYearFor(date: Date = new Date()): string {
  // Eastern time, like the database: a class made late on June 30 still counts as that year.
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'numeric' }).formatToParts(date)
  const year = Number(parts.find((p) => p.type === 'year')?.value)
  const month = Number(parts.find((p) => p.type === 'month')?.value)
  const start = month >= 7 ? year : year - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
}

export function nextSchoolYear(year: string): string {
  const start = Number(year.slice(0, 4)) + 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
}

/** Newest first. */
export function sortYears(years: string[]): string[] {
  return [...new Set(years)].sort((a, b) => b.localeCompare(a))
}

/** "AP Chemistry - Period 2", "AP Chem (P3)", "Algebra 1 Block 4" → the course name without the period. */
export function courseName(className: string, course?: string | null): string {
  if (course?.trim()) return course.trim()
  return className
    .replace(/[\s,\-–(]*(?:(?:period|per\.?|pd\.?|block|hour|section|sec\.?)\s*:?\s*[0-9]{1,2}[a-z]?|p\s?[0-9]{1,2}[a-z]?|[0-9]{1,2}(?:st|nd|rd|th)\s+(?:period|hour))\)?\s*$/i, '')
    .trim() || className.trim()
}

/** Key that links the same course across periods and years. */
export const courseKey = (className: string, course?: string | null) =>
  courseName(className, course).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
