"use client";

import React, { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import confetti from "canvas-confetti";
import { useStore } from "@/lib/store";
import { useContent } from "@/lib/content-provider";
import { isPackEmpty, packCounts } from "@/content/tutolingo";
import { LANGUAGES, findLanguage, isAutoL1, languageName } from "@/content/languages";
import { PackDropZone } from "./PackDropZone";
import { PwaInstallCard, PwaInstallSheet, usePwaState } from "./PwaBoot";

export const APP_NAME = "Lingo";

/* ---------- Mascot (Tuto the owl) ---------- */
export function Mascot({ size = 120, mood = "happy", message }: { size?: number; mood?: "happy" | "excited" | "sad" | "thinking"; message?: string }) {
  const eyeY = mood === "sad" ? 2 : 0;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="animate-float" style={{ width: size, height: size }}>
        <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="Tuto the owl">
          <ellipse cx="60" cy="68" rx="38" ry="42" fill="#58CC02" />
          <ellipse cx="60" cy="78" rx="24" ry="28" fill="#89E219" />
          <ellipse cx="24" cy="72" rx="10" ry="22" fill="#46A302" className="animate-wiggle" style={{ transformOrigin: "24px 60px" }} />
          <ellipse cx="96" cy="72" rx="10" ry="22" fill="#46A302" className="animate-wiggle" style={{ transformOrigin: "96px 60px" }} />
          <path d="M35 32 L30 14 L48 26 Z" fill="#58CC02" />
          <path d="M85 32 L90 14 L72 26 Z" fill="#58CC02" />
          <g className="mascot-eyes">
            <ellipse cx="46" cy={52 + eyeY} rx="13" ry="15" fill="#fff" />
            <ellipse cx="74" cy={52 + eyeY} rx="13" ry="15" fill="#fff" />
            <circle cx="47" cy={55 + eyeY} r="5.5" fill="#1F2937" />
            <circle cx="73" cy={55 + eyeY} r="5.5" fill="#1F2937" />
            <circle cx="49" cy={53 + eyeY} r="1.8" fill="#fff" />
            <circle cx="75" cy={53 + eyeY} r="1.8" fill="#fff" />
          </g>
          <path d="M53 68 L67 68 L60 78 Z" fill={mood === "sad" ? "#B45309" : "#FF9600"} stroke="#E68900" strokeWidth="1.5" strokeLinejoin="round" />
          {mood === "excited" && <ellipse cx="60" cy="86" rx="8" ry="6" fill="#7C2D12" />}
          <ellipse cx="46" cy="110" rx="9" ry="5" fill="#FF9600" />
          <ellipse cx="74" cy="110" rx="9" ry="5" fill="#FF9600" />
          {mood !== "sad" && (
            <>
              <ellipse cx="32" cy="66" rx="5" ry="3.5" fill="#FF9F1C" opacity="0.55" />
              <ellipse cx="88" cy="66" rx="5" ry="3.5" fill="#FF9F1C" opacity="0.55" />
            </>
          )}
        </svg>
      </div>
      {message && (
        <div className="animate-pop-in max-w-[240px] rounded-2xl border-2 border-slate-200 bg-white px-4 py-2 text-center text-sm font-bold text-slate-700 shadow-sm">
          {message}
        </div>
      )}
    </div>
  );
}

