import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Playground } from "@/components/ui/Playground";
import "./globals.css";

export const metadata: Metadata = {
  title: "PlaySchool — Tutorly Kids (Ages 3–6)",
  description:
    "PlaySchool is a sunny playground of lessons for ages 3–6: letters and phonics, numbers and counting, first words, chants, sorting and read-aloud in English, Chinese, French, Italian, German and Turkish.",
  applicationName: "PlaySchool",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fdf7ee",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@600;700;800;900&family=Noto+Sans+SC:wght@500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-cream text-ink antialiased">
        {/* Sunny playground behind everything; the screens sit on top. */}
        <Playground />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
