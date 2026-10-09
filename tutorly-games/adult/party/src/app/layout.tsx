import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Party — the classroom game show",
  description:
    "Seventeen game environments built from one lesson: grid arena, poker, bomb defusal, mafia, debate stage and more. Designed to make language learners talk.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-100 antialiased selection:bg-amber-400/30">{children}</body>
    </html>
  );
}
