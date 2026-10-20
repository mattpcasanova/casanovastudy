# Google OAuth verification: what to submit

Prepared 2026-10-20. Submit **after** the LLC is on /privacy and /terms (Google
reviews the privacy policy, and a later change to the operator can mean a
second review). Until then the app works unverified for up to 100 connecting
teacher accounts, with the "Google hasn't verified this app" screen.

Where: Google Cloud console → project of the OAuth client (number 277710709926)
→ **Google Auth Platform**: Branding, Audience, Data Access, then **Verification Center** → Submit.

## 1. Before submitting (checklist)

- [ ] LLC name and mailing address on `/privacy` and `/terms` (Claude updates both once you have the exact name and address).
- [ ] `casanovastudy.com` is an **authorized domain** (Branding page) and **verified in Google Search Console** by the same Google account that owns the Cloud project (Search Console → Add property → Domain → DNS TXT record at your registrar).
- [ ] Branding page:
  - App name: **Casanova Study** (must match the site exactly)
  - User support email: hello@casanovastudy.com (or privacy@ once forwarding works)
  - App logo: `public/icons/icon-512.png` resized to 120×120 PNG. Adding a logo makes Google verify the brand too; it's worth it (the logo shows on the consent screen).
  - App home page: `https://www.casanovastudy.com/schools` (public, describes the app, links the privacy policy; `/` redirects signed-out visitors to sign-in, which reviewers reject)
  - Privacy policy: `https://www.casanovastudy.com/privacy`
  - Terms of service: `https://www.casanovastudy.com/terms`
  - Developer contact email: your address
- [ ] Data Access page lists exactly the five scopes below and nothing else.
- [ ] Demo video uploaded to YouTube as **Unlisted** (section 3).
- [ ] A test account ready in case the reviewer asks: a teacher login on the site plus a Google account with one Classroom class, a few test students and one assignment with an uploaded photo. Don't use real students.

## 2. Scope justifications

Paste one per scope ("How will the scopes be used?"). Each is under 1,000 characters.

**`.../auth/classroom.courses.readonly`** (sensitive)
> Casanova Study grades handwritten student work for teachers. When a teacher connects Google Classroom, we list the teacher's own courses so they can pick which class to import as a class list, or which course holds the assignment they want graded. We also read the course name and section to match a Classroom course to the class the teacher already made on our site (for example "AP Statistics, Period 1"). We only read courses the signed-in teacher teaches. Nothing is changed, and the course list is not stored.

**`.../auth/classroom.rosters.readonly`** (sensitive)
> Teachers import their Classroom roster into Casanova Study so each graded paper is matched to the right student's name, and so students with no paper are listed as missing. We read the student names in the course the teacher picks and save them to that teacher's class list on our site, which only that teacher can see. We never message students or change the roster.

**`.../auth/classroom.profile.emails`** (sensitive)
> We read students' school email addresses from the roster the teacher imports for two things: (1) to match a submission in a Classroom assignment to the right name on the teacher's class list, and (2) to link a student's Casanova Study account (if they have one, signed in with the same school email) so they can see the graded report once the teacher releases it. Emails are stored only on the teacher's class list and are not shared or used for anything else.

**`.../auth/classroom.coursework.students`** (sensitive)
> Three features, each started by the teacher clicking a button: (1) Grading uploads: for an assignment the teacher picks, we read who turned it in and the ids of the files attached to each submission, so the teacher can open those files and have them graded. (2) Sending scores back: the teacher clicks "Send to Google Classroom" and we create one assignment in their course and set each student's draft and assigned grade, matched by email. (3) Assigned practice: when a teacher assigns a practice quiz to some students, we create a Classroom assignment with the link for just those students and, when the teacher clicks to send scores, set their grades. We only change coursework our app created, and we never return or delete work.

**`.../auth/drive.file`** (non-sensitive; recommended by Google instead of drive.readonly)
> Students upload photos or PDFs of their work to a Classroom assignment. To grade them, the teacher opens Google's file picker, which shows only the files attached to that assignment, and selects them. With drive.file we can open only the files the teacher picked, which are downloaded in the teacher's browser for grading. We never see the rest of the teacher's Drive and keep no access afterwards.

**Why not narrower scopes?** (if asked)
> We use drive.file with the Google Picker instead of drive.readonly so we only reach the files the teacher selects. Classroom access is requested only when the teacher clicks "Connect Google Classroom", tokens are kept for at most one hour for the current task and then deleted, and we store no refresh tokens.

**Data use statement** (already on /privacy, under "How we use it"):
> Information received from Google APIs is used only to provide the features the teacher asked for, follows the Google API Services User Data Policy including its Limited Use requirements, is never used for advertising, and is never used to train AI models.

Note for the "AI" question on the form: student work is sent to Anthropic's Claude API to be graded. Under Anthropic's commercial terms it isn't used to train their models; /privacy lists Anthropic as a processor. Say this plainly if the form asks whether Google user data is sent to an AI service.

## 3. Demo video script (about 4 minutes)

Record the browser full screen at 1080p, English narration or captions. Use the test account, never real students. Upload to YouTube as Unlisted and paste the link.

1. **The app and its policy (20 s).** Open `https://www.casanovastudy.com/schools`. Scroll briefly. Click the Privacy link; show the Google Classroom bullet under "What we collect" and the Limited Use paragraph under "How we use it".
2. **Sign in (15 s).** Sign in as the test teacher.
3. **Consent screen, with the client id visible (40 s).** Go to My Classes → "Import from Google Classroom". On Google's account chooser and consent screen, **click the address bar and zoom in so the `client_id=277710709926-...` part of the URL is readable** (reviewers require this). Show the app name "Casanova Study" and each permission listed, then Allow.
4. **courses + rosters + emails (45 s).** Pick the test course; show the imported class list with names and emails on the class page. Say: "course list and roster are read once to make this class list."
5. **coursework.students + drive.file, grading uploads (60 s).** Go to Grade a class → From Google Classroom → pick the course and the assignment. Show the list of who turned work in. Click "Get the files": Google's file picker opens showing only that assignment's files; select them. Show them appear as one paper per student, then grade and open a report. Say: "the picker gives us only the files the teacher selects (drive.file)."
6. **coursework.students, sending scores back (40 s).** On the class results page click "Send to gradebook" → Google Classroom → Send. Switch to Google Classroom and show the new assignment with draft grades.
7. **coursework.students, assigned practice (30 s).** Open a practice quiz → Assign to students → pick two students → done screen → "Post to Google Classroom". Show the assignment in Classroom assigned to only those two students.
8. **Revoking (10 s).** Mention tokens last one hour; show `myaccount.google.com/permissions` where the teacher can remove access.

## 4. After submitting

- Google emails the developer contact with questions; answer in the same thread. Common asks: the video doesn't show the client id, a scope isn't shown in use, or the homepage doesn't link the privacy policy.
- Review of sensitive scopes usually takes a few weeks. The app keeps working for up to 100 teacher accounts meanwhile.
- A school's Google Workspace admin can also mark the app as trusted (Admin console → Security → API controls → App access control → add by client id), which removes the warning for that school right away. Useful for the pilot school.
