/**
 * The moments a game is remembered for.
 *
 * Earning a level and pulling a foil card are the two events this app asks a learner to
 * keep coming back for, and both used to be a confetti burst and a number that quietly
 * changed in the corner. A cinematic does three things the old feedback could not:
 *
 *  - **It interrupts.** A level-up takes over the screen for a beat, which is what makes
 *    progress feel like an event rather than a counter.
 *  - **It names the reward.** The level number, the new stage badge and its title all
 *    appear together, so the learner understands what they just unlocked.
 *  - **It ends.** Every one of these is dismissible by click, by Escape and by a timer,
 *    because a celebration that traps a learner mid-lesson is a bug, not polish.
 */

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CinematicBurst, ParticleAura } from "./CardArt";
import { Icon, Mascot, StageGlyph, UI, type StageName, type Mood } from "./Glyphs";
import { useFocusTrap } from "../lib/a11y";

/**
 * The level-up takeover.
 *
 * Order of layers matters here: the radial wash sits under the badge, the badge under
 * the text, and the mascot is last so it appears to be standing in front of the card.
 */
export function LevelUpCinematic({
  level,
  stage,
  title,
  mood = "celebrating",
  autoDismissMs = 4200,
  onDone,
}: {
  level: number;
  stage: StageName;
  title: string;
  mood?: Mood;
  autoDismissMs?: number;
  onDone: () => void;
}) {
  const ref = useFocusTrap<HTMLDivElement>(true, onDone);

  useEffect(() => {
    const timer = setTimeout(onDone, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, onDone]);

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={`Level up. You reached level ${level}, ${title}.`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onDone}
      /*
       * The two reward reveals keep a dark backdrop in both themes.
       *
       * They are not surfaces a learner reads — they are three seconds of theatre, and a
       * near-black stage is what makes the flash, the burst and the foil read as *bright*.
       * On the light theme a white scrim would swallow exactly the effect they exist for.
       */
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-ink-950/85 px-6 backdrop-blur-sm"
    >
      <span aria-hidden="true" className="level-flash absolute inset-0 m-auto h-64 w-64 rounded-full bg-amber-300/25" />
      <CinematicBurst color="#fbbf24" size={420} />

      <motion.div
        initial={{ scale: 0.4, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="relative flex flex-col items-center text-center"
      >
        <div className="relative">
          <StageGlyph stage={stage} size={104} />
          <AnimatePresence>
            <motion.span
              className="absolute -right-10 -top-2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.18, type: "spring", stiffness: 320, damping: 16 }}
            >
              <Mascot mood={mood} size={52} className="text-sky-300" />
            </motion.span>
          </AnimatePresence>
        </div>

        <p className="mt-5 text-2xs font-black uppercase tracking-[0.35em] text-amber-300/80">Level up</p>
        <p className="tnum mt-1 text-6xl leading-none font-black text-white" data-num>
          {level}
        </p>
        <p className="word-display mt-1 text-3xl text-amber-200">{title}</p>
        <p className="mt-3 max-w-xs text-sm text-white/60">
          Your mascot grew with you. New stage unlocked — the deck waits where you left it.
        </p>
        <p className="mt-6 text-2xs uppercase tracking-widest text-white/30">Click or press Escape to continue</p>
      </motion.div>
    </motion.div>
  );
}

/**
 * The foil pull.
 *
 * Deliberately different in shape from a level-up: a shake then a reveal, rather than a
 * wash. Two rewards that look identical stop meaning separate things.
 */
export function LegendaryReveal({ word, rarity, onDone }: { word: string; rarity: "epic" | "legendary"; onDone: () => void }) {
  const ref = useFocusTrap<HTMLDivElement>(true, onDone);
  const epic = rarity === "epic";
  const color = epic ? "#c084fc" : "#fbbf24";

  useEffect(() => {
    const timer = setTimeout(onDone, 3400);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={`${epic ? "Epic" : "Legendary"} card pulled: ${word}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDone}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-ink-950/90 px-6 backdrop-blur"
    >
      {epic ? null : <span aria-hidden="true" className="level-flash absolute inset-0 m-auto h-72 w-72 rounded-full" style={{ background: `${color}33` }} />}
      <CinematicBurst color={color} size={460} />

      <div className="reveal-shake relative flex flex-col items-center">
        <div className="relative">
          <ParticleAura rarity={rarity} count={epic ? 14 : 22} />
          <motion.div
            initial={{ rotateY: 180, scale: 0.7 }}
            animate={{ rotateY: 0, scale: 1 }}
            transition={{ delay: 0.55, duration: 0.6, type: "spring", stiffness: 180, damping: 20 }}
            className="relative flex h-56 w-40 flex-col items-center justify-center rounded-2xl border-2 px-4 text-center"
            style={{ borderColor: color, background: epic ? "linear-gradient(150deg,#2a1150,#0a0514)" : "linear-gradient(150deg,#4a2c05,#120b02)", boxShadow: `0 0 60px ${color}88` }}
          >
            <span aria-hidden="true" className="holo absolute inset-0 rounded-2xl opacity-60" />
            <p className="word-display relative z-10 text-2xl leading-tight text-white">{word}</p>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05 }}
          className="mt-6 text-3xs text-sm font-black uppercase tracking-[0.4em]"
          style={{ color }}
        >
          {epic ? "Epic" : "Legendary"}
        </motion.p>
        <p className="mt-2 max-w-xs text-center text-xs text-white/50">Added to your collection. Click to continue.</p>
      </div>
    </motion.div>
  );
}

/**
 * An achievement unlocking.
 *
 * Anchored to a corner and stacked, so several can land at once after a good session
 * without covering the card the learner is reading.
 */
export function AchievementToasts({ achievements }: { achievements: { id: string; label: string; description: string; color: string; xp: number }[] }) {
  if (!achievements.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[55] flex w-72 flex-col gap-2" role="status" aria-live="polite">
      <AnimatePresence>
        {achievements.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ delay: index * 0.12, type: "spring", stiffness: 300, damping: 24 }}
            className="pointer-events-auto flex items-center gap-3 rounded-xl border border-line-2 bg-panel p-3 shadow-xl backdrop-blur"
            style={{ borderColor: `${achievement.color}55` }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ background: `${achievement.color}22`, color: achievement.color }}
            >
              <Icon as={UI.Trophy} size={18} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-black text-fg-1">{achievement.label}</p>
              <p className="truncate text-2xs text-fg-3">{achievement.description}</p>
            </div>
            <span className="tnum ml-auto shrink-0 text-2xs font-black" style={{ color: achievement.color }} data-num>
              +{achievement.xp}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * The share sheet.
 *
 * Shows the result card and, when the deck fits, a QR code of a self-contained share
 * link. When it does not fit, the sheet says so and offers the file instead of showing a
 * QR that scans to nothing — which is the failure mode worth engineering against.
 */
export function ShareSheet({
  imageUrl,
  qrDataUrl,
  qrTooLarge,
  shareUrl,
  onClose,
  onCopy,
  onExportFile,
  copied,
}: {
  imageUrl: string | null;
  qrDataUrl: string | null;
  qrTooLarge: boolean;
  shareUrl: string;
  onClose: () => void;
  onCopy: () => void;
  onExportFile: () => void;
  copied: boolean;
}) {
  const ref = useFocusTrap<HTMLDivElement>(true, onClose);

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Share your progress"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: "var(--scrim)" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ y: 24, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line-2 bg-panel p-5"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-fg-1">Share your session</h3>
            <p className="text-xs text-fg-3">A card image for a chat, or a QR that carries the whole deck.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the share sheet"
            className="rounded-lg border border-line-2 p-2 text-fg-3 transition hover:bg-inset hover:text-fg-1"
          >
            <Icon as={UI.X} size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          {imageUrl ? (
            <img src={imageUrl} alt="Your session summary card" className="w-full rounded-xl border border-white/10 sm:w-1/2" />
          ) : (
            <div className="flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-line-2 text-xs text-fg-4 sm:w-1/2">
              No summary image yet
            </div>
          )}

          <div className="flex w-full flex-col items-center justify-center gap-2 sm:w-1/2">
            {qrDataUrl ? (
              <>
                <img src={qrDataUrl} alt="QR code containing this deck" width={180} height={180} className="rounded-lg bg-white p-2" />
                <p className="text-center text-2xs text-fg-4">
                  Scan to load this deck on another device. The code carries the words, definitions and tiers — the link below has the
                  examples and etymology too.
                </p>
              </>
            ) : qrTooLarge ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-center dark:border-amber-400/40 dark:bg-amber-400/10">
                <Icon as={UI.Warning} size={16} className="mx-auto mb-1 text-amber-700 dark:text-amber-300" />
                <p className="text-2xs text-amber-800 dark:text-amber-200">
                  This deck is too large for a QR code. Export the JSON file and send that instead — the link below still works.
                </p>
              </div>
            ) : (
              <div className="text-2xs text-fg-4">Preparing a QR code…</div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-500 py-2.5 text-sm font-black text-white transition hover:bg-indigo-400"
          >
            <Icon as={copied ? UI.ClipboardCheck : UI.Clipboard} size={15} />
            {copied ? "Link copied" : "Copy share link"}
          </button>
          <button
            type="button"
            onClick={onExportFile}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line-2 py-2.5 text-sm font-black text-fg-2 transition hover:bg-inset"
          >
            <Icon as={UI.Upload} size={15} />
            Export deck JSON
          </button>
        </div>
        <p className="mt-3 truncate font-mono text-2xs text-fg-4" title={shareUrl}>
          {shareUrl}
        </p>
      </motion.div>
    </motion.div>
  );
}