/* ---------- Top bar ---------- */
export function TopBar() {
  const { state } = useStore();
  return (
    <header className="sticky top-0 z-40 border-b-2 border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#58CC02] text-lg shadow-[0_3px_0_#46A302]">🦉</span>
          <span className="hidden text-lg font-black text-[#58CC02] sm:block">{APP_NAME}</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1.5 text-sm font-black text-orange-500" title="Daily streak">
            <span className="text-lg">🔥</span>
            <span>{state.streak}</span>
            {state.streakFreeze > 0 && <span className="text-xs text-blue-500">❄️{state.streakFreeze}</span>}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1.5 text-sm font-black text-red-500" title="Hearts">
            <span className="text-lg">❤️</span>
            <span>{state.hearts}</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1.5 text-sm font-black text-blue-500" title="Gems">
            <span className="text-lg">💎</span>
            <span>{state.gems}</span>
          </div>
          <div className="hidden items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-1.5 text-sm font-black text-yellow-600 sm:flex" title="Total XP">
            <span className="text-lg">⚡</span>
            <span>{state.xp}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ---------- Navigation ---------- */
/** `short` is used in the mobile bar, where the columns have to fit. */
const NAV = [
  { href: "/", label: "Home", short: "Home", icon: "🏠" },
  { href: "/references", label: "References", short: "Refs", icon: "📖" },
  { href: "/mistakes", label: "Notebook", short: "Notebook", icon: "📓" },
  { href: "/leaderboard", label: "League", short: "League", icon: "🏆" },
  { href: "/profile", label: "Profile", short: "Profile", icon: "👤" },
  { href: "/prompt", label: "AI Prompt", short: "Prompt", icon: "🤖" },
  { href: "/check", label: "Checker", short: "Check", icon: "🔍" },
];

/**
 * The phone bar.
 *
 * It used to carry every destination, which squeezed the labels thin. The AI Prompt
 * and Checker are authoring tools — used once, on a computer, to build and validate a
 * content file — so the phone keeps the five pages a learner opens every day, and the
 * last slot is the install action (which opens the install sheet).
 */
const MOBILE_HREFS = ["/", "/references", "/mistakes", "/leaderboard", "/profile"];
const MOBILE_NAV = MOBILE_HREFS.map((href) => NAV.find((n) => n.href === href)!);

export function SideNav() {
  const path = usePathname();
  const { installed } = usePwaState();
  const [installOpen, setInstallOpen] = useState(false);
  /** One column per destination, plus the install action while it is still relevant. */
  const columns = MOBILE_NAV.length + (installed ? 0 : 1);
  return (
    <>
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 flex-col gap-1 overflow-y-auto border-r-2 border-slate-200 bg-white p-4 pt-5 lg:flex">
        <div className="mb-3 flex items-center gap-2 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#58CC02] text-xl shadow-[0_3px_0_#46A302]">🦉</span>
          <span className="text-xl font-black text-[#58CC02]">{APP_NAME}</span>
        </div>
        {NAV.map((n) => {
          const active = path === n.href || (n.href !== "/" && path.startsWith(n.href));
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-2.5 text-sm font-black transition ${
                active ? "border-[#D7FFB8] bg-[#E9FBD1] text-[#4b9417]" : "border-transparent text-slate-500 hover:bg-slate-100"
              }`}
            >
              <span className="text-xl">{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
        {/* Install the app in one tap — the browser shows its own install window. */}
        <div className="mt-auto pt-2">
          <PwaInstallCard />
        </div>

        <div className="mb-2 rounded-2xl bg-gradient-to-br from-[#1CB0F6] to-[#8b5cf6] p-4 text-white">
          <p className="text-sm font-black">Daily practice 🎯</p>
          <p className="mt-1 text-xs opacity-90">Review your mistakes and hard words with spaced repetition.</p>
          <Link href="/practice" className="btn-3d mt-3 block rounded-xl border-white/40 bg-white/20 py-2 text-center text-sm font-black">
            Start practice
          </Link>
        </div>
      </aside>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div
          className="mx-auto grid max-w-lg gap-0.5 px-1 py-1.5"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {MOBILE_NAV.map((n) => {
            const active = path === n.href || (n.href !== "/" && path.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-0.5 py-1.5 text-[10px] font-black ${active ? "bg-[#E9FBD1] text-[#4b9417]" : "text-slate-400"}`}
              >
                <span className="text-lg leading-none">{n.icon}</span>
                {n.short}
              </Link>
            );
          })}
          {!installed && (
            <button
              onClick={() => setInstallOpen(true)}
              className="flex flex-col items-center gap-0.5 rounded-xl px-0.5 py-1.5 text-[10px] font-black text-[#1899D6]"
              aria-label="Install the Lingo app"
            >
              <span className="text-lg leading-none">📲</span>
              Get app
            </button>
          )}
        </div>
      </nav>
      <PwaInstallSheet open={installOpen} onClose={() => setInstallOpen(false)} />
    </>
  );
}

