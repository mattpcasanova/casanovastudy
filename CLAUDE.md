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
4. Session stored in localStorage (Supabase default)

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
- **RLS Policies**: user_profiles uses permissive policies (USING true) for INSERT/SELECT due to auth.users permission issues. Security enforced via FK constraints + app logic.
- **Email Confirmation**: Supabase truncates refresh tokens in email links. Users must sign in manually after confirming.
- **Profile Fetch**: Can be slow on first load (~5s) due to Supabase cold starts. Has 5-second timeout.
- **Auth Events**: onAuthStateChange fires SIGNED_IN before INITIAL_SESSION. Auth init skips events until getSession completes.
- **Clever SSO**: Requires district approval in Clever dashboard. Without approval, users see "Your district has not yet set up this application" error.
- **Model migration (2026-07-09)**: `lib/claude-api.ts` study-guide/grading calls were migrated off the retired `claude-sonnet-4-20250514` (404'd after its 2026-06-15 retirement) to `claude-sonnet-5`. Sonnet 5 **rejects non-default `temperature`/`top_p`/`top_k` with a 400** — all `temperature` args were removed. It also **runs adaptive thinking by default** when `thinking` is omitted (Sonnet 4 ran thinking-off); each call now passes `thinking: { type: 'disabled' }` to preserve the old no-thinking behavior and avoid truncating at the tuned `max_tokens`. `gradeShortAnswer` stays on `claude-haiku-4-5` (Haiku still accepts `temperature`). If you want higher grading/generation quality later, enable adaptive thinking and raise `max_tokens` — don't re-add `temperature`.
- **Sonnet 5 responses start with a thinking block**: never read `response.content[0]` and assume text — use `content.find(b => b.type === 'text')` (bit us in `lib/mastery/ai.ts`).
- **`ignoreBuildErrors: true`** in next.config.mjs means tsc errors ship silently. Baseline is 55 pre-existing errors — run `npx tsc --noEmit` and don't add to it.

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
- `/` - Home/Create Guide page
- `/auth/signin` - Sign in page (email + Clever SSO)
- `/auth/signup` - Sign up page
- `/auth/clever/callback` - Clever OAuth callback handler
- `/my-guides` - User's saved study guides (with search, filter, sort, delete)
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
Format components in `components/formats/`:
- `outline-format.tsx` - Hierarchical outline with collapsible sections and checkboxes
- `flashcards-format.tsx` - Interactive flip cards with mastered/difficult tracking
- `quiz-format.tsx` - Multiple choice, true/false, and short answer questions
- `summary-format.tsx` - Sectioned summary with key terms

### Outline Format Checkbox Behavior
- Level 0 sections (main title) have no checkbox
- Sections with "learning objectives" or "exam focus" in title have no checkbox
- Auto-checks parent when all children are checked
- Progress bar only counts sections that have checkboxes
