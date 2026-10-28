// A standardized test as a reference for the guide prompts (lib/exams/profiles.ts).

export interface ExamDomain {
  id: string
  name: string
  /** How much of the test it is, e.g. "about 35% of the test". */
  share: string
  /** Words in a request that point at this domain. */
  detect: RegExp
  /** What the domain tests, one line each. */
  skills: string[]
  /** What the hard items in this domain look like. */
  hard: string[]
  /** The mistakes its wrong answers are built from. */
  traps: string[]
  /** Items in the test's voice, in the quiz format's markers, as style anchors. */
  exemplars: string[]
}

export interface ExamProfile {
  id: string
  /** As used in a sentence: "the digital SAT Math section". */
  name: string
  detect: {
    /** The test's name in a request. */
    exam: RegExp
    /** Words that mean a different section of the same test (no profile for it yet). */
    exclude?: RegExp
    /** Words that confirm the section when the request names the test alone. */
    subjectHints?: RegExp
  }
  /** Item types, stem voice, how data is given: the rules every item follows. */
  itemRules: string
  domains: ExamDomain[]
  /** What each difficulty setting means on this test. */
  difficulty: { standard: string; hard: string; easier: string }
}
