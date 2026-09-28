# Casanova Study

## Project Overview
Next.js 15 application (using Turbopack) for creating AI-powered study guides. Users can upload documents and generate personalized study materials.

## Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with email confirmation + Clever SSO
- **Styling**: Tailwind CSS + shadcn/ui components
- **AI**: Claude API for study guide generation
- **File Storage**: Cloudinary

## Key Directories
- `app/` - Next.js app router pages and API routes
- `app/auth/` - Authentication pages (signin, signup, clever callback)
- `app/api/auth/` - Auth API routes (Clever OAuth)
- `components/` - React components (shadcn/ui in `components/ui/`)
- `lib/` - Core utilities (auth.tsx, supabase.ts, supabase-server.ts)
- `supabase/migrations/` - Database migrations (run in Supabase Dashboard)

## Common Commands
```bash
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build
npm run lint     # Run ESLint
npm test         # Unit tests (vitest — currently the mastery engine)
node scripts/e2e-mastery.mjs  # Live E2E smoke tests (needs dev server on :3000;
                              # e2e-phase3/4/5.mjs cover AI suggestion/extract/matrix)
```

## Database Schema
- `user_profiles` - User data (id, email, user_type, first_name, last_name, birth_date, clever_id, pref_* grading defaults)
- `study_guides` - Generated study guides (linked to user_id)
- `grading_results` - Graded exams (also the gradebook projection target for mastery quizzes)
- `classes`, `class_enrollments` - Classes with 6-char enrollment codes
- `assignments` (+ `assignment_class_links`, `assignment_submissions`) - `type` column: 'file_upload' (default) | 'mastery_quiz'
- `concepts`, `question_bank_questions`, `question_review_events` - Teacher question bank; questions have source (manual/ai_suggested/ai_extracted/ai_runtime) and status (suggested/approved/declined/archived); review events store approve/edit/decline signals
- `assignment_mastery_config`, `assignment_mastery_concepts` - Per-assignment mastery settings + concept links
- `mastery_attempts`, `mastery_attempt_concepts`, `mastery_responses` - One resumable attempt per (assignment, student); responses freeze a question_snapshot at serve time (answer NULL = resumable); students have NO SELECT on responses/bank (answers live there — API strips them)

## Mastery Quizzes (adaptive assignments)
Teacher posts a 'Mastery Quiz' assignment; students loop through concept-tagged
questions until each concept hits the threshold (default 80% over the last 5
answers, min 3 answered; cap 15/concept then partial credit).
- Engine: `lib/mastery/engine.ts` (pure functions, unit-tested in engine.test.ts)
- Round construction/AI: `lib/mastery/rounds.ts`, `lib/mastery/ai.ts` (question
  generation + extraction on claude-sonnet-5; SA grading on claude-haiku-4-5
  via `ClaudeService.gradeShortAnswer`)
- Gradebook projection: `lib/mastery/finalize.ts` writes grading_results +
  flips assignment_submissions — existing gradebook needs no changes
- Trust gradient: all AI questions land as status='suggested' until the teacher
  approves (runtime-generated ones too); review events are captured for future tuning
- Question bank UI: `/teacher/question-bank` (server components + client islands
  in `components/question-bank/`); player in `components/mastery/`
- Guardrails: 150 AI-graded short answers/student/day; runtime generation capped
  at 10/concept/attempt; extract route only accepts Cloudinary URLs

## Authentication Flow

### Email/Password Auth
1. User signs up → Creates auth.users entry + user_profiles row
2. Email confirmation required (Supabase sends email)
3. User confirms → Can sign in
4. Session stored in **cookies** (browser client is `@supabase/ssr` `createBrowserClient`), not localStorage

### Clever SSO (Colegia)
1. User clicks "Log in with Colegia" → Redirects to Clever OAuth
2. If district_id configured → Uses instant-login (bypasses school search)
3. User authenticates with Clever → Redirects to `/auth/clever/callback`
4. Callback calls `/api/auth/clever` → Exchanges code for token
5. API creates/updates Supabase user using admin API
6. Returns magic link → User signed in

