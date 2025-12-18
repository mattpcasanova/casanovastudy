# Home Page Redesign Framework

## 1. Navigation Header Component
✅ **COMPLETED** - `components/navigation-header.tsx`

Features:
- Logo on the left
- Navigation tabs: Create Guide, My Guides, Grade Exam (teacher only)
- User menu with sign in/out functionality
- Sticky at top of page
- Gradient background matching brand colors

## 2. Authentication System
✅ **COMPLETED** - Components and Database

### Auth Components:
- `components/auth-modal.tsx` - Sign in/up modal with user type selection
- `lib/auth.tsx` - Auth context provider with Supabase integration

### Database Migrations:
- `003_create_user_profiles.sql` - User profiles with student/teacher type
- `004_add_user_id_to_tables.sql` - Add user_id to study_guides and grading_results

### User Types:
- **Student**: Create guides, save guides, view history
- **Teacher**: All student features + grade exams

## 3. Redesigned Home Page Layout

### Current Issues:
- White card box feels isolated
- Too much empty space
- Sections don't flow well

### New Design Direction:

#### A. Remove Heavy Containers
- No more large white card boxes
- Use subtle backgrounds and borders instead
- Let content breathe with whitespace

#### B. Visual Flow
```
┌─────────────────────────────────────────┐
│  Navigation Header (sticky)              │
├─────────────────────────────────────────┤
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Hero Section                       │ │
│  │  - Tagline                         │ │
│  │  - Key benefits with icons        │ │
│  │  - Decorative gradient pattern    │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  File Upload Section               │ │
│  │  - Drag & drop area               │ │
│  │  - File list                      │ │
│  │  - Visual separators              │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Configuration Section             │ │
│  │  - Required fields                │ │
│  │  - Format selection (visual cards)│ │
│  │  - Optional customization         │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Action Button                     │ │
│  │  - Large "Generate" button        │ │
│  │  - Clear visual prominence        │ │
│  └────────────────────────────────────┘ │
│                                          │
└─────────────────────────────────────────┘
```

#### C. Visual Elements to Add
1. **Gradient Accents**: Subtle gradient bars between sections
2. **Icon Illustrations**: More prominent icons for each section
3. **Animated Elements**: Subtle hover effects, transitions
4. **Background Patterns**: Light geometric patterns or dots
5. **Color Coding**: Different accent colors for sections

#### D. Specific Changes

**Hero Section:**
- Keep gradient background
- Make tagline more prominent
- Add animated feature pills
- Remove isolated card styling

**Upload Section:**
- Keep drag-and-drop functionality
- Add decorative left border accent
- Use subtle background instead of card
- Improve file list styling with better visual hierarchy

**Format Selection:**
- Make format cards more visual
- Add preview icons for each format
- Use hover states with scale transforms
- Show format descriptions better

**Configuration:**
- Group fields with visual separators
- Use accordion/collapsible for optional fields
- Better label styling with icons

## 4. My Guides Page
🔄 **TO BE CREATED** - `app/my-guides/page.tsx`

Features:
- Grid/list view of user's study guides
- Filter by format, subject, date
- Search functionality
- Quick actions (view, download PDF, share, delete)
- Empty state for new users

## 5. Integration Points

### API Updates Needed:
- Add `user_id` to study guide generation
- Add `user_id` to exam grading
- Create endpoint to fetch user's guides
- Handle anonymous users (user_id = null)

### App Layout:
- Wrap app in AuthProvider
- Add NavigationHeader to layout
- Handle auth state globally

## 6. Migration Instructions

Users need to run these SQL migrations in Supabase dashboard:
1. `003_create_user_profiles.sql`
2. `004_add_user_id_to_tables.sql`

Then update environment variables (if needed for auth).

## Design Principles

1. **Less is More**: Remove unnecessary containers
2. **Visual Hierarchy**: Clear sections with proper spacing
3. **Progressive Disclosure**: Show advanced options only when needed
4. **Consistency**: Match styling across all pages
5. **Responsive**: Mobile-first, works on all screen sizes
6. **Accessible**: Proper labels, contrast, keyboard navigation
