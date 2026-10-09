import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ContentProvider } from "@/lib/content-provider";
import { PwaBoot } from "@/components/PwaBoot";

/**
 * Same single source of truth as the rest of the app: the exported base path from
 * next.config. Hard-coding "/lingo/..." here once already shipped a build
 * whose manifest and icons 404'd, so the metadata follows the base path too.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Lingo — Learn a language with your own course",
  description:
    "Lingo is a gamified language course: lessons, XP, streaks, leagues and leaderboards, all driven by one AI-generated content file.",
  applicationName: "Lingo",
  manifest: `${BASE_PATH}/manifest.webmanifest`,
  appleWebApp: { capable: true, title: "Lingo", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: `${BASE_PATH}/icon-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${BASE_PATH}/icon-512.png`, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: `${BASE_PATH}/apple-touch-icon.png`, sizes: "180x180" }],
  },
};

/** Explicit mobile viewport: `viewportFit: cover` is what makes the safe-area insets work on iOS. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#58CC02",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen antialiased">
        {/* Registers the offline worker and shows the offline ribbon. */}
        <PwaBoot />
        <ContentProvider>
          <StoreProvider>{children}</StoreProvider>
        </ContentProvider>
      </body>
    </html>
  );
}
