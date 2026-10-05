import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import { BookOpenCheck, Brain, ClipboardCheck, FileLock2, KeyRound, LineChart, Mail, ShieldCheck, Sparkles, Trash2, UserCheck, type LucideIcon } from "lucide-react"
import NavigationHeader from "@/components/navigation-header"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"

// /schools: the page to send a principal or district. What students and
// teachers get, and the student-data answers districts ask for before a DPA.
// Keep the data facts in step with /privacy.

export const metadata: Metadata = {
  title: "For schools | Casanova Study",
  description: "Study guides, practice and exam grading from your own class materials, with student data handled the way schools expect.",
}

const CONTACT = "mailto:hello@casanovastudy.com?subject=Casanova%20Study%20for%20our%20school"

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Sparkles, title: "Guides from class materials", body: "Students turn notes, slides, worksheets or phone photos into outlines, quizzes, flashcards, practice and study plans in about a minute, written at their grade level." },
  { icon: Brain, title: "Practice that sticks", body: "Learn mode spaces out review so students come back to each card right before they would forget it, and every quiz retries what they missed." },
  { icon: LineChart, title: "Weak spots, not just scores", body: "Each student sees which topics they are strong and weak in, and gets a one-tap quiz built from the exact questions they got wrong." },
  { icon: ClipboardCheck, title: "Grading for teachers", body: "Teachers photograph a class set of handwritten exams, add the mark scheme, and get a marked paper with feedback for each student, plus a class results table." },
]

const DATA: { icon: LucideIcon; title: string; body: ReactNode }[] = [
  { icon: ShieldCheck, title: "No ads, no selling", body: "We never show ads, sell or rent student information, or use it to build advertising profiles." },
  { icon: FileLock2, title: "AI that doesn't train on student work", body: "Guides, explanations and grading use Anthropic's business API. Under its commercial terms, content sent to it is not used to train models." },
  { icon: UserCheck, title: "FERPA and COPPA", body: "With schools we act under the school's direction, using student information only to provide the service. Students under 13 need a parent's approval, or the school's when it provides the app for classroom use." },
  { icon: KeyRound, title: "School sign-in", body: "Students can sign in with Clever, so there are no new passwords to manage." },
  { icon: Trash2, title: "Export and deletion", body: "Students can download or delete their own data at any time from their account. Schools can ask us to delete their students' data." },
  { icon: BookOpenCheck, title: "Data we collect, and who processes it", body: <>Name, email, birth date (students), what they study and how they answer, and work teachers upload for grading. It is processed by Supabase, Vercel, Anthropic, Cloudinary, Resend and PDFShift, only to run the service. The full list is in our <Link href="/privacy" className="font-semibold text-blue-700 hover:underline">Privacy Policy</Link>.</> },
]

export default function SchoolsPage() {
  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />

      <div className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 pb-24 pt-14 text-white sm:pt-20">
        <div className="pointer-events-none absolute -top-24 right-[12%] h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-100">For schools</p>
          <h1 className={cn(fontDisplay, "mt-3 text-4xl font-semibold tracking-tight sm:text-5xl")}>Every class&apos;s materials, turned into practice that works</h1>
          <p className="mx-auto mt-4 max-w-xl text-blue-50">Built by a high school teacher and used in real AP classes. Students study from what you actually taught, and teachers get hours of grading back.</p>
          <a href={CONTACT} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 shadow-lg shadow-blue-900/20 transition-colors hover:bg-blue-50"><Mail className="h-4 w-4" />Talk to us about your school</a>
        </div>
      </div>

      <main className="relative mx-auto -mt-12 max-w-5xl px-4 pb-20">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <section key={f.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-blue-900/5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100"><f.icon className="h-5 w-5" /></span>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">{f.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-16">
          <h2 className={cn(fontDisplay, "text-center text-3xl font-semibold text-slate-900 sm:text-4xl")}>Student data, handled the way schools expect</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">The answers your district will ask for before a data privacy agreement.</p>
          <div className="mt-8 grid gap-x-8 gap-y-6 rounded-3xl border border-slate-200 bg-white p-6 sm:grid-cols-2 sm:p-8">
            {DATA.map((d) => (
              <div key={d.title} className="flex gap-3">
                <d.icon className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-slate-900">{d.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{d.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className={cn(fontDisplay, "text-2xl font-semibold text-slate-900")}>Data privacy agreements</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Send us your district&apos;s agreement and we&apos;ll review it with you. We can also work from the Student Data Privacy Consortium&apos;s National Data Privacy Agreement, which many districts already use.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className={cn(fontDisplay, "text-2xl font-semibold text-slate-900")}>Pricing</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">School plans are priced per student per year and include Premium for every student and grading for every teacher. Tell us how many students and classes you have and we&apos;ll send a quote, or ask about starting with one class.</p>
          </div>
        </section>

        <section className="mt-16 rounded-3xl bg-gradient-to-br from-blue-700 to-cyan-600 p-8 text-center text-white sm:p-10">
          <h2 className={cn(fontDisplay, "text-3xl font-semibold")}>See it with your own materials</h2>
          <p className="mx-auto mt-2 max-w-lg text-blue-50">Make a guide from one of your own units in a minute, then talk to us about your school.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"><Sparkles className="h-4 w-4" />Make a study guide</Link>
            <a href={CONTACT} className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"><Mail className="h-4 w-4" />hello@casanovastudy.com</a>
          </div>
        </section>
      </main>
    </div>
  )
}
