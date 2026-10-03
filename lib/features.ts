// Feature switches for sections of the app that are built but not currently
// surfaced. Flip to true to bring them back — routes, APIs and data are intact.

// Classes, assignments, calendar, question bank, mastery quizzes, "My Students"
// and "My Teachers". Hidden 2026-09-27 to keep the product focused on study
// guides (the pages still work by direct URL).
export const CLASSES_ENABLED = false

// Free vs Premium: caps, Premium-only formats/options, the Premium dialog,
// plan line in the account menu and access codes (lib/plan-rules.ts,
// lib/plans.ts, components/plan/). Built 2026-10-03, off until Matt launches
// Premium. While off nobody is capped (Explain keeps a 150/day safety limit),
// but guides, explanations and gradings are still recorded in usage_events.
export const PLANS_ENABLED = false
