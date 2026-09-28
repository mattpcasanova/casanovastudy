import { redirect } from "next/navigation"

// The dashboard was retired — the study guide generator is the homepage.
export default function DashboardRedirect() {
  redirect("/")
}
