import { Fraunces } from "next/font/google"

// Display serif used only for study-guide titles and section headers.
// Scoped via a CSS variable applied on format/viewer wrappers — it does NOT
// change the global app font (DM Sans stays the body face).
export const displaySerif = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
})
