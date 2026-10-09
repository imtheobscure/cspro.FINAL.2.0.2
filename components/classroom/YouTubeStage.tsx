import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * A real YouTube player for the Lyrics / AI Karaoke widgets.
 *
 * The previous implementation dropped a bare `<iframe src="…embed/ID">` into the
 * page, which meant: no play/pause, no seeking, and — because lyrics advanced on
 * a blind `setInterval` — no way to keep the highlighted line in step with the
 * song. This wraps the official IFrame Player API instead, so the widget can read
 * the playhead (`onTime`), jump to a line when a learner clicks it, and drive the
 * highlight from the actual video clock.
 *
 * The API script is loaded once per page and shared by every instance.
 */

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  setVolume: (v: number) => void;
  getVolume: () => number;
  destroy: () => void;
  loadVideoById?: (id: string) => void;
}

interface YTNamespace {
  Player: new (
    el: HTMLElement | string,
    opts: {
      videoId?: string;
      playerVars?: Record<string, string | number>;
      events?: { onReady?: () => void; onStateChange?: (e: { data: number }) => void; onError?: (e: { data: number }) => void };
    },
  ) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

/** Load https://www.youtube.com/iframe_api exactly once. */
function loadYouTubeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise<YTNamespace>((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        if (window.YT?.Player) resolve(window.YT);
        else reject(new Error("YouTube API loaded without a Player"));
      };
      const existing = document.querySelector<HTMLScriptElement>('script[data-tutorly-yt="1"]');
      if (!existing) {
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        s.async = true;
        s.dataset.tutorlyYt = "1";
        s.onerror = () => reject(new Error("Could not load the YouTube player"));
        document.head.appendChild(s);
      }
      // If the script was already injected by an earlier mount, the global
      // callback may never fire again — poll briefly as a safety net.
      let tries = 0;
      const poll = window.setInterval(() => {
        tries += 1;
        if (window.YT?.Player) {
          window.clearInterval(poll);
          resolve(window.YT);
        } else if (tries > 60) {
          window.clearInterval(poll);
          reject(new Error("The YouTube player did not become ready"));
        }
      }, 250);
    });
  }
  return apiPromise;
}

export interface PlayerHandle {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  currentTime: () => number;
  duration: () => number;
  isPlaying: () => boolean;
}

interface Props {
  videoId: string;
  className?: string;
  autoplay?: boolean;
  /** Called ~4×/second while the video is playing. */
  onTime?: (seconds: number) => void;
  onPlayingChange?: (playing: boolean) => void;
  onReady?: (duration: number) => void;
  onError?: (code: number) => void;
  /** Set to be able to control the player from the surrounding widget. */
  handleRef?: React.MutableRefObject<PlayerHandle | null>;
  /** Replaces the inner "unavailable" message. */
  unavailableLabel?: string;
}

const ERROR_TEXT: Record<number, string> = {
  2: "This video id is not valid.",
  5: "This video cannot play in an embedded player.",
  100: "This video is private or has been removed.",
  101: "The uploader does not allow this video to be embedded.",
  150: "The uploader does not allow this video to be embedded.",
};

const EMPTY_HANDLE: PlayerHandle = {
  play: () => {},
  pause: () => {},
  toggle: () => {},
  seek: () => {},
  currentTime: () => 0,
  duration: () => 0,
  isPlaying: () => false,
};

