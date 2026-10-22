import localFont from "next/font/local"

// Display serif used only for study-guide titles and section headers.
// Scoped via a CSS variable applied on format/viewer wrappers — it does NOT
// change the global app font (DM Sans stays the body face).
// Self-hosted (app/fonts, variable weight axis, latin) since 2026-10-21: with
// next/font/google every build downloaded it, and a Google Fonts response in a
// new URL format broke a production build.
export const displaySerif = localFont({
  src: "../../app/fonts/fraunces-latin-wght-normal.woff2",
  variable: "--font-display",
  display: "swap",
  weight: "100 900",
})
