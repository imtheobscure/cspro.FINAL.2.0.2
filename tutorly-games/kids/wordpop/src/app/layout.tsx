import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

/** The build is exported under `/tutorly-games/kids/wordpop`, so the icon needs that prefix. */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "WordPop — Tutorly Kids",
  description:
    "Tutorly Kids – WordPop: bilingual first-words games for ages 3–6. Topics, chants, quizzes, matching and listening in English, Chinese, French, Italian, German and Turkish, read aloud with the free Microsoft natural voices.",
  icons: { icon: `${BASE}/icon.svg` },
};

export const viewport: Viewport = {
  themeColor: "#fff8ee",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@500;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