**Note**: District must approve the app in Clever dashboard before users can authenticate.

## Auth Implementation Details
- `lib/auth.tsx` - AuthProvider with useContext
- Uses `isSigningOutRef` (useRef) to prevent profile fetches during logout
- `onAuthStateChange` filters events: only fetches profile for SIGNED_IN, USER_UPDATED, and TOKEN_REFRESHED (when no user)
- Sign out clears user state immediately before calling Supabase

## Known Issues / Gotchas
- **API identity comes from the session only (2026-09)**: routes call `getRequestUser(request)` (`lib/request-user.ts` — Bearer token first, then cookies) and ignore any `userId` in the body/query; writes use `createAdminClient()` with the verified id. Client calls use `authFetch` (`lib/auth-fetch.ts`: adds the Bearer token, `credentials: 'omit'` — avoids localhost 431s from bloated cookies). Never trust a client-sent user id.
- **Progress sync**: `study_progress (user_id, study_guide_id, kind outline|plan|practice|learn|schedule, data jsonb)`, owner-only RLS. `lib/progress.ts` `loadProgress`/`saveProgress`; `usePersistentSet` keys shaped `cs:<kind>:<guideId>` sync automatically (localStorage first, account copy wins, debounced saves).
- **Print / PDF**: every format has print CSS; `GET /api/pdf/guide/[id]` has PDFShift render the real page in print media (signed-in only; needs `NEXT_PUBLIC_APP_URL` + `PDFSHIFT_API_KEY`). pdf.js renders must use `intent: 'print'` (display intent stalls in background tabs).
- **KaTeX version must match the renderer**: `rehype-katex` renders with its own `katex` dependency, while the CSS is imported from the top-level `katex` package. Keep the top-level `katex` on the same version (`npm ls katex` should show one deduped copy) — a mismatch (0.18 CSS vs 0.16 renderer) misplaced fraction numerators/denominators in every format.
- **Learn mode**: `/study-guide/[id]/learn` — Leitner spaced repetition (`lib/learn/scheduler.ts`, intervals 0/1/2/4/7/15/30 days, mastered = box 5). Items come from `components/learn/items.ts` (`learnItemsFor`) for flashcards/quiz/practice/custom/timeline (timeline → a recall card per event + a put-in-order activity per era); **item ids must stay stable** (parser ids / block ids) since they key saved state. State saved as `study_progress` kind 'learn' + `cs:learn:<id>`. Viewer shows `LearnCallout` with the due count.
- **Exam grading (2026-09-28)**: `gradeExamWithImagesStream` (teacher path) now runs `claude-sonnet-5` with `thinking: { type: 'adaptive' }` and `max_tokens: 32000` — with thinking disabled the same answer scored differently run-to-run. Only `text_delta` is streamed, so thinking never reaches the parser. Parsing lives in `lib/grading/parse.ts` (line-based, unit-tested; labels stored bare, e.g. "2a" — the report adds "Question"). The student/assignment path (`lib/grade-exam-pipeline.ts`) still has its own parser and thinking disabled.
- **pdf.js renders must use `intent: 'print'`** (`lib/pdf-to-images.ts`): the default display intent paces on requestAnimationFrame, which browsers pause in background tabs — PDF→image conversion stalled indefinitely if the user switched tabs.
- **Study guide deletes are owner-only (migration 036)**: `DELETE /api/study-guides/[id]` identifies the caller from their session token (never a body `userId`) and deletes as that user; RLS enforces `auth.uid() = user_id`.
- **Classes are hidden (2026-09-27)**: `CLASSES_ENABLED = false` in `lib/features.ts` removes classes, calendar, quizzes/question bank, My Students/My Teachers and "Assign to Class" from the UI. Routes, APIs and data are untouched (pages still load by URL). Flip the flag to bring them back. The AP review pages (`public/apchem`, `public/apstats`) are standalone and unaffected.
- **RLS (migration 037, 2026-09-28)**: `grading_results` — teacher owns rows (`user_id`), students read rows where `student_user_id` is them; no public read/insert/delete. `student_classes` — teacher manages own roster, student reads own rows. `user_profiles` — SELECT own row only (+ `is_profile_public` profiles, signed-in only); INSERT allows no-session calls (signup inserts the profile before email confirmation, so `auth.uid()` is null) but a signed-in user can only insert their own id. `study_guides` — SELECT stays public (share-by-link); INSERT/UPDATE require `auth.uid() = user_id`. API routes use the service role and are unaffected — **any new browser-side query must only touch the caller's own rows**, or move it behind an API route. Public teacher directory (`/api/teachers*`) now only returns public profiles to signed-in users.
- **Auth screens (2026-09-28)**: all `/auth/*` pages share `components/auth/auth-ui.tsx` (`AuthShell` split layout with brand panel, `Field`, `PasswordField` with show/hide + strength meter, `ColegiaButton`/`cleverLoginUrl`, `StatusCard`, `friendlyAuthError`, `safeNext`). Sign-up is two steps (student/teacher, then details; no confirm-password; birth date optional). Sign-in takes `?next=<in-app path>` (validated by `safeNext`) — build it with `signInPath()` (`lib/sign-in-path.ts`); `AuthGate` already does. Check-email reads the address from `sessionStorage['cs:pending-email']` (kept out of the URL) for its working "Resend" button. The old "Keep me logged in" box was removed — it never did anything.
- **Email Confirmation**: Supabase truncates refresh tokens in email links. Users must sign in manually after confirming.
- **Profile Fetch**: Can be slow on first load (~5s) due to Supabase cold starts. Has 5-second timeout.
- **Auth Events**: onAuthStateChange fires SIGNED_IN before INITIAL_SESSION. Auth init skips events until getSession completes.
- **Clever SSO**: Requires district approval in Clever dashboard. Without approval, users see "Your district has not yet set up this application" error.
- **Model migration (2026-07-09)**: `lib/claude-api.ts` study-guide/grading calls were migrated off the retired `claude-sonnet-4-20250514` (404'd after its 2026-06-15 retirement) to `claude-sonnet-5`. Sonnet 5 **rejects non-default `temperature`/`top_p`/`top_k` with a 400** — all `temperature` args were removed. It also **runs adaptive thinking by default** when `thinking` is omitted (Sonnet 4 ran thinking-off); each call passed `thinking: { type: 'disabled' }` to preserve the old no-thinking behavior. `gradeShortAnswer` stays on `claude-haiku-4-5` (Haiku still accepts `temperature`). Don't re-add `temperature`.
- **Study-guide generation upgraded to Opus 4.8 (2026-07-18)**: `generateStudyGuide` + `generateStudyGuideStream` in `lib/claude-api.ts` now run `claude-opus-4-8` with `thinking: { type: 'adaptive' }` and `max_tokens: 12000` for richer guides. **Because adaptive thinking emits a thinking block first, `response.content[0]` is no longer the text block** — `generateStudyGuide` uses `response.content.find(b => b.type === 'text')` (streaming yields `text_delta` so it's unaffected). This is the same trap noted for `lib/mastery/ai.ts`. Grading methods remain on `claude-sonnet-5` (the streaming teacher grader now uses adaptive thinking — see Exam grading below).
- **Custom-guide builder overhaul (2026-07-19)**: `/create-guide` (block editor `components/custom-guide-editor/`) now supports the 4 study-guide formats mixed in one guide. **Flashcards is a first-class block type** — added across the ~8 touchpoints a block type needs: `SectionContent`/`CustomSection.type` + `isFlashcardsContent` (`lib/types/custom-guide.ts`), `BlockType`/round-trip/`createEmptyBlock` (`lib/types/editor-blocks.ts`), editor `blocks/flashcards-block.tsx`, `block-wrapper.tsx` `typeConfig` **(a total `Record<BlockType>` — a missing key crashes the wrapper)**, the single type→component `switch` in `block-item.tsx` (2026-09-27 editor overhaul replaced the old duplicated switches in `custom-guide-editor.tsx` / `blocks/section-block.tsx`), the insert menu entries in `insert-menu.tsx` (Practice is a block type too — its JSON always goes through `normalizePracticeActivities`: lenient in the editor, strict in the viewer; `PracticeSession` in `practice-format.tsx` is shared by the standalone format and custom guides), and `SectionRenderer` in `components/formats/custom-format.tsx`. Outline & Summary are toolbar **presets** (`createPresetBlock`) over section/text, not new types. **`generateCustomGuideStream` moved to `claude-opus-4-8` + `thinking: { type: 'adaptive' }` (cast `as any` — SDK 0.61 types lack 'adaptive'), `max_tokens: 12000`.** It accepts structured `GuideControls` (formats/counts/split/difficulty/length) for the AI assistant's "Control it" mode; empty controls = generic "AI decides". The route allows a blank description when files or controls are present.
- **Custom-guide editor perf (2026-09-27)**: `lib/contexts/editor-context.tsx` updates only the edited block with stable callbacks; blocks are memoized in `block-item.tsx`. Nested blocks inside sections must NOT register as dnd-kit sortables for the top-level list (drops landed on them and were discarded). Keep these invariants or the editor gets choppy again.
- **Sonnet 5 responses start with a thinking block**: never read `response.content[0]` and assume text — use `content.find(b => b.type === 'text')` (bit us in `lib/mastery/ai.ts`).
- **Type errors now fail the build (2026-09-28)**: the TS baseline was cleaned to **0** (unused shadcn components for uninstalled packages were deleted) and `ignoreBuildErrors` is `false`. Run `npx tsc --noEmit` before pushing — a type error will break the Vercel deploy. (ESLint is still skipped during builds.)
- **Study-guide viewer ReDoS (2026-07-09)**: the old regex markdown→HTML helpers froze the browser on AI tables. They were deleted on 2026-09-27 in favor of react-markdown (no hand-written table regexes left). If you add regexes to `lib/formats/normalize.ts`, keep them line-based/linear, and never flatten multi-line markdown to one line.
- **No Tailwind typography plugin**: `prose` classes are no-ops in this app. `StudyMarkdown` styles every element explicitly via react-markdown `components`.
- **Math**: remark-math runs with `singleDollarTextMath: false` so "$100" stays text. Inline math is `$$x$$`; a `$$…$$` alone on a line is promoted to display math by the normalizer.
- **Auto-description from uploads (2026-09-27)**: attaching files on `/` extracts a short text excerpt in the browser (`lib/material-excerpt.ts`: PPTX/DOCX parsers + PDF.js first 4 pages) and POSTs only the excerpts to `/api/describe-materials` (Haiku, ~$0.001/call) for a one-line topic + subject. It only fills an empty box or replaces its own earlier suggestion. Requests use Bearer auth with `credentials: "omit"` — on localhost, cookies from other local Supabase projects (~15KB) plus the auth header exceed Node's 16KB header limit and return **431**; other Bearer routes can hit the same thing in local dev.
- **Goals, levels, subjects (2026-09-27)**: `lib/study-options.ts` is the single source for the homepage options, route validation and display labels (`displaySubject`/`displayLevel`). Goal (`class`/`exam`/`interview`/`certification`/`learning`) changes the prompt via `GOAL_GUIDANCE` in `lib/claude-api.ts` (e.g. interview → patterns, code, complexity). Levels include school grades and beginner→professional (`describeLevel`). Subject/level blank is saved as `'general'` = infer it; UI hides `'general'`.
- **Materials handling**: `/api/describe-materials` also classifies uploads as `notes` / `assessment` (a quiz/test) / `topic_list`. Assessments and topic lists force `sourcePolicy: 'expand'` (teach what each question tests + fresh practice) — otherwise the "Only use what's in my files" switch picks `strict` vs `expand`.
- **Typed topic mode (2026-09-27)**: `/api/generate-study-guide-stream` accepts `studyRequest` (student-typed topic/notes, ≤8000 chars) with or without files; with no files the prompt switches to "teach from your own knowledge". Stored in `topic_focus` when no focus was given.

## Environment Variables
Required in `.env.local`:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # Required for Clever SSO admin operations

# AI
ANTHROPIC_API_KEY=
11
# File Storage
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=

# Clever SSO
NEXT_PUBLIC_CLEVER_CLIENT_ID=
CLEVER_CLIENT_SECRET=
NEXT_PUBLIC_CLEVER_DISTRICT_ID=   # Optional: enables instant-login
NEXT_PUBLIC_APP_URL=              # Production URL for redirects

# PDF Generation
PDFSHIFT_API_KEY=

# Email (for sharing study guides)
GMAIL_APP_PASSWORD=              # Gmail app password for mattpcasanova@gmail.com
```

## User Types
- **Student**: Can create and study with guides
- **Teacher**: Can create guides and grade student exams

## Key Routes
- `/` - Home = the study guide generator (nav: New Guide / Custom Builder / My Guides, + Grading for teachers) (type a topic and/or attach files). The Canvas-style dashboard was retired 2026-09-27; `/dashboard` and `/create-study-guide` redirect to `/`
- `/auth/signin` - Sign in page (email + Clever SSO)
- `/auth/signup` - Sign up page
- `/auth/clever/callback` - Clever OAuth callback handler
- `/my-guides` - User's saved study guides (format-cover cards, format chips, search, sort, multi-select delete); `/graded-exams` shares the same header/toolbar/card parts from `components/library/library-parts.tsx`
- `/grade-exam` - Exam grading feature
- `/study-guide/[id]` - View a specific study guide
- `/teacher/question-bank` (+ `/[conceptId]`) - Concept-organized question bank (manual entry, AI suggest, import-from-material)
- `/teacher/assignments/[id]` - Assignment detail; shows the mastery progress matrix for mastery quizzes
- `/classes/[id]/assignments/[assignmentId]` - Student assignment page (server component branches: file upload vs mastery player)

## Study Guide Management

### My Guides Page Features
- **Search**: Filter guides by title (text search)
- **Filter**: By subject and format (dropdown filters)
- **Sort**: By date (newest/oldest) or title (A-Z/Z-A)
- **Delete**: Hover over card to reveal delete button with confirmation dialog

### Study Guide Viewer Actions
Floating action bar (bottom-right) with:
- **Save to My Guides**: Shows for logged-in users viewing someone else's guide (creates a copy)
- **Print to PDF**: Browser print dialog
- **Download PDF**: Generates PDF via PDFShift service
- **Share Link**: Native share or copy to clipboard
- **Email**: Opens dialog to send study guide link via email
- **Home**: Navigate back to home
- **Delete**: Only shown for guide owner, with confirmation

### API Routes for Study Guides
- `DELETE /api/study-guides/[id]` - Delete a study guide (owner only)
- `POST /api/study-guides/copy` - Copy a shared guide to user's collection
- `POST /api/share-study-guide` - Send study guide link via email

## Navigation Header
The global `NavigationHeader` component (`components/navigation-header.tsx`) is used on:
- Home page (`app/page.tsx` via `upload-page-redesigned.tsx`)
- Study guide viewer (`components/study-guide-viewer.tsx`)
- My Guides (`app/my-guides/page.tsx`)
- Grade Exam (`app/grade-exam/page.tsx`)

Shows: logo, "My Guides" button (logged-in only), "Grade Exam" button (logged-in only), and user avatar dropdown.

## Study Guide Formats
All viewers render markdown through ONE pipeline (2026-09-27 redesign):
`normalizeGuideMarkdown()` (`lib/formats/normalize.ts`, unit-tested) → `StudyMarkdown`
(`components/formats/study-markdown.tsx`, react-markdown + remark-gfm + remark-math/KaTeX).
- The normalizer strips emoji, `---` rules, `____` note lines, "Notes space" sections and inline HTML, title-cases ALL-CAPS headings, and rewrites blockquote "boxes" into `~~~~callout-<kind> <label>` fences (keyterm/example/check/remember/tip/warning/note). "Check yourself" callouts get a Reveal-answer button.
- Diagram fences: ```` ```steps ````, ```` ```cycle ````, ```` ```tree ```` (`components/formats/diagrams.tsx`). Legacy ASCII-art code fences are auto-upgraded (arrow chains → steps, `│ box │` rows → tree) or shown in a mono panel.
- Outline/Summary share `lib/formats/structure.ts` (title/subtitle/objectives + Essential/Important/Supporting groups of cards; fence-aware so `# comments` in code aren't headings) and `components/formats/guide-parts.tsx` (TOC + scroll-spy).
- `outline-format.tsx` - collapsible topic cards grouped by tier, sticky progress, topic sidebar; "reviewed" state persists in localStorage per guide
- `summary-format.tsx` - article column + "On this page" rail
- `flashcards-format.tsx` - decks from headings, study/list modes, "hide cards I know", real shuffle. **Card ids (`card-N`) key saved progress — keep the parse order stable.**
- `quiz-format.tsx` - grouped by `##` topic, navigator, Practice (instant feedback + `Explanation:` lines) vs Test mode, per-topic results, retry missed
- `practice-format.tsx` (format `'practice'`, added 2026-09-27 + migration 034 widening the `study_guides.format` CHECK) - one-activity-at-a-time interactive review: MATCH / FILL (`{{answer|alt}}`, typo-tolerant) / ORDER / SORT / MC / TF markers parsed by `lib/formats/practice.ts` (unit-tested). Shuffles use `seededShuffle` so SSR and client agree — don't use `Math.random` in render.
- `plan-format.tsx` (format `'plan'`, migration 035) - study plan roadmap: phases of `UNIT:/GOAL:/COVERS:/FORMAT:/TIME:` blocks parsed by `lib/formats/plan.ts` (unit keys `u1…` in document order). "Create this guide" links to `/?plan=<id>&unit=<key>`, which prefills the homepage; the generated guide stores `parent_guide_id` + `plan_unit` (route only links to the caller's own plan) and shows a "Back to plan" bar. "Studied" checkmarks sync to the account (`study_progress` kind `plan`).
- `cheatsheet-format.tsx` (format `'cheatsheet'`, migration 039) - dense printable reference: `##` boxes (fence-aware, `lib/formats/cheatsheet.ts`, unit-tested) in 1-3 columns, tinted by title (formula / common mistakes / mnemonics), search box, prints in two tight columns.
- `timeline-format.tsx` (format `'timeline'`, migration 039) - eras (`## Name (range)`) of `EVENT: date | title` / `WHAT:` / `WHY:` blocks parsed by `lib/formats/timeline.ts` (event keys `e1…` in document order — Learn state depends on them); headings with no events become free sections (Key Themes). "Quiz me: hide dates" covers dates until tapped.
- Study plan tools (2026-09-28): **test-date schedule** — `lib/formats/schedule.ts` (pure, unit-tested) spreads the *remaining* units across study days (3/5/7 per week) before the test, keeps the last day for review, and re-flows as units are checked off; saved as `study_progress` kind `'schedule'` (migration 040) + `cs:schedule:<id>`. **"Create all N guides"** (plan owner only) runs `lib/generate-guide.ts` (headless SSE client for `/api/generate-study-guide-stream`) two at a time with `planId`/`planUnit`, showing per-unit status. Plan units may use any format incl. cheatsheet/timeline.
- Format-aware prompt rules: callouts, intro paragraphs and "## Keep Going" are for outline/summary only — quiz/flashcards/practice/plan/cheatsheet/timeline viewers silently drop anything outside their items, so their skeletons say "items only".
- Code rendering: all code goes through `components/formats/code-view.tsx` (highlight.js `lib/common`, output escaped; theme scoped to `.study-code` in globals.css). Practice activities may carry `code`, and `bug` (FIND_BUG: click the buggy line) is a sixth activity kind — every switch over activity kinds must handle it. Practice body scanning is fence-aware (never parse options inside code fences).
- Guide header (`components/page-banner.tsx`) is the same brand-blue banner for every format; the format shows only as a colored icon tile + pill.
- The generation prompt (`STUDY_GUIDE_STYLE_RULES` + per-format skeletons in `lib/claude-api.ts`) is the output contract for all of the above — change them together.

