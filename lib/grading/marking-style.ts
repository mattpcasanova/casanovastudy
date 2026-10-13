// Optional exam-board marking (AICE / Cambridge and similar). Each part is
// off unless the teacher turns it on for a paper; the grader then adds one
// "Codes: … | Level: … | AO: …" line under each question (parsed by
// applyTags in parse.ts).

export interface MarkingStyle {
  /** Cambridge mark types: M1 method, A1 accuracy, B1 independent. */
  codes?: boolean
  /** Levels of response for extended answers ("Level 3"). */
  levels?: boolean
  /** Marks split by assessment objective (AO1, AO2...). */
  ao?: boolean
}

export function normalizeMarkingStyle(input: unknown): MarkingStyle {
  if (!input || typeof input !== 'object') return {}
  const raw = input as Record<string, unknown>
  return { codes: raw.codes === true, levels: raw.levels === true, ao: raw.ao === true }
}

export function usesMarkingStyle(style: MarkingStyle | null | undefined): boolean {
  return !!(style?.codes || style?.levels || style?.ao)
}

/** Prompt block for the grader. With nothing turned on, codes appear only when the mark scheme itself uses them. */
export function markingStyleInstructions(style: MarkingStyle | null | undefined): string {
  const parts: string[] = []
  if (style?.codes) parts.push('Codes: the mark types earned and lost in order, e.g. "Codes: M1 A1 M1 A0" (M = method, A = accuracy, B = independent; 0 = not earned). Use the mark scheme\'s own codes when it has them.')
  if (style?.levels) parts.push('Level: for extended or essay answers marked by levels of response, the level reached, e.g. "Level: 3". Leave it out for short answers.')
  if (style?.ao) parts.push('AO: the marks earned per assessment objective, e.g. "AO: AO1 2, AO2 3, AO3 1". Use the mark scheme\'s AO split when it gives one.')

  const format = 'Put it on its own line directly under that question\'s Mark line, parts separated by " | ", e.g.:\n**Question 2**, Mark: 7/12 - feedback...\nCodes: M1 A1 B1 | Level: 3 | AO: AO1 3, AO2 2, AO3 2'
  if (!parts.length) {
    return `EXAM-BOARD CODES (only if the mark scheme uses them): if the mark scheme labels marks with codes such as M1/A1/B1, levels of response, or assessment objectives (AO1, AO2...), add a tag line with what applies. ${format}\nOtherwise do not add tag lines.`
  }
  return `EXAM-BOARD MARKING (the teacher asked for this on every question where it applies):\n${parts.map((p) => `- ${p}`).join('\n')}\n${format}`
}
