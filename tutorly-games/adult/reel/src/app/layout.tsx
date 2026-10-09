import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppNav } from "@/components/nav";
import { Providers } from "./providers";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "LinguaTV — Learn languages from real video",
  description: "Premium streaming meets an AI-powered, video-synced language lesson engine: interactive transcripts, word-level subtitles, gamified activities and watch parties.",
};

export const viewport: Viewport = { themeColor: "#08080c", width: "device-width", initialScale: 1, viewportFit: "cover" };

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { user, profile, isGuest } = await getCurrentUser();
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#08080c] text-zinc-100 antialiased">
        <Providers>
          <AppNav user={{ name: user.name, color: user.avatarColor, level: profile.level, xp: profile.xp, cefr: profile.cefrLevel, isGuest }} />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
