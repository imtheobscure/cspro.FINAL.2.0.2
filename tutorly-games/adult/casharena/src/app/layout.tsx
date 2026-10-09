import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { GAME } from "@/lib/branding";
import "./globals.css";

// The name comes from `src/lib/branding.ts` so the page title, the nav wordmark,
// the splash and the Game Hub tile can never drift apart.
export const metadata: Metadata = {
  title: `${GAME.fullName} — live multiplayer quiz arena`,
  description: GAME.blurb,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#070a17",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-arena antialiased">{children}</body>
    </html>
  );
}
