"use client";

import { useCallback, useEffect, useRef } from "react";
import { embedUrlFor, parseEmbedUrl } from "@/modules/media/embed";
import type { PlayerController } from "@/modules/player/store";

/**
 * The player surface for a platform-hosted source.
 *
 * YouTube, Dailymotion and Vimeo license playback inside their own player, so this
 * renders that player in an iframe pointed at the official embed URL and hands the
 * element to the controller, which drives it through the platform's API. The
 * surrounding experience — timeline, transcript, activities — is unchanged, because
 * the controller mirrors play/pause/position into the same store the `<video>` path
 * uses.
 *
 * It is deliberately not a `sandbox`ed iframe: all three platforms refuse to play
 * inside a sandbox that withholds `allow-same-origin`, and every one of them needs
 * its own storage and autoplay permissions to work at all.
 */
export function EmbedFrame({ src, controller, className }: { src: string; controller: PlayerController; className?: string }) {
  const handle = parseEmbedUrl(src);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  /** Guards against re-attaching the same source on every re-render. */
  const attachedRef = useRef<string | null>(null);

  const bind = useCallback(
    (element: HTMLIFrameElement | null) => {
      frameRef.current = element;
      if (!element || !handle) return;
      if (attachedRef.current === src) return;
      attachedRef.current = src;
      void controller.attachEmbed(element, {
        id: "embed",
        url: src,
        type: "embed",
        label: `${handle.platform} embed`,
      });
    },
    [controller, handle, src],
  );

  // Switching sources must release the platform player, or the old iframe keeps
  // buffering in the background and YouTube bills a second video view.
  useEffect(() => {
    return () => {
      attachedRef.current = null;
      controller.detachEmbed();
    };
  }, [controller, src]);

  if (!handle) {
    return (
      <div className={`grid place-items-center bg-black text-center text-sm text-amber-200 ${className ?? "h-full w-full"}`}>
        <div className="max-w-md px-6">
          <p className="font-semibold">Unrecognised embed</p>
          <p className="mt-1 text-xs text-zinc-300">
            This source is not a YouTube, Dailymotion or Vimeo video, so there is no official player to hand it to.
          </p>
        </div>
      </div>
    );
  }

  // `origin` is what makes the platform accept our messages; for YouTube the IFrame
  // API creates its own iframe and the URL below is only used as a fallback.
  const url = embedUrlFor(handle, typeof window === "undefined" ? "" : window.location.origin);
  const label = handle.platform === "youtube" ? "YouTube player" : handle.platform === "dailymotion" ? "Dailymotion player" : "Vimeo player";

  return (
    <div className={className ?? "h-full w-full"} data-embed-platform={handle.platform}>
      <iframe
        ref={bind}
        src={url}
        title={label}
        className="h-full w-full border-0 bg-black"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        // Dailymotion and Vimeo ignore anything sent before their player boots, so the
        // handshake is repeated once the document has actually loaded.
        onLoad={() => controller.embed.handshake()}
      />
    </div>
  );
}
