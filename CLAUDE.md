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
```

## Database Schema
- `user_profiles` - User data (id, email, user_type, first_name, last_name, birth_date, clever_id)
- `study_guides` - Generated study guides (linked to user_id)
- `grading_results` - Graded exams

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

## Environment Variables
Required in `.env.local`:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # Required for Clever SSO admin operations

# AI
ANTHROPIC_API_KEY=

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
```

## User Types
- **Student**: Can create and study with guides
- **Teacher**: Can create guides and grade student exams

## Key Routes
- `/` - Home/Create Guide page
- `/auth/signin` - Sign in page (email + Clever SSO)
- `/auth/signup` - Sign up page
- `/auth/clever/callback` - Clever OAuth callback handler
- `/my-guides` - User's saved study guides
- `/grade-exam` - Exam grading feature
