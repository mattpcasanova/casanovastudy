import { redirect } from "next/navigation"

// The generator lives on the homepage again; keep old links working.
export default function CreateStudyGuideRedirect() {
  redirect("/")
}
