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
      { value: 'beginner', label: 'Beginner — new to this' },
      { value: 'intermediate', label: 'Intermediate — know the basics' },
      { value: 'advanced', label: 'Advanced — going deep' },
      { value: 'professional', label: 'Professional — working in the field' },
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
