// Options for "what are you studying and why" — shared by the homepage form,
// the generation route (validation) and the prompt builder (guidance text).
// Values are stored as-is in study_guides.subject / grade_level (text columns);
// 'general' means "not specified — infer it".

export const SUBJECTS = [
  { value: 'mathematics', label: 'Math' },
  { value: 'science', label: 'Science' },
  { value: 'english', label: 'English & Writing' },
  { value: 'history', label: 'History & Social Studies' },
  { value: 'foreign-language', label: 'Languages' },
  { value: 'computer-science', label: 'Computer Science & Coding' },
  { value: 'business', label: 'Business & Economics' },
  { value: 'health', label: 'Health & Medicine' },
  { value: 'test-prep', label: 'Test Prep' },
  { value: 'arts', label: 'Arts & Music' },
  { value: 'other', label: 'Other' },
] as const

export const SUBJECT_VALUES = SUBJECTS.map((s) => s.value) as string[]

export const LEVEL_GROUPS = [
  {
    label: 'School',
    levels: [
      { value: '6th-8th', label: 'Middle school (6th–8th)' },
      { value: '9th', label: '9th grade' },
      { value: '10th', label: '10th grade' },
      { value: '11th', label: '11th grade' },
      { value: '12th', label: '12th grade' },
      { value: 'college', label: 'College' },
    ],
  },
  {
    label: 'Experience',
    levels: [
      { value: 'beginner', label: 'Beginner (new to this)' },
      { value: 'intermediate', label: 'Intermediate (know the basics)' },
      { value: 'advanced', label: 'Advanced (going deep)' },
      { value: 'professional', label: 'Professional (working in the field)' },
    ],
  },
] as const

export const LEVEL_VALUES = LEVEL_GROUPS.flatMap((g) => g.levels.map((l) => l.value)) as string[]

export type StudyGoal = 'class' | 'exam' | 'interview' | 'certification' | 'learning'

export const GOALS: Array<{ value: StudyGoal; label: string; hint: string }> = [
  { value: 'class', label: 'A class test', hint: 'Quizzes, unit tests, finals' },
  { value: 'exam', label: 'A big exam', hint: 'SAT, ACT, AP, GRE, MCAT…' },
  { value: 'interview', label: 'A job interview', hint: 'Coding, case, behavioral…' },
  { value: 'certification', label: 'A certification', hint: 'AWS, CPA, nursing boards…' },
  { value: 'learning', label: 'Just learning', hint: 'Understand it for real' },
]

export const GOAL_VALUES = GOALS.map((g) => g.value) as string[]

/** What the uploaded files are, as detected by /api/describe-materials. */
export type MaterialsKind = 'notes' | 'assessment' | 'topic_list'
export const MATERIALS_KINDS: MaterialsKind[] = ['notes', 'assessment', 'topic_list']

/** Whether uploaded materials limit what the guide may cover. */
export type SourcePolicy = 'strict' | 'expand'

// Short display labels for stored subject / level values ('' for 'general').
const LEVEL_SHORT: Record<string, string> = {
  '6th-8th': 'Middle school', '9th': '9th grade', '10th': '10th grade', '11th': '11th grade', '12th': '12th grade',
  college: 'College', beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', professional: 'Professional',
}

