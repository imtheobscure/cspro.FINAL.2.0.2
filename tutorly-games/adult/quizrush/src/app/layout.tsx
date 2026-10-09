import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuizRush — High-Energy Learning Arena",
  description:
    "Host live quiz games with a real in-game economy, power-ups, animated leaderboards, and instant flashcard review.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
