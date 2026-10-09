import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tutorly Console | Play Any Unity Game, Playables & CrazyGames",
  description:
    "Open any Unity game locally or by URL, play 1,649 indexed YouTube Playables or 4,426 CrazyGames games, keep your high scores, and play inside hyper-realistic gaming rigs.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#070913] text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
