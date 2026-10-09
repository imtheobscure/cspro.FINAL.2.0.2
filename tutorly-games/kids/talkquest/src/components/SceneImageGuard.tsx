"use client";

import { useEffect } from "react";
import { nextSceneCandidate, SCENE_EXTENSIONS } from "@/lib/art";

/**
 * Keeps every game backdrop showing SOMETHING, whatever artwork happens to exist.
 *
 * The games draw their backdrops with a plain
 *
 *     <img src={scene("whisper-wall")} className="absolute inset-0 object-cover" />
 *
 * in twenty-odd places (the launcher cards, each game's start card, each game's
 * in-play background). Those files are the tutor's own hand-made artwork, so the
 * first choice is always the real picture; when one is missing the browser fires
 * an `error` event that does not bubble — so this listens in the CAPTURE phase on
 * `window`, walks the extension chain (`jpg → jpeg → png → webp → avif`) with
 * `nextSceneCandidate`, and lands on the generated `.svg` scene at the end.
 *
 * Why a global listener instead of an `onError` per image: the images are written
 * in twenty places inside two different kinds of component, and a game screen can
 * be swapped in at any moment. One listener catches all of them, including images
 * React never re-renders, and it cannot be forgotten when an eleventh game is
 * added.
 *
 * Images that failed BEFORE this mounted (a fast 404 on first paint) are swept
 * once on mount by looking for complete images with no pixels.
 */
export const SceneImageGuard: React.FC = () => {
  useEffect(() => {
    const tried = new WeakMap<HTMLImageElement, string[]>();

    const advance = (img: HTMLImageElement) => {
      const current = img.currentSrc || img.getAttribute("src") || "";
      const attempted = tried.get(img) ?? [];
      const next = nextSceneCandidate(current, attempted as never);
      if (!next || next === current) return;
      tried.set(img, [...attempted, current.split(".").pop()?.toLowerCase() ?? ""]);
      img.src = next;
    };

    // `error` does not bubble, but it does capture — this is the documented way to
    // observe image loads for the whole document.
    const onError = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLImageElement) advance(target);
    };

    window.addEventListener("error", onError, true);

    // Sweep anything that already 404'd before this effect ran.
    for (const img of Array.from(document.images)) {
      if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) advance(img);
    }

    return () => window.removeEventListener("error", onError, true);
  }, []);

  return null;
};

/** True when a URL points at a hand-made scene file (any supported extension). */
export const isSceneUrl = (url: string) =>
  SCENE_EXTENSIONS.some((ext) => url.split(/[?#]/)[0].toLowerCase().endsWith(`.${ext}`));
