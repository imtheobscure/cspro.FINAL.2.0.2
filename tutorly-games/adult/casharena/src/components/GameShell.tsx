"use client";
/**
 * The Tutorly shell for the Cash Arena — the same routine every other Tutorly
 * game uses, so the arena does not look like a different product.
 *
 * The name lives in `src/lib/branding.ts` (`GAME`), and so does the reader for
 * the tutor's own splash wording (Adult Dashboard → General Settings → Splash
 * Screen, stored in `localStorage['app-storage']`). Both are shared by agreement
 * with the Vite games' `GameShell.tsx`: a Next app and a Vite game cannot import
 * each other's sources, so the values and the key have to match by convention.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  EMPTY_BRANDING,
  GAME,
  SPLASH_SEEN_KEY,
  readTutorlyBranding,
  type TutorlyBranding,
} from "@/lib/branding";

export { GAME, readTutorlyBranding };
export type { TutorlyBranding };

/* ───────────────────── shared dashboard branding ───────────────────── */

/** Live view of the dashboard settings: updates the moment they are saved. */
export function useTutorlyBranding(): TutorlyBranding {
  const [branding, setBranding] = useState<TutorlyBranding>(EMPTY_BRANDING);
  useEffect(() => {
    const refresh = () => setBranding(readTutorlyBranding());
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "app-storage") refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return branding;
}

/** The Tutorly lockup — the tutor's logo when they set one, the 🎓 mark otherwise. */
export function TutorlyBrand({ logoUrl, size = "md" }: { logoUrl?: string | null; size?: "md" | "lg" }) {
  const box = size === "lg" ? 52 : 40;
  const mark = size === "lg" ? 30 : 23;
  return (
    <div className="flex items-center justify-center gap-3">
      <span
        className="grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-amber-300/40 bg-gradient-to-br from-amber-300/25 to-amber-600/20"
        style={{ width: box, height: box }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" style={{ width: box, height: box, objectFit: "cover" }} />
        ) : (
          <span style={{ fontSize: mark }}>🎓</span>
        )}
      </span>
      <span className="text-left leading-none">
        <span className="block text-[0.62rem] font-black uppercase tracking-[0.34em] text-amber-300/90">{GAME.brand}</span>
        <span className={size === "lg" ? "gold-text text-3xl font-black" : "gold-text text-xl font-black"}>{GAME.name}</span>
      </span>
    </div>
  );
}

/* ───────────────────────── the first splash ───────────────────────── */

const SPLASH_CSS = `
.arena-splash {
  position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 100dvh; padding: clamp(10px, 2.4vh, 28px) clamp(12px, 3vw, 30px); overflow: hidden; text-align: center;
}
.arena-splash-inner { position: relative; z-index: 2; width: 100%; max-width: 880px; }
.arena-hero-emoji { font-size: clamp(2.2rem, 6vh, 5rem); line-height: 1; margin: clamp(2px, .8vh, 10px) 0; }
.arena-title { font-size: clamp(1.5rem, 5.4vh, 3.4rem); font-weight: 950; line-height: 1.05; letter-spacing: -.02em; }
.arena-tag { font-size: clamp(.82rem, 2vh, 1.12rem); }
.arena-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: clamp(5px, .8vw, 10px); }
.arena-chip {
  border-radius: 999px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.06);
  padding: clamp(4px, .8vh, 7px) clamp(9px, 1vw, 14px); font-size: clamp(.68rem, 1.6vh, .82rem); font-weight: 800;
}
.arena-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
.arena-floater { position: absolute; z-index: 1; pointer-events: none; opacity: .14; }
@keyframes arenaFloat { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-22px) rotate(4deg); } }
@media (max-height: 720px) { .arena-chips, .arena-optional { display: none !important; } }
@media (max-width: 620px) { .arena-actions { flex-direction: column; align-items: stretch; } .arena-actions > * { width: 100%; } }
@media (prefers-reduced-motion: reduce) { .arena-floater { animation: none !important; } }
`;

const FLOATERS = ["💰", "🃏", "🏆", "🎲", "🔥", "🎤", "📱", "🛡️"];

export interface TutorlySplashConfig {
  /** primary action — normally "enter the arena" (reveals the app) */
  onPlay: () => void;
  playLabel?: string;
  /** optional second action, e.g. host a game */
  onHost?: () => void;
  /** optional third action, e.g. join with a code */
  onJoin?: () => void;
  /** optional extra button (a game's own screen) */
  extraAction?: { label: string; onClick: () => void };
  /** shown when a session can be resumed */
  resume?: { label: string; onClick: () => void };
  /** small print under the buttons */
  footer?: ReactNode;
}

