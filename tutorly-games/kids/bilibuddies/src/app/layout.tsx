import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "BiliBuddies — Tutorly Kids (Ages 3–6)",
  description:
    "A tutor-controlled, screen-share-first language game for toddlers and preschoolers. Letters, numbers, first words, chants, CCQ talk time, drag & drop matching and natural kids voices in English, Chinese, French, Italian, German and Turkish.",
  applicationName: "BiliBuddies",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%A6%8A%3C/text%3E%3C/svg%3E" />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