export function PageShell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen pb-[calc(6.5rem+var(--safe-bottom))] lg:pb-10 lg:pl-60">
      <div className="lg:hidden">
        <TopBar />
      </div>
      <SideNav />
      <div className="sticky top-0 z-20 hidden lg:block">
        <TopBar />
      </div>
      <main className={`mx-auto px-4 pt-4 sm:px-6 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>{children}</main>
    </div>
  );
}

/* ---------- Content states ---------- */
export function ContentStatus() {
  const { loading, error } = useContent();
  if (loading) {
    return (
      <div className="mb-4 rounded-3xl border-2 border-slate-200 bg-white p-4 text-center text-sm font-bold text-slate-400">
        Loading content pack…
      </div>
    );
  }
  if (error) {
    return (
      <div className="mb-4 rounded-3xl border-2 border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
        Could not read <code className="font-mono">content/tutolingo-content.json</code> ({error}). Add the file next to the app, then reload.
      </div>
    );
  }
  return null;
}

/** Shown whenever the pack has no items yet — and where a pack is loaded from. */
export function EmptyPackNotice({ feature }: { feature: string }) {
  const { pack, error } = useContent();
  if (!isPackEmpty(pack)) return null;
  return (
    <div className="card-light rounded-3xl border-2 border-dashed border-[#1CB0F6] bg-[#F2FAFF] p-6 text-center">
      <h2 className="text-lg font-black text-slate-800">No {feature} content loaded yet</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        {APP_NAME} reads everything from one JSON file. Drag that file below (or tap to choose it) and this page fills up
        automatically — nothing to install, nothing to upload.
      </p>
      <PackDropZone
        className="mx-auto mt-4 max-w-xl text-left"
        title={"Drag & drop your Lingo JSON file here"}
        hint="or tap to pick tutolingo-content.json from your device"
      />
      {error && (
        <p className="mx-auto mt-2 max-w-xl rounded-2xl bg-amber-50 px-3 py-2 text-left text-xs font-bold text-amber-700">
          The file the app is published with could not be read ({error}) — load a pack above to start anyway.
        </p>
      )}
      <p className="mt-3 text-xs text-slate-400">
        No file yet? Build one from your own PDF with the{" "}
        <Link href="/prompt" className="font-black text-[#1CB0F6]">
          AI content prompt 🤖
        </Link>{" "}
        or validate one you already have in the{" "}
        <Link href="/check" className="font-black text-[#1CB0F6]">
          Checker 🔍
        </Link>
        .
      </p>
    </div>
  );
}

export function PackSummary() {
  const { pack } = useContent();
  const c = packCounts(pack);
  const rows = [
    { label: "Vocabulary", value: c.vocabulary, icon: "📚" },
    { label: "Grammar points", value: c.grammar, icon: "📝" },
    { label: "Grammar exercises", value: c.grammarExercises, icon: "✍️" },
    { label: "Idioms & expressions", value: c.idioms, icon: "🎭" },
    { label: "Conversations", value: c.conversations, icon: "💬" },
    { label: "Sentences", value: c.sentences, icon: "🔤" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {rows.map((r) => (
        <div key={r.label} className="rounded-2xl border-2 border-slate-200 bg-white p-3 text-center">
          <p className="text-xl">{r.icon}</p>
          <p className="text-lg font-black text-slate-800">{r.value.toLocaleString("en-US")}</p>
          <p className="text-[11px] font-bold text-slate-400">{r.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------- Confetti ---------- */
export function fireConfetti(big = false) {
  const defaults = { origin: { y: 0.7 }, disableForReducedMotion: true };
  confetti({ ...defaults, particleCount: big ? 220 : 90, spread: big ? 100 : 70 });
  if (big) {
    setTimeout(() => confetti({ ...defaults, particleCount: 120, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } }), 150);
    setTimeout(() => confetti({ ...defaults, particleCount: 120, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } }), 300);
  }
}

export function ProgressBar({ value, color = "#58CC02" }: { value: number; color?: string }) {
  return (
    <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-200">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  );
}

export function SectionTitle({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-2xl shadow-sm">{icon}</span>
      <div>
        <h1 className="text-xl font-black text-slate-800 sm:text-2xl">{title}</h1>
        {sub && <p className="text-sm text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

/* ---------- Learner's first language: free-text box ---------- */

/**
 * The learner TYPES their first language — any language, any spelling.
 * Values we recognise get their proper name and their league name pool;
 * anything else is used exactly as typed. An empty value means
 * "follow the content pack".
 */
export function L1Input({
  id,
  value,
  onChange,
  packDefault,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** L1 declared by the loaded content pack, shown as the default. */
  packDefault?: string;
}) {
  const listId = useId();
  const typed = isAutoL1(value) ? "" : value;
  const packName = languageName(packDefault || "en");
  const recognised = typed ? findLanguage(typed) : null;

  return (
    <div>
      <input
        id={id}
        list={listId}
        type="text"
        autoComplete="off"
        spellCheck={false}
        value={typed}
        placeholder={`Type your language… (empty = ${packName})`}
        onChange={(e) => onChange(e.target.value.trim() ? e.target.value : "auto")}
        className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-[#58CC02]"
      />
      <datalist id={listId}>
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.name} />
        ))}
      </datalist>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-[11px] text-slate-400">
          {typed
            ? recognised
              ? `Recognised as ${recognised.name} — translations, examples and league names use it.`
              : `“${typed}” is not in the built-in list, but it will be used exactly as typed for translations and examples (league names fall back to international ones).`
            : `Empty follows the content pack (${packName}).`}
        </p>
        {typed && (
          <button type="button" onClick={() => onChange("auto")} className="text-[11px] font-black text-[#1CB0F6]">
            Use the pack default ({packName})
          </button>
        )}
      </div>
    </div>
  );
}

export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function pill(tone: "green" | "blue" | "amber" | "purple" | "slate", label: string) {
  const tones: Record<string, string> = {
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
    amber: "bg-amber-100 text-amber-700",
    purple: "bg-purple-100 text-purple-600",
    slate: "bg-slate-100 text-slate-500",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${tones[tone]}`}>{label}</span>;
}
