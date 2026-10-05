import type { Metadata } from "next"
import { notFound } from "next/navigation"
import PricingPage from "@/components/plan/pricing-page"
import { PLANS_ENABLED } from "@/lib/features"

export const metadata: Metadata = {
  title: "Plans and pricing | Casanova Study",
  description: "Study free, or go Premium for every format, harder questions and a tutor that knows your weak spots.",
}

export default function Page() {
  // Built dark with the rest of Premium: visible in local dev only until launch.
  if (!PLANS_ENABLED && process.env.NODE_ENV === "production") notFound()
  return <PricingPage />
}
