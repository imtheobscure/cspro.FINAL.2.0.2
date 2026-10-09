import { useEffect, useRef, type ReactNode } from "react";
import type { TutorlyBranding } from "../lib/tutorlyBranding";

/*
 * The opening screen — the same one every other Tutorly game has.
 *
 * The Adult Dashboard owns the wording (Settings → Splash Screen Text / Subtext), the logo
 * and the on/off switch; this renders them. It exists because two of the games in the hub
 * opened straight into play with no branding step at all, so a tutor's splash settings
 * applied to the other games and silently did nothing here.
 *
 * Rules it inherits from `GameShell.tsx`, all of which matter in a projected lesson:
 *  - the frame is 100dvh and must never scroll, so the start control can't fall below the
 *    fold on a short window;
 *  - the text scales with the viewport (`clamp`), so a projector and a laptop both read;
 *  - everything is drawn from the app's own theme tokens, so the light default and the dark
 *    override both stay legible instead of one of them inheriting a dark stage;
 *  - the game's own name is always shown, whether or not the tutor has written splash text,
 *    because the learner is the one who needs to know which game just opened.
 */
export function TutorlySplash({
  branding,
  gameName,
  tagline,
  mark,
  onStart,
}: {
  branding: TutorlyBranding;
  gameName: string;
  tagline: string;
  /** the game's own drawn mark, used when the tutor has not uploaded a logo */
  mark?: ReactNode;
  onStart: () => void;
}) {
  const startRef = useRef<HTMLButtonElement | null>(null);

  /*
   * Escape dismisses, and the start button takes focus on mount: without it a keyboard user
   * lands on a page where Tab walks into the game behind an overlay they cannot see past.
   */
  useEffect(() => {
    startRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onStart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStart]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${gameName} is starting`}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center overflow-hidden px-5 text-center"
      style={{ background: "var(--stage-bg)" }}
      onClick={onStart}
    >
      {/* The stage's own accent glow, so the splash belongs to the game rather than sitting on top of it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 38%, color-mix(in oklab, var(--accent-info) 22%, transparent), transparent 70%)",
        }}
      />

      <div className="relative z-10 flex w-full max-w-[860px] flex-col items-center">
        {/* The tutor's logo, or the game's own mark when there isn't one. */}
        <div
          className="grid h-[clamp(64px,10vh,104px)] w-[clamp(64px,10vh,104px)] place-items-center overflow-hidden rounded-3xl border"
          style={{
            background: "var(--surface-panel)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--panel-shadow)",
          }}
        >
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt=""
              className="h-full w-full object-cover"
              /* A broken logo URL must not leave a hole where the mark should be. */
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            mark
          )}
        </div>

        {/* What the tutor wrote in the dashboard, if they wrote anything. */}
        {branding.text ? (
          <p
            className="mt-[clamp(10px,2vh,22px)] font-black uppercase tracking-[0.24em] text-fg-2"
            style={{ fontSize: "clamp(0.72rem, 1.7vw, 0.95rem)" }}
          >
            {branding.text}
          </p>
        ) : null}

        <h2
          className="word-display mt-[clamp(6px,1.4vh,16px)] font-semibold leading-none tracking-tight text-fg-1"
          style={{ fontSize: "clamp(2.1rem, 7.5vw, 4.6rem)" }}
        >
          {gameName}
        </h2>

        <p
          className="mt-[clamp(6px,1.4vh,16px)] max-w-[54ch] font-medium leading-snug text-fg-2"
          style={{ fontSize: "clamp(0.95rem, 2.4vw, 1.35rem)" }}
        >
          {tagline}
        </p>

        {branding.subtext ? (
          <p
            className="mt-[clamp(4px,1vh,12px)] max-w-[54ch] leading-snug text-fg-2"
            style={{ fontSize: "clamp(0.85rem, 1.9vw, 1.1rem)" }}
          >
            {branding.subtext}
          </p>
        ) : null}

        <button
          ref={startRef}
          type="button"
          onClick={onStart}
          className="mt-[clamp(18px,3.4vh,40px)] rounded-2xl px-8 py-3 text-base font-black text-fg-1 transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-info"
          style={{
            background: "var(--surface-control)",
            border: "1px solid var(--border-control)",
            boxShadow: "var(--panel-shadow)",
          }}
        >
          Start
        </button>

        {/*
          * `--content-3`, not `--content-4`: at 13px on the light stage the faintest ink
          * measured 4.28:1, which is under AA, and this is the line that tells a tutor how to
          * get past the screen. The tutor's own wording above uses `--content-2` for the same
          * reason — their text should never be the least legible thing on the page.
          */}
        <p className="mt-[clamp(8px,1.6vh,18px)] text-2xs font-medium text-fg-3">
          Press Escape, or click anywhere, to skip
        </p>
      </div>
    </div>
  );
}
