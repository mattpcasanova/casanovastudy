import type { Metadata } from "next"
import Link from "next/link"
import { LegalPage, type LegalSection } from "@/components/legal/legal-page"

export const metadata: Metadata = { title: "Terms of Service | Casanova Study" }

const EMAIL = <a href="mailto:privacy@casanovastudy.com" className="font-semibold text-blue-700">privacy@casanovastudy.com</a>

const sections: LegalSection[] = [
  {
    id: "agreement", title: "Agreeing to these terms",
    body: <p>These terms are an agreement between you and Casanova Study, operated by Matthew Casanova in Florida, USA (&quot;we&quot;, &quot;us&quot;). By creating an account or using casanovastudy.com, you agree to them and to our <Link href="/privacy" className="font-semibold text-blue-700 hover:underline">Privacy Policy</Link>. If you are under 18, a parent or guardian should review them with you.</p>,
  },
  {
    id: "who", title: "Who can use Casanova Study",
    body: <p>You can use Casanova Study if you are 13 or older; if you are under 13 and a parent or guardian has given permission; or if your school provides it to you for class. Teachers must be allowed by their school to use it with students.</p>,
  },
  {
    id: "account", title: "Your account",
    body: <p>Keep your password private and your details accurate. You are responsible for what happens in your account. Tell us at {EMAIL} if you think someone else is using it. You can delete your account at any time from the <Link href="/account" className="font-semibold text-blue-700 hover:underline">Account &amp; privacy</Link> page.</p>,
  },
  {
    id: "content", title: "Your content",
    body: <p>You keep ownership of what you upload and create (notes, photos, files, guides). You give us permission to store, process and display it only as needed to run Casanova Study for you, including sending it to our AI provider to generate guides and answers. Only upload material you have the right to use. If you share a guide by link, anyone with the link can view it.</p>,
  },
  {
    id: "rules", title: "Using Casanova Study responsibly",
    body: <>
      <p>Please do not:</p>
      <ul>
        <li>break the law, cheat on graded work where your teacher does not allow it, or help others do so;</li>
        <li>upload anything harmful, hateful, or that you do not have the right to share, or other people&apos;s private information without permission;</li>
        <li>try to break, overload, scrape or get around the limits or security of the service;</li>
        <li>share your account or resell access.</li>
      </ul>
      <p>We may remove content or suspend accounts that break these rules.</p>
    </>,
  },
  {
    id: "ai", title: "AI-generated content",
    body: <p>Study guides, explanations and grades are produced with AI and can contain mistakes. Use them as a study aid, check important facts, and follow your teacher&apos;s instructions. Teachers should review AI grades and feedback before relying on them; the teacher, not Casanova Study, is responsible for final grades.</p>,
  },
  {
    id: "plans", title: "Free and paid plans",
    body: <p>Casanova Study is currently free. Some features may have usage limits. If we offer paid plans, the price, what is included and how to cancel will be shown before you buy, and those details will form part of these terms.</p>,
  },
  {
    id: "ours", title: "Our service",
    body: <p>The Casanova Study name, website, design and software belong to us. We may change, add or remove features. We work to keep the service running but cannot promise it will always be available or free of errors.</p>,
  },
  {
    id: "ending", title: "Ending your use",
    body: <p>You can stop using Casanova Study and delete your account at any time. We may suspend or close accounts that break these terms or put others at risk, and we will try to tell you first where appropriate.</p>,
  },
  {
    id: "disclaimers", title: "Disclaimers and limits",
    body: <p>Casanova Study is provided &quot;as is&quot;. To the extent the law allows, we do not give warranties about results (for example, a particular grade or test score), and we are not liable for indirect or consequential losses. If we are found liable, our total liability is limited to the amount you paid us in the 12 months before the claim, or $50 if you have paid nothing. Some places do not allow these limits, so they may not apply to you.</p>,
  },
  {
    id: "law", title: "Governing law",
    body: <p>These terms are governed by the laws of the State of Florida, USA. Any dispute will be handled in the courts located in Florida, unless the law where you live gives you the right to bring it elsewhere.</p>,
  },
  {
    id: "changes", title: "Changes to these terms",
    body: <p>If we change these terms, we will update the date at the top and, for significant changes, tell you before they take effect. Continuing to use Casanova Study after that means you accept the new terms.</p>,
  },
  {
    id: "contact", title: "Contact us",
    body: <p>Questions about these terms: {EMAIL}.</p>,
  },
]

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      effective="October 4, 2026"
      intro={<p>The rules for using Casanova Study, written plainly.</p>}
      sections={sections}
      other={{ href: "/privacy", label: "Privacy Policy" }}
    />
  )
}
