import type React from "react"
import { ReturnToResume } from '@/components/return-to-resume'
import { ErrorReporter } from '@/components/monitoring/error-reporter'
import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { AuthProvider } from "@/lib/auth"
import { PlanProvider } from "@/components/plan/plan-provider"
import { ServiceWorkerRegistrar } from "@/components/pwa/pwa"
import "./globals.css"

// Self-hosted (see lib/formats/fonts.ts): builds no longer download fonts from Google.
const dmSans = localFont({
  src: "./fonts/dm-sans-latin-wght-normal.woff2",
  variable: "--font-dm-sans",
  display: "swap",
  weight: "100 1000",
})

export const metadata: Metadata = {
  title: "CasanovaStudy - Study Guide Generator",
  description: "Transform your course materials into personalized study guides",
  generator: "v0.app",
  icons: {
    icon: "/images/casanova-study-icon.png",
    shortcut: "/images/casanova-study-icon.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Casanova Study",
    statusBarStyle: "default",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1e40af",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${dmSans.variable} ${GeistMono.variable}`}>
        <AuthProvider>
          <PlanProvider>
            <Suspense fallback={null}>{children}</Suspense>
            <ReturnToResume />
            <ErrorReporter />
          </PlanProvider>
        </AuthProvider>
        <ServiceWorkerRegistrar />
        <Analytics />
      </body>
    </html>
  )
}
