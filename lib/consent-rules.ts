// Who needs a parent's OK before using the app (COPPA). Pure and unit-tested;
// the server side is lib/consent.ts, the pages are /consent (student) and
// /parent-consent (parent's link).

export const CONSENT_AGE = 13
/** Younger than this is a typo (e.g. the date picker left on this year), so we ask again. */
export const MIN_PLAUSIBLE_AGE = 5

/** Whole years old on `now`, or null for a missing/invalid date. */
export function ageOn(birthDate: string | null | undefined, now = new Date()): number | null {
  if (!birthDate) return null
  const m = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  let age = now.getFullYear() - y
  if (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) age--
  return age >= 0 && age < 130 ? age : null
}

export type ConsentStep =
  | 'ok'            // nothing needed
  | 'birthdate'     // a student account with no birth date: ask once
  | 'parent'        // under 13, no parent asked yet
  | 'pending'       // waiting for the parent to approve

/**
 * What a student must do before using the app. Teachers, school (Clever)
 * sign-ins and students 13+ are fine. Once a parent has been asked, the
 * account stays gated until they approve, even if the birth date is changed.
 */
export function consentStep(input: {
  userType?: string | null
  birthDate?: string | null
  viaSchool?: boolean
  status?: 'pending' | 'granted' | 'school' | null
  now?: Date
}): ConsentStep {
  if (input.status === 'granted' || input.status === 'school') return 'ok'
  if (input.status === 'pending') return 'pending'
  if (input.userType !== 'student' || input.viaSchool) return 'ok'
  const age = ageOn(input.birthDate, input.now)
  if (age === null || age < MIN_PLAUSIBLE_AGE) return 'birthdate'
  return age < CONSENT_AGE ? 'parent' : 'ok'
}

/** A birth date a student could really have (rejects blanks and this-year typos). */
export function isPlausibleBirthDate(birthDate: string | null | undefined, now = new Date()): boolean {
  const age = ageOn(birthDate, now)
  return age !== null && age >= MIN_PLAUSIBLE_AGE
}

export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim()) && s.length <= 200
}
