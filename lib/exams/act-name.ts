// "ACT" in a request: the capitalized test name, or "act" followed by a section
// or test word (so "the act of", "Stamp Act" and "Act 1" never match).
export const ACT_NAME = /\bACT\b|\b[Aa]ct\s+(?:[Ee]nglish|[Mm]ath(?:ematics)?|[Rr]eading|[Ss]cience|[Tt]est|[Ee]xam|[Pp]rep|[Pp]ractice|[Ss]ection)\b/
