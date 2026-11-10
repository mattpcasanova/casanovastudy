// Which released reports the student has opened on this device, so the homepage
// strip shows a report as new until it is read (a set can be released long
// after it was graded, so its date alone can't say what is new).

const KEY = 'cs:seen-reports'

export function seenReports(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : []
  } catch { return [] }
}

export function markReportSeen(id: string) {
  try {
    const list = seenReports()
    if (list.includes(id)) return
    localStorage.setItem(KEY, JSON.stringify([...list, id].slice(-300)))
  } catch {}
}
