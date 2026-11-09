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

// Daily review-reminder emails (lib/reminders/, cron /api/cron/review-reminders).
// Built 2026-10-04. While off the cron does nothing; preview and test-send with
// scripts/reminders.ts. Turn on only after Matt has seen a sample email.
export const REMINDERS_ENABLED = false

// "Due tomorrow" emails for assigned practice (lib/practice/reminders*.ts, cron
// /api/cron/practice-reminders): one to each student who hasn't turned it in and
// one summary to the teacher. Built 2026-11-08. Separate from the review
// reminders above: these are about work a teacher set, so they go out while the
// review reminders stay off. Preview with scripts/practice-reminders.ts.
export const PRACTICE_REMINDERS_ENABLED = true
