import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    template: "%s · Lingua",
    default: "Lingua — AI Translation Engine",
  },
  description:
    "Agency-grade AI translation with cultural intelligence. From ad copy to technical whitepapers, in any language.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
