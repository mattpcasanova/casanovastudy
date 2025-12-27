# Casanova Study

## Project Overview
Next.js 15 application (using Turbopack) for creating AI-powered study guides. Users can upload documents and generate personalized study materials.

## Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with email confirmation
- **Styling**: Tailwind CSS + shadcn/ui components
- **AI**: Claude API for study guide generation
- **File Storage**: Cloudinary

## Key Directories
- `app/` - Next.js app router pages and API routes
- `components/` - React components (shadcn/ui in `components/ui/`)
- `lib/` - Core utilities (auth.tsx, supabase.ts)
- `supabase/migrations/` - Database migrations (run in Supabase Dashboard)

## Common Commands
```bash
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build
npm run lint     # Run ESLint
```

## Database Schema
- `user_profiles` - User data (id, email, user_type, first_name, last_name, birth_date)
- `study_guides` - Generated study guides (linked to user_id)
- `grading_results` - Graded exams

## Authentication Flow
1. User signs up → Creates auth.users entry + user_profiles row
2. Email confirmation required (Supabase sends email)
3. User confirms → Can sign in
4. Session stored in localStorage (Supabase default)

## Known Issues / Gotchas
- **RLS Policies**: user_profiles uses permissive policies (USING true) for INSERT/SELECT due to auth.users permission issues. Security enforced via FK constraints + app logic.
- **Email Confirmation**: Supabase truncates refresh tokens in email links. Users must sign in manually after confirming.
- **Profile Fetch**: Can be slow on first load (~5s) due to Supabase cold starts. Has 5-second timeout.
- **Auth Events**: onAuthStateChange fires SIGNED_IN before INITIAL_SESSION. Auth init skips events until getSession completes.

## Environment Variables
Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## User Types
- **Student**: Can create and study with guides
- **Teacher**: Can create guides and grade student exams
