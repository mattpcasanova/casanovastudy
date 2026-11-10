// The score bands used on chips, bars and the class score spread.

export const SCORE_BANDS = [
  { label: '80% and up', min: 80 },
  { label: '65 to 79%', min: 65 },
  { label: '50 to 64%', min: 50 },
  { label: 'Under 50%', min: -Infinity },
] as const

/** How many scores fall in each band, top band first. */
export function scoreBands(percents: number[]): number[] {
  const counts = SCORE_BANDS.map(() => 0)
  for (const p of percents) counts[SCORE_BANDS.findIndex((b) => p >= b.min)]++
  return counts
}
