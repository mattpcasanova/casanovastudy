# CasanovaStudy - Setup Instructions

## Overview

CasanovaStudy has been updated to use **web-based study guides** instead of PDFs for faster generation and better interactivity. Study guides are now stored in Supabase and rendered as interactive webpages.

## Key Changes

### Before (PDF-based):
- Generation time: ~15 seconds
- Static PDF output
- PDFShift API cost per generation
- No interactivity

### After (Web-based):
- Generation time: ~5-8 seconds (3x faster!)
- Interactive webpage with progress tracking
- No PDF generation cost (optional on-demand)
- Better mobile experience
- Shareable links

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **Project Settings > API** and copy:
   - Project URL
   - Anon public key

4. Run the database migrations:
   - Go to **SQL Editor** in Supabase dashboard
   - Copy the contents of `supabase/migrations/001_create_study_guides.sql`
   - Paste and run the SQL
   - Copy the contents of `supabase/migrations/002_create_grading_results.sql`
   - Paste and run the SQL

   Alternatively, run `node scripts/run-migration.js` to check migration status and see the SQL to execute.

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

2. Fill in your credentials:

```env
# Required
ANTHROPIC_API_KEY=your_anthropic_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional (only if you want PDF downloads)
PDFSHIFT_API_KEY=your_pdfshift_key

# Optional (for file uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

### 4. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## How It Works

### Study Guide Generation Flow

1. **User uploads files** → Files go to Cloudinary
2. **File processing** → Extract text content
3. **Claude AI generates content** → Based on selected format (~5-8s)
4. **Save to Supabase** → Study guide stored in database
5. **Redirect to webpage** → Interactive study guide at `/study-guide/[id]`

### Four Distinct Formats

#### 1. Outline Format
- Hierarchical, collapsible sections
- Progress tracking (checkboxes)
- Nested content structure
- Color-coded levels

#### 2. Flashcards Format
- 3D flip animation
- Navigate through cards
- Mark as "Mastered" or "Difficult"
- Progress tracking
- Shuffle functionality

#### 3. Quiz Format
- Multiple choice, True/False, Short answer
- Interactive question navigation
- Instant grading with results
- Sample answers for short questions
- Retake functionality

#### 4. Summary Format
- Clean reading format
- Color-coded sections
- Key terms highlighted
- Study tips
- Print-friendly

### Optional PDF Generation

Students can generate a PDF **on-demand** by clicking "Download PDF" button on the study guide page. This:
- Only generates PDF when requested
- Saves money (no automatic generation)
- Uses PDFShift API (requires API key)

## File Structure

```
casanovastudy/
├── app/
│   ├── study-guide/[id]/page.tsx    # Dynamic study guide page
│   ├── grade-exam/page.tsx          # Exam grading page for teachers
│   ├── api/
│   │   ├── generate-study-guide/    # Main generation (saves to Supabase)
│   │   ├── grade-exam/              # Exam grading (saves to Supabase)
│   │   └── generate-pdf/            # Optional on-demand PDF generation
├── components/
│   ├── study-guide-viewer.tsx       # Main viewer component
│   ├── generation-progress.tsx      # Streaming progress indicator
│   └── formats/
│       ├── outline-format.tsx       # Hierarchical outline
│       ├── flashcards-format.tsx    # Interactive flashcards
│       ├── quiz-format.tsx          # Interactive quiz
│       └── summary-format.tsx       # Clean summary
├── lib/
│   └── supabase.ts                  # Supabase client
├── scripts/
│   ├── test-supabase.js             # Test Supabase connection
│   └── run-migration.js             # Check and show migration status
└── supabase/
    └── migrations/
        ├── 001_create_study_guides.sql   # Study guides table
        └── 002_create_grading_results.sql # Grading results table
```

## Database Schema

### study_guides Table
```sql
study_guides (
  id UUID PRIMARY KEY,
  title TEXT,
  subject TEXT,
  grade_level TEXT,
  format TEXT,                       # 'outline' | 'flashcards' | 'quiz' | 'summary'
  content TEXT,
  topic_focus TEXT,
  difficulty_level TEXT,
  additional_instructions TEXT,
  file_count INTEGER,
  token_usage JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### grading_results Table
```sql
grading_results (
  id UUID PRIMARY KEY,
  student_name TEXT,
  answer_sheet_filename TEXT,
  student_exam_filename TEXT,
  total_marks INTEGER,
  total_possible_marks INTEGER,
  percentage NUMERIC(5, 2),
  grade TEXT,
  content TEXT,
  grade_breakdown JSONB,
  additional_comments TEXT,
  pdf_url TEXT,
  token_usage JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Benefits of Web-Based Approach

### Speed
- **3x faster** generation (no PDF rendering)
- Instant page load for study guides
- Better user experience

### Cost
- **No PDF costs** for every generation
- PDFs only when students request them
- Saves ~$0.02-0.05 per study guide

### Features
- **Interactive elements**: Progress tracking, flashcard flipping, quiz scoring
- **Mobile-friendly**: Responsive design
- **Shareable**: Students can share links with classmates
- **Print support**: Browser print works great

### Student Experience
- **Better UX**: Interactive, not static
- **Progress tracking**: Mark sections as complete
- **Accessibility**: Better screen reader support
- **Search**: Browser find works on content

## Troubleshooting

### Supabase Connection Issues
- Check that environment variables are correct
- Verify Supabase project is active
- Check RLS policies are enabled

### PDF Generation Not Working
- Ensure `PDFSHIFT_API_KEY` is set (optional)
- Check PDFShift account has credits
- PDF generation is optional - web view works without it

### Format Not Rendering Correctly
- Check Claude API response format
- Verify content parsing in format components
- Test with different study materials

## Next Steps

1. Test all four formats with real course materials
2. Customize format styling to match your preferences
3. Add more interactive features as needed
4. Deploy to Vercel

## Questions?

Check the main README or open an issue on GitHub.