function titleize(v: string): string {
  return v.split(/[-_\s]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function displaySubject(value?: string | null): string {
  if (!value || value === 'general') return ''
  return SUBJECTS.find((s) => s.value === value)?.label ?? titleize(value)
}

export function displayLevel(value?: string | null): string {
  if (!value || value === 'general') return ''
  return LEVEL_SHORT[value] ?? titleize(value)
}

/** Question difficulty (the Easier / Standard / Hard picker); default standard. */
export type GuideDifficulty = 'easier' | 'standard' | 'hard'
export const DIFFICULTIES: GuideDifficulty[] = ['easier', 'standard', 'hard']
/** Formats where the picker means something (questions or worked examples). */
export const DIFFICULTY_FORMATS = ['quiz', 'practice', 'flashcards', 'outline', 'summary']

export function normalizeDifficulty(value: unknown): GuideDifficulty {
  return DIFFICULTIES.includes(value as GuideDifficulty) ? (value as GuideDifficulty) : 'standard'
}

/**
 * Language the guide is written in. 'en-es' = English with Spanish support for
 * English language learners (key terms translated, a short Spanish recap).
 * Saved on study_guides.language so Explain, hints and refills match it.
 */
export type GuideLanguage = 'en' | 'es' | 'en-es' | 'ht' | 'pt' | 'fr'
export const GUIDE_LANGUAGES: Array<{ value: GuideLanguage; label: string; name: string; speech: string }> = [
  { value: 'en', label: 'English', name: 'English', speech: 'en-US' },
  { value: 'es', label: 'Español (Spanish)', name: 'Spanish', speech: 'es-US' },
  { value: 'en-es', label: 'English with Spanish support', name: 'English with Spanish support', speech: 'en-US' },
  { value: 'ht', label: 'Kreyòl ayisyen (Haitian Creole)', name: 'Haitian Creole', speech: 'ht-HT' },
  { value: 'pt', label: 'Português (Portuguese)', name: 'Portuguese', speech: 'pt-BR' },
  { value: 'fr', label: 'Français (French)', name: 'French', speech: 'fr-FR' },
]

export function normalizeLanguage(value: unknown): GuideLanguage {
  return GUIDE_LANGUAGES.some((l) => l.value === value) ? (value as GuideLanguage) : 'en'
}

export function languageName(value: unknown): string {
  return GUIDE_LANGUAGES.find((l) => l.value === normalizeLanguage(value))!.name
}

/**
 * Reading levels for "Copy at an easier reading level" (study_guides.reading_level,
 * migration 089): the same guide with the same questions and answers, written so a
 * student who reads below grade level can read it (ELL, ESE, younger readers).
 */
export type ReadingLevel = 'grade2' | 'grade4' | 'grade6' | 'grade8'
export const READING_LEVELS: Array<{ value: ReadingLevel; label: string; note: string; words: string }> = [
  { value: 'grade8', label: 'About 8th grade', note: 'Everyday words, shorter sentences, each term explained once.', words: 'an 8th-grade reading level (about age 13): clear everyday vocabulary, sentences of 15 words or fewer on average, one idea per sentence, and every subject term defined in plain words the first time it appears' },
  { value: 'grade6', label: 'About 6th grade', note: 'Short sentences and common words; harder terms get a plain-words definition.', words: 'a 6th-grade reading level (about age 11): common words, short sentences of about 12 words, concrete examples before abstract statements, and every subject term defined in plain words the first time it appears' },
  { value: 'grade4', label: 'About 4th grade', note: 'Very short sentences, simple words, step-by-step wording.', words: 'a 4th-grade reading level (about age 9): simple high-frequency words, very short sentences of 8 to 10 words, one step at a time, no idioms, and every subject term defined in a few plain words' },
  { value: 'grade2', label: 'About 2nd grade', note: 'The simplest wording possible, for early or emerging readers.', words: 'a 2nd-grade reading level (about age 7, an early or emerging reader): the simplest words possible, sentences of 6 to 8 words, familiar examples, no idioms or figurative language, and subject terms kept only where the question needs them, each explained in a few simple words' },
]
export function normalizeReadingLevel(value: unknown): ReadingLevel | null {
  return READING_LEVELS.some((l) => l.value === value) ? (value as ReadingLevel) : null
}
export function readingLevelLabel(value: unknown): string | null {
  return READING_LEVELS.find((l) => l.value === value)?.label ?? null
}

// Grade 8 and under: from the level picker, or from the title/topic when the
// level was left blank ("Help my 6th grader study math").
const YOUNG_TEXT = /middle school|elementary|\b[1-8](st|nd|rd|th)[ -]grade|\b(first|second|third|fourth|fifth|sixth|seventh|eighth) grade|\bgrade [1-8]\b/i

export function isYoungLearner(level?: string | null, text?: string | null): boolean {
  return level === '6th-8th' || YOUNG_TEXT.test(text ?? '')
}