export const YouTubeStage: React.FC<Props> = ({
  videoId,
  className,
  autoplay = true,
  onTime,
  onPlayingChange,
  onReady,
  onError,
  handleRef,
  unavailableLabel = "This video cannot be played here",
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [failed, setFailed] = useState<string>("");
  const [loadedId, setLoadedId] = useState("");

  // Keep the latest callbacks without re-creating the player on every render.
  const cbs = useRef({ onTime, onPlayingChange, onReady, onError });
  cbs.current = { onTime, onPlayingChange, onReady, onError };

  const origin = useMemo(
    () => (typeof window !== "undefined" && window.location.origin.startsWith("http") ? window.location.origin : undefined),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    let timePoll: number | undefined;
    if (!videoId || !hostRef.current) return;

    setFailed("");
    setLoadedId("");

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !hostRef.current) return;
        const el = document.createElement("div");
        el.style.width = "100%";
        el.style.height = "100%";
        hostRef.current.innerHTML = "";
        hostRef.current.appendChild(el);

        const player = new YT.Player(el, {
          videoId,
          playerVars: {
            autoplay: autoplay ? 1 : 0,
            rel: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
            ...(origin ? { origin } : {}),
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              playerRef.current = player;
              setLoadedId(videoId);
              cbs.current.onReady?.(player.getDuration?.() || 0);
              if (autoplay) player.playVideo();
            },
            onStateChange: (e) => {
              if (cancelled) return;
              const playing = e.data === YT.PlayerState.PLAYING;
              cbs.current.onPlayingChange?.(playing);
              if (playing && timePoll === undefined) {
                timePoll = window.setInterval(() => {
                  const t = playerRef.current?.getCurrentTime?.();
                  if (typeof t === "number") cbs.current.onTime?.(t);
                }, 250);
              }
              if (!playing && timePoll !== undefined) {
                window.clearInterval(timePoll);
                timePoll = undefined;
              }
            },
            onError: (e) => {
              const code = Number(e?.data) || 0;
              if (cancelled) return;
              setFailed(ERROR_TEXT[code] || `YouTube could not play this video (code ${code}).`);
              cbs.current.onError?.(code);
            },
          },
        });
        playerRef.current = player;
      })
      .catch((err: Error) => {
        if (!cancelled) setFailed(err.message);
      });

    return () => {
      cancelled = true;
      if (timePoll !== undefined) window.clearInterval(timePoll);
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* player already gone */
      }
      playerRef.current = null;
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
    // Re-creating on `autoplay` changes would reload the video mid-song.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, origin]);

  const handle: PlayerHandle = useMemo(
    () => ({
      ...EMPTY_HANDLE,
      play: () => playerRef.current?.playVideo?.(),
      pause: () => playerRef.current?.pauseVideo?.(),
      toggle: () => {
        const p = playerRef.current;
        if (!p) return;
        try {
          const state = p.getPlayerState?.();
          if (state === 1) p.pauseVideo();
          else p.playVideo();
        } catch {
          p.playVideo();
        }
      },
      seek: (seconds: number) => playerRef.current?.seekTo?.(Math.max(0, seconds), true),
      currentTime: () => playerRef.current?.getCurrentTime?.() ?? 0,
      duration: () => playerRef.current?.getDuration?.() ?? 0,
      isPlaying: () => {
        try {
          return playerRef.current?.getPlayerState?.() === 1;
        } catch {
          return false;
        }
      },
    }),
    [],
  );

  const attachHandle = useCallback(
    (node: PlayerHandle | null) => {
      if (handleRef) handleRef.current = node;
    },
    [handleRef],
  );

  useEffect(() => {
    attachHandle(handle);
    return () => attachHandle(null);
  }, [attachHandle, handle]);

  return (
    <div className={`relative w-full h-full bg-black ${className || ""}`}>
      <div ref={hostRef} className="absolute inset-0" data-yt-loaded={loadedId} />
      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/95 px-4 text-center">
          <i className="fas fa-triangle-exclamation text-amber-400 text-lg" />
          <p className="text-[11px] font-bold text-amber-200 leading-snug">{failed}</p>
          <p className="text-[10px] text-slate-400">{unavailableLabel}</p>
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] font-black uppercase tracking-widest text-white bg-rose-600 hover:bg-rose-500 px-3 py-1.5 rounded-full"
          >
            <i className="fas fa-up-right-from-square mr-1" /> Open on YouTube
          </a>
        </div>
      )}
    </div>
  );
};

export default YouTubeStage;
