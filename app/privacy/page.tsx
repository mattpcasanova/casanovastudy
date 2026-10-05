import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage, type LegalSection } from "@/components/legal/legal-page"

export const metadata: Metadata = { title: "Privacy Policy | Casanova Study" }

const EMAIL = <a href="mailto:privacy@casanovastudy.com" className="font-semibold text-blue-700">privacy@casanovastudy.com</a>

const sections: LegalSection[] = [
  {
    id: "who", title: "Who we are",
    body: <p>Casanova Study (&quot;we&quot;, &quot;us&quot;) is a study website at casanovastudy.com, operated by Matthew Casanova in Florida, USA. It turns topics, class notes and photos into study guides, quizzes and practice, explains answers with an AI tutor, and helps teachers grade exams. You can reach us at {EMAIL}.</p>,
  },
  {
    id: "collect", title: "What we collect",
    body: <>
      <ul>
        <li><strong>Account details:</strong> your name, email address, password (stored encrypted by our sign-in provider), whether you are a student or teacher, and your birth date (required for students so we know who needs a parent&apos;s permission).</li>
        <li><strong>School sign-in:</strong> if you sign in through your school (Colegia, which uses Clever), we receive your name, email and a school account ID from Clever.</li>
        <li><strong>What you study:</strong> topics and notes you type, files and photos you upload, and the study guides, quizzes and practice made from them.</li>
        <li><strong>How you answer:</strong> your answers in quizzes, practice and Learn mode. We use them to show your progress and weak spots and to focus new practice on what you find hard.</li>
        <li><strong>Questions to the AI tutor:</strong> what you ask the Explain helper, so it can answer.</li>
        <li><strong>Teachers&apos; grading:</strong> exams, mark schemes and student names that teachers upload, and the grades and feedback produced.</li>
        <li><strong>Usage and device information:</strong> how many guides and explanations you use (to run fair-use limits), basic technical logs, and privacy-friendly page analytics from our host that do not use advertising cookies.</li>
      </ul>
      <p>We use cookies and similar browser storage only to keep you signed in and to remember settings on your device (for example, your last calculator). We do not use advertising or cross-site tracking cookies.</p>
    </>,
  },
  {
    id: "use", title: "How we use it",
    body: <>
      <ul>
        <li>To run the service: create your guides, show your progress, answer your questions, grade exams, and send emails you asked for (like a shared guide or a parent permission request).</li>
        <li>To send study reminders: at most one email a day when cards are due for review or a topic needs practice, based on your own progress. Every reminder has a link to turn them off, and you can switch them off any time on your Account page.</li>
        <li>To personalize your studying: for example, a new guide may spend more time on topics you have recently found hard.</li>
        <li>To keep the service safe and fair: preventing abuse, enforcing usage limits, and fixing problems.</li>
        <li>To improve Casanova Study, using totals and trends rather than individual profiles where possible.</li>
      </ul>
      <p><strong>We never</strong> show ads, sell or rent personal information, or use student information to build advertising profiles.</p>
    </>,
  },
  {
    id: "ai", title: "How the AI works with your information",
    body: <p>To write guides, answer questions and grade exams, we send the relevant content (for example, your topic, uploaded notes or a student&apos;s exam pages) to our AI provider, Anthropic, through its business API. Under its commercial terms, Anthropic does not use this content to train its models. AI answers can be wrong, so please check important facts, and teachers should review grades before relying on them.</p>,
  },
  {
    id: "providers", title: "Services that process data for us",
    body: <>
      <p>We use these providers only to run Casanova Study. They may use the information only to provide their service to us:</p>
      <ul>
        <li><strong>Supabase:</strong> database and sign-in</li>
        <li><strong>Vercel:</strong> website hosting and privacy-friendly analytics</li>
        <li><strong>Anthropic:</strong> the AI that writes guides, explains answers and grades</li>
        <li><strong>Cloudinary:</strong> storage for uploaded files and photos</li>
        <li><strong>Resend:</strong> sending email</li>
        <li><strong>PDFShift:</strong> turning a guide into a PDF when you ask</li>
        <li><strong>Clever:</strong> school sign-in, if your school uses it</li>
        <li><strong>Desmos and PubChem:</strong> the calculator and molecule pictures load from them in your browser; we do not send them your personal information</li>
      </ul>
    </>,
  },
  {
    id: "children", title: "Children under 13",
    body: <>
      <p>We follow the Children&apos;s Online Privacy Protection Act (COPPA). A student under 13 cannot use Casanova Study until a parent or guardian approves. When a student under 13 signs up, we collect only their name, email, birth date and password, plus their parent&apos;s email address, and use them only to ask the parent for permission. We email the parent a notice and a link to approve or decline. If they decline, we delete the account and its data. The account stays locked until a parent approves.</p>
      <p>When a school or teacher provides Casanova Study for classroom use (for example, through school sign-in), the school may give consent on parents&apos; behalf for that educational use, and the information is used only for that purpose.</p>
      <p>Parents can review their child&apos;s information, ask us to change or delete it, or withdraw permission at any time by emailing {EMAIL}. We do not ask a child for more information than they need to use the service.</p>
    </>,
  },
  {
    id: "schools", title: "Schools and teachers",
    body: <p>When a school or teacher uses Casanova Study with students, student information is used only to provide the service to that school, under its direction, consistent with the Family Educational Rights and Privacy Act (FERPA). Teachers who upload students&apos; work confirm they are allowed to do so for classroom purposes. Schools can contact us at {EMAIL} about data agreements.</p>,
  },
  {
    id: "sharing", title: "When information is shared",
    body: <ul>
      <li><strong>Shared guides:</strong> a study guide can be opened by anyone who has its link. Do not put private information in a guide you share.</li>
      <li><strong>Your teacher:</strong> if a teacher grades your work, they see your grade and feedback.</li>
      <li><strong>Legal reasons:</strong> if the law requires it, or to protect someone&apos;s safety.</li>
      <li><strong>If Casanova Study changes hands:</strong> if the business is transferred, your information would go with it under the same protections, and we would tell you first.</li>
    </ul>,
  },
  {
    id: "retention", title: "How long we keep it",
    body: <p>We keep your information while your account is open. When you delete your account, we delete your profile, study guides, answers, progress and gradings you made. Copies in routine backups expire on their normal schedule. Uploaded files are stored with our file host; email {EMAIL} if you want specific files removed sooner.</p>,
  },
  {
    id: "security", title: "Security",
    body: <p>Information is encrypted in transit, access to the database is restricted, and passwords are stored only in encrypted form by our sign-in provider. No system is perfectly secure; if we learn of a breach that affects you, we will tell you as the law requires.</p>,
  },
  {
    id: "rights", title: "Your choices and rights",
    body: <ul>
      <li><strong>See and download</strong> your data from your <Link href="/account" className="font-semibold text-blue-700 hover:underline">Account &amp; privacy</Link> page.</li>
      <li><strong>Delete</strong> your account and its data from the same page.</li>
      <li><strong>Correct</strong> your information, or ask any other question, by emailing {EMAIL}. We respond within 30 days.</li>
    </ul>,
  },
  {
    id: "changes", title: "Changes to this policy",
    body: <p>If we change this policy, we will update the date at the top. If a change affects how we use information we already have, we will tell you first, and for children under 13 we will ask parents again where the law requires it.</p>,
  },
  {
    id: "contact", title: "Contact us",
    body: <p>Email {EMAIL} with any privacy question or request.</p>,
  },
]

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      effective="October 4, 2026"
      intro={<p>This policy explains what Casanova Study collects, why, who helps us process it, and the choices you have. We wrote it to be read, including by students and parents.</p>}
      sections={sections}
      other={{ href: "/terms", label: "Terms of Service" }}
    />
  )
}
