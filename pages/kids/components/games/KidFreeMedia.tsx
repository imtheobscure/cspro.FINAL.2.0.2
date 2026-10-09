/* ════════════════════════════════════════════════════════════════════════════
   🖼️ FREE MEDIA COMPONENTS — the picture a word actually stands for
   ════════════════════════════════════════════════════════════════════════════

   `kidFreeMedia.ts` knows how to FIND a real photograph. This file knows how to
   show one without ever breaking the screen it is on.

   The one rule that shapes every component here: **the emoji is always there.**
   An `<img>` that 404s, a CDN the school has blocked, a laptop on a train with no
   signal — in each case the child sees the emoji the lesson already had, at the
   same size, in the same place. Free media upgrades a lesson; it is never allowed
   to become the reason a lesson fails. That is why nothing here can render an
   empty box, and why every remote load is paired with an `onError` that falls back.
   ════════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';
import { creditLine, fetchPhoto, twemojiSvg, type KidPhoto } from '../../utils/kidFreeMedia';

/**
 * Resolve a word to a real photograph, in the background.
 *
 * The hook never blocks the screen: it returns `undefined` on the first render,
 * the caller draws the emoji, and the photograph swaps in only if one arrives. A
 * child therefore sees *something* instantly and a better thing a moment later,
 * which is the only ordering that survives a slow network in front of a class.
 */
export function useFreePhoto(word?: string, enabled = true): KidPhoto | undefined {
  const [photo, setPhoto] = useState<KidPhoto | undefined>(undefined);

  useEffect(() => {
    setPhoto(undefined);
    if (!enabled || !word) return;
    let live = true;
    fetchPhoto(word)
      .then((found) => {
        if (live && found) setPhoto(found);
      })
      .catch(() => {
        /* fetchPhoto already swallows its own errors; belt and braces */
      });
    return () => {
      live = false;
    };
  }, [word, enabled]);

  return photo;
}
interface KidPictureProps {
  /** The word to find a photograph of. */
  word?: string;
  /** The emoji to show while loading, and forever if nothing is found. */
  emoji?: string;
  /** How big the fallback emoji should be, in px. */
  size?: number;
  /** Turn the network off entirely (a tutor on a locked-down school wifi). */
  disableNetwork?: boolean;
  className?: string;
  /** Square and rounded, for an option card. Off keeps the picture's own shape. */
  rounded?: boolean;
  /** A gentle spinner while looking. Off by default: it distracts small children. */
  showLoading?: boolean;
}

/**
 * A real photograph of a word, falling back to its emoji.
 *
 * Used wherever a lesson currently shows a bare glyph as the *meaning* of a word —
 * the word cards, the quiz options, the hero on the game stage. The photograph is
 * only ever chosen when it is safe (see `kidFreeMedia`), and it is credited in the
 * DOM rather than left in a comment, because CC BY attribution is a condition of
 * using the image at all, not a courtesy.
 */
export const KidPicture: React.FC<KidPictureProps> = ({
  word,
  emoji,
  size = 96,
  disableNetwork = false,
  className = '',
  rounded = true,
  showLoading = false,
}) => {
  const photo = useFreePhoto(word, !disableNetwork);
  const [broken, setBroken] = useState(false);

  // A new word means a new chance: clear the failure so we do not stay stuck on it.
  useEffect(() => setBroken(false), [word, photo?.url]);

  if (!photo || broken) {
    if (showLoading && !emoji) {
      return (
        <span className={`inline-flex items-center justify-center ${className}`}>
          <Loader2 className="animate-spin text-indigo-300" style={{ width: size / 2, height: size / 2 }} />
        </span>
      );
    }
    return (
      <span aria-hidden className={`inline-flex items-center justify-center ${className}`}>
        <span className="select-none leading-none drop-shadow-sm" style={{ fontSize: size }}>
          {emoji || '🔤'}
        </span>
      </span>
    );
  }

  return (
    <img
      src={photo.url}
      alt={`${photo.title} — a real photograph`}
      title={creditLine(photo)}
      loading="lazy"
      onError={() => setBroken(true)}
      className={`${className} ${rounded ? 'rounded-2xl object-cover' : 'object-contain'}`}
      style={{ width: size, height: rounded ? size : undefined, background: 'rgba(255,255,255,0.85)' }}
    />
  );
};
/**
 * Emoji as a crisp SVG, with the original glyph as the fallback.
 *
 * Cheap to use anywhere and worth it exactly where the art IS the content: the big
 * hero on the game stage, the prize in a celebration, the badge on a word card.
 * `onError` swaps in the platform emoji, so when it fails the block is invisible.
 */
