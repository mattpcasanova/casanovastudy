// Pages of the hidden classes feature (calendar, question bank, mastery
// quizzes, practice tests, My Students / My Teachers, teacher profiles and
// practice-test share links) still exist on disk. middleware.ts answers 404
// for them while CLASSES_ENABLED is false. /classes/join and the live teacher
// sections stay open.
const LIVE_TEACHER_SECTIONS = new Set(['classes', 'courses', 'practice', 'progress', 'verify'])

export function hiddenWhileClassesOff(pathname: string): boolean {
  const [first, second] = pathname.split('/').filter(Boolean)
  if (first === 'calendar' || first === 'my-students' || first === 'my-teachers' || first === 'p') return true
  if (first === 'classes') return second !== undefined && second !== 'join'
  if (first === 'teacher') return second !== undefined && !LIVE_TEACHER_SECTIONS.has(second)
  return false
}
