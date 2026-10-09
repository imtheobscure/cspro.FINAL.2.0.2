import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fredoka, Nunito } from "next/font/google";
import { SceneImageGuard } from "@/components/SceneImageGuard";
import "./globals.css";

const display = Fredoka({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const body = Nunito({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "TalkQuest — speaking missions for ages 5–12",
  description:
    "TalkQuest turns any topic into a bilingual speaking lesson: illustrated words, sentences, chants, quizzes, a story and a timed tutor plan, plus ten speaking games and read-aloud in seven languages.",
  applicationName: "TalkQuest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fff7ed",
};

/**
 * Text size is applied to <html> BEFORE the first paint.
 *
 * The header's Large / Extra large / Huge control writes
 * `talkquest.textSize.v1`; reading it here means a tutor who chose Huge never
 * sees the app flash at the default size and then jump — the same anti-flash
 * trick a dark-mode toggle needs. If storage is blocked the default from
 * globals.css (`xlarge`) simply stands.
 *
 * `suppressHydrationWarning` on <html> goes with it: the script writes the
 * attribute before React hydrates, so a tutor whose stored choice is not the
 * default would otherwise make React report a mismatch on <html> and throw the
 * whole tree away. It is the documented escape hatch for a pre-paint size or
 * theme bootstrap.
 */
const TEXT_SIZE_BOOT = `try{var s=localStorage.getItem('talkquest.textSize.v1');if(s==='large'||s==='xlarge'||s==='huge')document.documentElement.dataset.textsize=s;}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-textsize="xlarge"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEXT_SIZE_BOOT }} />
      </head>
      <body className="antialiased" style={{ fontFamily: "var(--font-body), Nunito, ui-rounded, sans-serif" }}>
        {/* Mounted once, for the whole app: every game backdrop falls back to the
            generated scene when its hand-made artwork file is missing. */}
        <SceneImageGuard />
        {children}
      </body>
    </html>
  );
}
