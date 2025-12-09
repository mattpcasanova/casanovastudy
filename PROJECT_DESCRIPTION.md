# CasanovaStudy - Project Description

## Overview

**CasanovaStudy** is a Next.js 15 web application that helps students and educators transform course materials (PDFs, DOCX, PPTX) into personalized study guides and grade exams using AI. The application uses Claude AI (Anthropic) to intelligently process educational content and generate formatted study materials or exam grading reports.

## Core Functionality

### 1. Study Guide Generation
- **Input**: Students upload course materials (PDF, DOCX, PPTX files)
- **Configuration**: Users specify study guide name, subject, grade level, format, and optional customization (topic focus, difficulty level, additional instructions)
- **Processing**: 
  - Files are uploaded to Cloudinary for storage
  - Text content is extracted from files
  - Claude AI analyzes the content and generates a study guide in the requested format
  - A styled PDF is generated using PDFShift (HTML-to-PDF service)
- **Output**: Downloadable PDF study guide with formatted content
- **Formats Available**: Outline, Flashcards, Quiz, Summary

### 2. Exam Grading
- **Input**: Mark scheme PDF/DOCX and student exam PDF/DOCX
- **Processing**:
  - Both files are processed to extract text content
  - Claude Vision API is used to read handwritten exams (PDFs converted to images)
  - Claude AI compares student answers against the mark scheme
  - Generates detailed grading breakdown with marks per question
- **Output**: Formatted PDF report showing:
  - Overall grade (A* through F) and percentage
  - Question-by-question breakdown with marks awarded/possible
  - Explanations for each question
  - Strengths and focus areas summary

## Technical Architecture

### Tech Stack
- **Framework**: Next.js 15.5.2 with App Router
- **Language**: TypeScript
- **UI**: React 19, Tailwind CSS 4, shadcn/ui components
- **AI**: Anthropic Claude API (@anthropic-ai/sdk)
- **PDF Generation**: PDFShift (HTML-to-PDF service)
- **File Processing**: 
  - `mammoth` for DOCX files
  - `pdf-parse` and `pdfjs-dist` for PDF text extraction
  - Custom file processing utilities
- **Cloud Storage**: Cloudinary for file uploads
- **Email**: Nodemailer (optional, for sending study guides)
- **Deployment**: Vercel (serverless functions)

### Project Structure

```
casanovastudy/
├── app/
│   ├── api/
│   │   ├── generate-study-guide/route.ts    # Main study guide generation endpoint
│   │   ├── grade-exam/route.ts               # Exam grading endpoint
│   │   ├── upload/route.ts                   # File upload endpoint (legacy)
│   │   ├── upload-to-cloudinary/route.ts     # Cloudinary upload endpoint
│   │   ├── send-email/route.ts               # Email sending endpoint
│   │   └── pdf/[filename]/route.ts           # PDF serving endpoint (in-memory storage)
│   ├── page.tsx                              # Main page (upload/results router)
│   ├── layout.tsx                            # Root layout
│   └── [subject]/                            # Subject-specific study guide pages
├── components/
│   ├── upload-page.tsx                       # File upload and configuration UI
│   ├── results-page.tsx                      # Study guide results display
│   └── ui/                                   # shadcn/ui component library
├── lib/
│   ├── claude-api.ts                         # Claude AI service wrapper
│   ├── file-processing.ts                    # File extraction utilities
│   ├── pdfshift-pdf-generator.ts             # PDFShift HTML-to-PDF service
│   ├── cloudinary-service.ts                 # Cloudinary integration
│   ├── email-service.ts                      # Email sending service
│   ├── client-compression.ts                 # Client-side file compression
│   └── client-pdf-to-images.ts              # Client-side PDF to images
├── types/
│   └── index.ts                               # TypeScript type definitions
└── public/
    └── study-guides/                         # Generated PDF storage (local)
```

## Key Workflows

### Study Guide Generation Flow
1. User uploads files via `upload-page.tsx` (drag-and-drop or file picker)
2. Files are validated (type, size limits - 20MB max, with compression for PDFs >10MB)
3. Files are uploaded directly to Cloudinary from client using `ClientCompression.uploadToCloudinary()`
4. Client calls `/api/generate-study-guide` with Cloudinary file URLs
5. Server processes files:
   - Downloads from Cloudinary URLs
   - Extracts text content using `FileProcessor.processFileFromUrl()`
   - Combines all file content
6. Claude AI generates study guide content based on format and configuration
7. PDF is generated using PDFShift from HTML template
8. PDF is stored in-memory and served via `/api/pdf/[filename]`
9. Results displayed in `results-page.tsx` with download/email options

### Exam Grading Flow
1. User uploads mark scheme and student exam files
2. Both files are processed to extract text
3. For PDFs, Claude Vision API is used (files converted to images server-side)
4. Claude AI analyzes and grades the exam against the mark scheme
5. Response is parsed to extract:
   - Question-by-question marks (awarded/possible)
   - Overall totals
   - Explanations