export function TutorlySplash(props: TutorlySplashConfig) {
  const branding = useTutorlyBranding();
  const brandText = branding.enabled ? branding.text : null;
  const brandSub = branding.enabled ? branding.subtext : null;

  return (
    <div className="arena-splash anim-fade">
      <style>{SPLASH_CSS}</style>

      {FLOATERS.map((f, i) => (
        <span
          key={f}
          aria-hidden
          className="arena-floater"
          style={{
            left: `${4 + i * 12}%`,
            top: `${10 + ((i * 37) % 70)}%`,
            fontSize: `${2 + (i % 3) * 1.3}rem`,
            animation: `arenaFloat ${5 + (i % 4)}s ease-in-out ${i * 0.4}s infinite`,
          }}
        >
          {f}
        </span>
      ))}

      <div className="arena-splash-inner">
        <div className="flex justify-center">
          <TutorlyBrand logoUrl={branding.logoUrl} size="lg" />
        </div>

        {/* The tutor's own splash wording — Adult Dashboard → General Settings */}
        {brandText && (
          <div className="mt-4 font-black tracking-wide text-white/90" style={{ fontSize: "clamp(1.05rem, 2.6vw, 1.5rem)" }}>
            {brandText}
          </div>
        )}
        {brandSub && (
          <div
            className="mx-auto mt-3 inline-block rounded-2xl px-4 py-2 font-extrabold"
            style={{
              fontSize: "clamp(.95rem, 2.2vw, 1.2rem)",
              color: "#ffe6b0",
              background: "rgba(245,197,66,.14)",
              border: "1px solid rgba(245,197,66,.3)",
            }}
          >
            {brandSub}
          </div>
        )}

        <div className="arena-optional mx-auto mt-4 flex items-center justify-center gap-3" style={{ maxWidth: 520 }}>
          <span className="h-px flex-1 bg-white/20" />
          <span className="text-[0.62rem] font-black uppercase tracking-[0.3em] text-white/45">one setup · every game</span>
          <span className="h-px flex-1 bg-white/20" />
        </div>

        <div className="arena-hero-emoji">{GAME.emoji}</div>
        <h1 className="arena-title">
          {GAME.brand} <span className="gold-text">{GAME.name}</span>
        </h1>
        <p className="arena-tag mx-auto mt-3 max-w-2xl text-white/75">{GAME.tagline}</p>

        <div className="arena-chips mt-5">
          {[
            ["💵", "Cash economy"],
            ["🃏", "15 power-ups"],
            ["🎧", "7 question types"],
            ["🧠", "Review suite"],
            ["🎤", "Host big-screen"],
            ["📱", "Join with a code"],
          ].map(([i, l]) => (
            <span key={l} className="arena-chip">
              {i} {l}
            </span>
          ))}
        </div>

        <div className="arena-actions mt-7">
          <button onClick={props.onPlay} className="btn btn-gold text-2xl">
            {props.playLabel ?? `▶ Play ${GAME.name}`}
          </button>
          {props.resume && (
            <button onClick={props.resume.onClick} className="btn btn-ghost text-xl">
              {props.resume.label}
            </button>
          )}
          {props.onHost && (
            <button onClick={props.onHost} className="btn btn-cash text-xl">
              🎤 Host a game
            </button>
          )}
          {props.onJoin && (
            <button onClick={props.onJoin} className="btn btn-primary text-xl">
              📱 Join with code
            </button>
          )}
          {props.extraAction && (
            <button onClick={props.extraAction.onClick} className="btn btn-ghost text-xl">
              {props.extraAction.label}
            </button>
          )}
          <Link href="/guide" className="btn btn-ghost text-xl">
            📖 How to play
          </Link>
        </div>

        <div className="arena-optional mt-6 text-sm text-white/50">
          {props.footer ?? "Nothing to install · learners join from their phones on the classroom Wi-Fi"}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── splash-gated entry: splash first, app after ─────────────── */

/**
 * Show the splash as the FIRST page of the arena, then hand over to the app.
 *
 * The "seen" flag is per browser, so a tutor gets the branded first page once and
 * straight back into the arena afterwards — but `?splash=1` (and the nav's
 * "First page" button) brings it back, which is what you want when the class is
 * waiting on a projector. Nothing renders until the flag is known, so the splash
 * can never flash for a tutor who already dismissed it.
 */
export function SplashGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    let force = false;
    try {
      force = new URLSearchParams(window.location.search).get("splash") === "1";
    } catch {
      /* no query string to read */
    }
    let seen = false;
    try {
      seen = window.localStorage.getItem(SPLASH_SEEN_KEY) === "1";
    } catch {
      /* private mode — show it, it costs nothing */
    }
    setShow(force || !seen);
  }, []);

  const enter = (where: "home" | "host" | "join") => {
    try {
      window.localStorage.setItem(SPLASH_SEEN_KEY, "1");
    } catch {
      /* nothing to remember */
    }
    if (where === "home") setShow(false);
    else router.push(where === "host" ? "/host" : "/play");
  };

  if (show === null) return <div style={{ minHeight: "100dvh" }} />;
  if (show) {
    return <TutorlySplash onPlay={() => enter("home")} onHost={() => enter("host")} onJoin={() => enter("join")} />;
  }
  return <>{children}</>;
}
