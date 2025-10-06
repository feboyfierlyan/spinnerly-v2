import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import Navbar from "@/components/navbar"
import PageTransition from "@/components/page-transition"
import "./globals.css"

export const metadata: Metadata = {
  title: "Spinnerly - Fair Spinner Wheel",
  description: "Sistem pembagian tugas yang adil dan transparan",
  generator: "v0.app",
  icons: { icon: "/favicon.ico", shortcut: "/favicon.ico" },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>
          <Navbar />
          <PageTransition>{children}</PageTransition>
          <Analytics />
        </Suspense>
      </body>
    </html>
  )
}