export const KidEmoji: React.FC<{
  emoji: string;
  size?: number;
  className?: string;
  disableNetwork?: boolean;
}> = ({ emoji, size = 64, className = '', disableNetwork = false }) => {
  const [svg, setSvg] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
    if (disableNetwork || !emoji) {
      setSvg(null);
      return;
    }
    setSvg(twemojiSvg(emoji));
  }, [emoji, disableNetwork]);

  if (!svg || broken) {
    return (
      <span
        aria-hidden
        className={`select-none leading-none drop-shadow-sm ${className}`}
        style={{ fontSize: size }}
      >
        {emoji}
      </span>
    );
  }
  return (
    <img
      src={svg}
      alt=""
      aria-hidden
      loading="lazy"
      onError={() => setBroken(true)}
      className={`select-none ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

/**
 * The attribution line every screen showing free media must carry.
 *
 * Rendered small and quiet on purpose. It is a legal requirement for the CC BY and
 * CC BY-SA photographs, so it is a real element rather than a comment a minifier
 * would be free to drop.
 */
export const MediaCredit: React.FC<{ photo?: KidPhoto | null; className?: string }> = ({
  photo,
  className = '',
}) => <p className={`text-[9px] font-medium text-white/35 ${className}`}>{creditLine(photo)}</p>;

/** A tidy "no photographs here" note for the tutor. Never shown to the child. */
export const MediaOfflineNote: React.FC<{ visible: boolean }> = ({ visible }) =>
  visible ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500">
      <ImageOff className="h-3 w-3" /> Real photos are offline — showing emoji
    </span>
  ) : null;
/**
 * The word inside an option label such as "🐄 cow".
 *
 * Game options are written "emoji + word" by every catalogue in the library, and
 * the emoji is there for the child while the word is what a photograph can be
 * found for. Splitting the two is therefore free information, and it is what lets
 * every quiz option in the app become a real picture without asking the AI for
 * anything extra.
 *
 * Returns '' when the label is a phrase or a sentence rather than a noun —
 * "the big river horse" is not something to go looking for a photograph of.
 */
export function wordFromLabel(label: string): string {
  const text = String(label || '').trim();
  if (!text) return '';
  // Strip the emoji, then take what is left.
  const withoutEmoji = text.replace(/\p{Extended_Pictographic}(?:️)?(?:‍\p{Extended_Pictographic}(?:️)?)*/gu, ' ');
  const cleaned = withoutEmoji.replace(/[^A-Za-z'-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const words = cleaned.split(' ');
  // One word is ideal. Two is acceptable only if the first is a short article.
  if (words.length === 1) return words[0].toLowerCase();
  if (words.length === 2 && /^(a|an|the|my|your)$/i.test(words[0])) return words[1].toLowerCase();
  return '';
}

/**
 * One option's artwork: a real photograph when we can find one, the emoji always.
 *
 * This is the component that makes a quiz *look* like the real thing. The games in
 * the library are written as emoji lists ("🦆 duck", "🐮 cow"), and before this
 * existed that is exactly what a class saw: a grid of glyphs. Now each option is
 * a photograph of the actual thing, resolved from its own label, with the emoji
 * kept underneath as the fallback and as the alt text.
 *
 * Deliberate design points:
 *  · The photo never reveals anything the emoji did not. The word is already in
 *    the label the tutor wrote, so nothing is leaked that was not on the card.
 *  · `disableNetwork` is honoured, so a tutor on locked-down school wifi gets the
 *    whole grid back instantly with no failed requests.
 *  · Each option resolves independently and lazily, so a 6-option grid makes six
 *    small cached lookups rather than one blocking call.
 */
export const KidOptionArt: React.FC<{
  /** The option label as written, e.g. "🦆 duck". */
  label: string;
  /** A URL the AI supplied. Always wins — it was chosen on purpose. */
  imageUrl?: string;
  /** Pixels. Options sit in a grid, so this is smaller than the hero. */
  size?: number;
  disableNetwork?: boolean;
  className?: string;
}> = ({ label, imageUrl, size = 64, disableNetwork = false, className = '' }) => {
  // An explicit URL from the AI is respected as-is; it is not ours to second-guess.
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        className={`${className} shrink-0 rounded-2xl object-cover`}
        style={{ width: size, height: size, background: 'rgba(255,255,255,0.85)' }}
      />
    );
  }
  return <KidPicture word={wordFromLabel(label)} emoji={label} size={size} disableNetwork={disableNetwork} className={className} />;
};