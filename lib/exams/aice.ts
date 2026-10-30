// Shared pieces for the Cambridge International AS & A Level exams (AICE in
// Florida): how the papers ask (command words with marks in brackets, mark
// schemes that award one mark per creditable point, levels-based marking for
// essays), used by every aice-*.ts profile. Detection needs the programme
// named (AICE, Cambridge, AS/A Level) plus the subject.

/** "AICE", "Cambridge", "AS Level", "A Level", "A-Level" (any case for the first two; the level words need the word Level). */
export const AICE_NAME = /\bAICE\b|\bCambridge\b|\b(?:AS|A)[- ]?Level\b|\bAS\s*\/\s*A\s+Level\b/i

export interface AiceRuleOptions {
  /** The subject has a multiple-choice paper (40 items, four options, one mark each). */
  mcq?: boolean
  /** The structured-question paper's typical mark range per part. */
  structured?: string
  /** Extra subject-specific lines appended to the rules. */
  extra?: string[]
}

export const AICE_ITEM_RULES = (exam: string, o: AiceRuleOptions = {}) => {
  const lines = [
    `ITEM FORMAT (every question must follow this; it overrides the format's own mix of question types):`,
    o.mcq
      ? `- Multiple-choice items have exactly four options A-D, as on the subject's multiple-choice paper (40 items, one mark each, no penalty). Each tests one idea applied to a situation or data, never a bare definition. No true/false, no "I, II and III" lists.`
      : `- ${exam} has no multiple-choice paper. Multiple-choice items may still be used as quick checks, with exactly four options A-D, each a plausible candidate answer in the examiner's words; but at least half of the items must be the exam's own structured or essay-style parts below. No true/false, no "I, II and III" lists.`,
    `- Structured-question parts are SA_QUESTION written exactly as Cambridge writes them: the stem gives a context, data or a source (in a \`\`\`passage fence or a kind: table figure), then a part with a command word and the marks in square brackets at the end: "State ... [1]", "Describe ... [2]", "Explain why ... [3]", "Suggest ... [2]", "Outline ... [2]", "Compare ... [3]", "Calculate ... Show your working. [2]", "Evaluate ... [6]", "Discuss ... [8]", "To what extent ... [10]". ${o.structured ?? 'Parts are mostly 1-4 marks; one longer part of 6-10 marks per set.'}`,
    `- Command words mean what Cambridge says they mean: "state" wants one phrase with no explanation; "describe" the features or the pattern (what); "explain" the reasons (why, with a mechanism or a cause); "suggest" an answer the candidate reasons out from the information, not one recalled; "evaluate", "assess" and "discuss" need both sides and a supported judgement; "to what extent" ends with a weighed conclusion.`,
    `- The Sample Answer is the mark scheme: one line per creditable point with its mark ("1 mark: ...; 1 mark: ..."), as many points as the marks allow (and one or two alternatives the examiner would also credit), then what does not score ("a restatement of the stem earns nothing"; "'it helps' with no mechanism earns nothing"). For levels-marked parts (6+ marks), give the level descriptors (Level 3: developed explanation with both sides and a supported judgement, 5-6 marks; Level 2: some explanation, one-sided or unsupported, 3-4 marks; Level 1: assertions, 1-2 marks) and a model Level 3 answer in 3-5 sentences.`,
    `- Numbers in a calculation must be ones that work with the method the exam allows; solve every item from its final numbers before writing the key, and NUM_QUESTION only for a calculation (at most one item in six). Never invent a named study, author, statistic or place; data in a stimulus is labeled as illustrative.`,
    `- British spelling throughout (colour, centre, organisation, programme), as the papers use it.`,
    `- The part's full wording goes on the question line itself ("SA_QUESTION: Using Fig. 1, explain two reasons why ... [4]"), with the stimulus in the fence or figure under it; never a bare "Read the article and answer the question" stem with the real question hidden after the fence.`,
    `- Explanations stay short: the point the mark scheme credits and the trap in the most tempting wrong option.`,
  ]
  return [...lines, ...(o.extra ?? [])].join('\n')
}

export const AICE_DIFFICULTY = {
  standard: `DIFFICULTY ON THIS TEST: the real mix minus the one-mark recall items. At most 1 item in 8 a "state" or definition item, never first in a section; about half typical (one concept applied to a new context, a 2-3 mark "explain"); at least a third of the kind under WHAT HARD LOOKS LIKE (data to interpret before the question, "suggest" from unfamiliar information, a 6+ mark evaluation).`,
  hard: `DIFFICULTY ON THIS TEST: the parts that separate an A from a C. At least 4 of every 5 items must be ones a C-grade candidate loses marks on: "suggest" and "evaluate" parts on unfamiliar contexts, data with a trend that needs qualifying, multi-step calculations, items whose wrong options are the textbook answer to a slightly different question, and levels-marked parts where the judgement must be supported. Hard never means content outside the syllabus.`,
  easier: `DIFFICULTY ON THIS TEST: the parts most candidates get right, one idea each, with the command word doing exactly what it says ("state", "describe"), in the exam's voice. Still real exam parts.`,
}