6. Grading PDF is generated with formatted breakdown
7. Results displayed with grade, percentage, and detailed feedback

## API Endpoints

### POST `/api/generate-study-guide`
**Request Body:**
```typescript
{
  cloudinaryFiles: Array<{ url, filename, size, format }>,
  studyGuideName: string,
  subject: string,
  gradeLevel: string,
  format: 'outline' | 'flashcards' | 'quiz' | 'summary',
  topicFocus?: string,
  difficultyLevel?: string,
  additionalInstructions?: string
}
```

**Response:**
```typescript
{
  success: boolean,
  data: {
    id: string,
    title: string,
    content: string,
    format: string,
    pdfUrl: string,
    pdfDataUrl: string, // base64 fallback
    tokenUsage: { input_tokens, output_tokens, total_tokens }
  }
}
```

### POST `/api/grade-exam`
**Request:** FormData with:
- `markScheme`: File (PDF/DOCX)
- `studentExam`: File (PDF/DOCX)
- `additionalComments`: string (optional)

**Response:**
```typescript
{
  success: boolean,
  data: {
    pdfUrl: string,
    pdfDataUrl: string,
    totalMarks: number,
    totalPossibleMarks: number,
    gradeBreakdown: Array<{
      questionNumber: string,
      marksAwarded: number,
      marksPossible: number,
      explanation: string
    }>,
    fullResponse: string
  }
}
```

### GET `/api/pdf/[filename]`
Serves PDFs stored in-memory. Used for generated study guides and graded exams.

## Key Libraries and Services

### Claude API Integration (`lib/claude-api.ts`)
- `ClaudeService` class handles all Claude API interactions
- Methods:
  - `generateStudyGuide()` - Creates study guides from content
  - `gradeExamWithImages()` - Grades exams using text and/or images
- Uses Claude 3.5 Sonnet model
- Handles token usage tracking

### File Processing (`lib/file-processing.ts`)
- `FileProcessor` class handles file extraction
- Methods:
  - `processFile()` - Processes uploaded files
  - `processFileFromUrl()` - Downloads and processes from Cloudinary URLs
- Supports: PDF (text extraction), DOCX (mammoth), PPTX (basic)
- Handles file size limits and compression

### PDF Generation (`lib/pdfshift-pdf-generator.ts`)
- `PDFShiftPDFGenerator` class
- Converts HTML content to PDF using PDFShift API
- Handles styling, page breaks, and formatting
- Returns PDF as Buffer for storage/serving

### Cloudinary Integration
- Files uploaded directly from client to Cloudinary
- Bypasses Vercel's 4.5MB serverless function limit
- Used for temporary storage during processing

## Important Implementation Details

### File Upload Strategy
- **Client-side upload to Cloudinary**: Files are uploaded directly from the browser to Cloudinary to avoid Vercel's 4.5MB serverless function limit
- **Compression**: PDFs over 10MB are automatically compressed client-side (60-80% reduction typical)
- **Validation**: File type and size validation happens client-side before upload

### PDF Storage
- PDFs are stored **in-memory** using a Map in `/app/api/pdf/[filename]/route.ts`
- This works for Vercel serverless but is ephemeral (lost on function restart)
- Base64 `pdfDataUrl` is provided as fallback for reliable downloads
- For production, consider persistent storage (S3, Cloudinary, etc.)

### Claude API Usage
- Study guides use text-only Claude API
- Exam grading uses Claude Vision API for PDFs (handwritten exams)
- Token usage is tracked and returned in responses
- Prompts are customized based on format, grade level, and difficulty

### Error Handling
- Comprehensive error handling with user-friendly messages
- Timeout handling for long-running PDF generation
- Validation at multiple stages (client and server)
- Fallback mechanisms (base64 PDFs, error messages)

## Current Limitations & Known Issues

1. **PDF Storage**: In-memory storage is ephemeral - PDFs may not persist across deployments
2. **File Size Limits**: Vercel's 4.5MB limit for serverless functions (mitigated by Cloudinary uploads)
3. **PDF Text Extraction**: Some PDFs may not extract text properly (especially scanned/handwritten)
4. **PPTX Processing**: Basic support, may not extract all content
5. **Email Service**: Requires SMTP configuration (optional feature)

## Environment Variables

Required:
- `ANTHROPIC_API_KEY` - Claude API key

Optional:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - For email functionality
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` - For Cloudinary uploads
- `PDFSHIFT_API_KEY` - For PDF generation

## Development

- **Dev Server**: `npm run dev` (uses Turbopack)
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **TypeScript**: Full type safety throughout
- **Styling**: Tailwind CSS with custom theme, shadcn/ui components

## Deployment

- **Platform**: Vercel (recommended)
- **Type**: Serverless functions
- **Considerations**: 
  - Function timeout limits (10s hobby, 60s pro)
  - Memory limits
  - In-memory storage is ephemeral
  - Environment variables must be set in Vercel dashboard

---

This project is designed to be educational and help students create effective study materials. The exam grading feature is particularly useful for educators who need to grade handwritten exams efficiently.

