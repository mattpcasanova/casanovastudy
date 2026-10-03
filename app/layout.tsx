import type React from "react"
import type { Metadata, Viewport } from "next"
import { DM_Sans } from "next/font/google"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { AuthProvider } from "@/lib/auth"
import { PlanProvider } from "@/components/plan/plan-provider"
import { ServiceWorkerRegistrar } from "@/components/pwa/pwa"
import "./globals.css"

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
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
          </PlanProvider>
        </AuthProvider>
        <ServiceWorkerRegistrar />
        <Analytics />
      </body>
    </html>
  )
}
