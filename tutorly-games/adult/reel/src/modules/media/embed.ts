/**
 * Playback for sources that live on someone else's player.
 *
 * YouTube, Dailymotion and Vimeo do not hand out video files — they hand out an
 * *official embed*, and the licence they grant covers playing it inside that embed
 * and nothing else. So an embed source is carried by an `<iframe>` pointed at the
 * platform's own player, driven through the platform's own API, instead of by the
 * `<video>` element and Shaka. That keeps every source in the catalog authorized:
 * the platform decides what plays, counts the view, and keeps its own controls.
 *
 * All three platforms are integrated through their documented interfaces:
 *
 *   YouTube     — the official IFrame Player API (`www.youtube.com/iframe_api`),
 *                 loaded once and reused. Gives playVideo/pauseVideo/seekTo and
 *                 getCurrentTime directly.
 *   Dailymotion — the documented postMessage Player API (`?api=postMessage`), which
 *                 needs no third-party script at all.
 *   Vimeo       — the documented postMessage API (`player.vimeo.com`), likewise
 *                 script-free.
 *
 * The controller exposes one small interface regardless of platform, so the rest of
 * the player (store, transcript, watch party) never learns which one is in play.
 */

export type EmbedPlatform = "youtube" | "dailymotion" | "vimeo";

export type EmbedHandle = {
  platform: EmbedPlatform;
  /** The platform's own id for the video. */
  videoId: string;
};

export type EmbedCallbacks = {
  onTime: (seconds: number, duration: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onEnded: () => void;
  onBuffering: (buffering: boolean) => void;
  onReady: (duration: number) => void;
  onError: (message: string) => void;
  /**
   * The platform never answered the playback API, so the picture plays but position,
   * duration and commands stay unavailable. Only Dailymotion's API needs a whitelisted
   * embedding domain, so this is expected there and never fires for a working source.
   */
  onSilentPlatform?: (message: string) => void;
};

/* ───────────────────────────── URL handling ───────────────────────────── */

const YOUTUBE_ID = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/;
const DAILYMOTION_ID = /dailymotion\.com\/(?:embed\/)?video\/([A-Za-z0-9]+)/;
const DAILYMOTION_ID_SHORT = /dai\.ly\/([A-Za-z0-9]+)/;
const VIMEO_ID = /vimeo\.com\/(?:video\/)?(\d+)/;

/** Which platform a URL belongs to, if any. */
export function platformOf(url: string): EmbedPlatform | null {
  if (YOUTUBE_ID.test(url) || /youtube\.com\/embed\//.test(url)) return "youtube";
  if (DAILYMOTION_ID.test(url) || DAILYMOTION_ID_SHORT.test(url)) return "dailymotion";
  if (VIMEO_ID.test(url)) return "vimeo";
  return null;
}

/** The platform + video id behind any of its URL shapes (watch page or embed). */
export function parseEmbedUrl(url: string): EmbedHandle | null {
  const youtube = url.match(YOUTUBE_ID);
  if (youtube) return { platform: "youtube", videoId: youtube[1] };
  const dailymotion = url.match(DAILYMOTION_ID) ?? url.match(DAILYMOTION_ID_SHORT);
  if (dailymotion) return { platform: "dailymotion", videoId: dailymotion[1] };
  const vimeo = url.match(VIMEO_ID);
  if (vimeo) return { platform: "vimeo", videoId: vimeo[1] };
  return null;
}

/**
 * The official embed URL, with the flags each API needs.
 *
 * `origin` is the one thing that must be right: without it YouTube and Dailymotion
 * ignore every message we post (YouTube answers with an origin error and Dailymotion
 * silently drops the command), which is why it is required rather than optional.
 */
export function embedUrlFor(handle: EmbedHandle, origin: string, opts: { start?: number; autoplay?: boolean } = {}): string {
  const start = Math.max(0, Math.floor(opts.start ?? 0));
  const autoplay = opts.autoplay ? 1 : 0;
  const params = new URLSearchParams();
  if (handle.platform === "youtube") {
    params.set("enablejsapi", "1");
    params.set("origin", origin);
    if (start) params.set("start", String(start));
    params.set("autoplay", String(autoplay));
    params.set("rel", "0");
    params.set("modestbranding", "1");
    params.set("playsinline", "1");
    params.set("cc_load_policy", "0");
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(handle.videoId)}?${params}`;
  }
  if (handle.platform === "dailymotion") {
    params.set("api", "postMessage");
    params.set("origin", origin);
    if (start) params.set("start", String(start));
    params.set("autoplay", String(autoplay));
    params.set("queue-enable", "false");
    return `https://www.dailymotion.com/embed/video/${encodeURIComponent(handle.videoId)}?${params}`;
  }
  params.set("api", "1");
  params.set("player_id", origin);
  if (start) params.set("t", `${start}s`);
  params.set("autoplay", String(autoplay));
  params.set("dnt", "1");
  return `https://player.vimeo.com/video/${encodeURIComponent(handle.videoId)}?${params}`;
}

/* ─────────────────────── the YouTube IFrame API loader ─────────────────────── */

type YTPlayerLike = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  setPlaybackRate: (rate: number) => void;
  destroy: () => void;
};

type YTNamespace = {
  Player: new (
    element: HTMLElement | string,
    options: {
      videoId?: string;
      host?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: { target: YTPlayerLike }) => void;
        onStateChange?: (event: { data: number; target: YTPlayerLike }) => void;
        onError?: (event: { data: number }) => void;
      };
    },
  ) => YTPlayerLike;
  PlayerState: { UNSTARTED: number; ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytLoader: Promise<YTNamespace> | null = null;

/**
 * Loads the official IFrame API exactly once per page.
 *
 * The script signals readiness by calling a *global* callback, so the single-flight
 * promise is what stops two concurrent players from overwriting each other's
 * handler and leaving one of them hanging forever.
 */
function loadYouTubeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("YouTube playback needs a browser"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytLoader) return ytLoader;

  ytLoader = new Promise<YTNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("The YouTube player API loaded without a Player constructor"));
    };
    const existing = document.querySelector<HTMLScriptElement>('script[data-tutoflix-yt="1"]');
    if (existing) return; // its onload will fire the global callback
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.dataset.tutoflixYt = "1";
    script.onerror = () => {
      ytLoader = null;
      reject(new Error("Could not load the YouTube player API"));
    };
    document.head.appendChild(script);
  });
  return ytLoader;
}

/* ───────────────────────────── the controller ───────────────────────────── */

const YT_ERRORS: Record<number, string> = {
  2: "The video id was rejected by YouTube",
  5: "This video cannot play in an embedded player",
  100: "The video was removed or is private",
  101: "The owner does not allow this video to be embedded",
  150: "The owner does not allow this video to be embedded",
};

/** The event names that mean the platform is genuinely driving our timeline. */
const PLAYBACK_EVENTS = new Set([
  "timeupdate",
  "infoDelivery",
  "seeked",
  "play",
  "playing",
  "video_start",
  "pause",
  "paused",
  "ended",
  "finish",
  "buffering",
  "bufferstart",
  "waiting",
  "canplay",
  "bufferend",
  "durationchange",
  "loaded",
]);

export interface EmbedControllerLike {
  attach(iframe: HTMLIFrameElement, handle: EmbedHandle, callbacks: EmbedCallbacks): Promise<void>;
  handshake(): void;
  detach(): void;
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  setRate(rate: number): void;
  readonly duration: number;
  readonly currentTime: number;
}

export class EmbedController implements EmbedControllerLike {
  private iframe: HTMLIFrameElement | null = null;
  private handle: EmbedHandle | null = null;
  private callbacks: EmbedCallbacks | null = null;
  private yt: YTPlayerLike | null = null;
  private ytHost: HTMLDivElement | null = null;
  private onMessage: ((event: MessageEvent) => void) | null = null;
  private onFrameLoad: (() => void) | null = null;
  /** Bounded re-handshakes while the platform's player boots (see `handshake`). */
  private handshakeTimers: number[] = [];
  /** False until the platform answers anything — see `onSilentPlatform`. */
  private heardFrom = false;
  private ready = false;
  private playRequested = false;
  /** Last position pushed by the platform, for Dailymotion/Vimeo which report it. */
  private lastTime = 0;
  private lastDuration = 0;

  get duration() {
    return this.lastDuration;
  }
  get currentTime() {
    return this.lastTime;
  }
  get isReady() {
    return this.ready;
  }

  /**
   * Binds to the iframe the component rendered.
   *
   * YouTube is special-cased: the IFrame API *replaces* the element it is given, so
   * the controller mounts its own host div and lets the API create the iframe. That
   * is the documented usage and the only way to get the API's methods.
   */
  async attach(iframe: HTMLIFrameElement, handle: EmbedHandle, callbacks: EmbedCallbacks): Promise<void> {
    this.detach();
    this.handle = handle;
    this.callbacks = callbacks;

    if (handle.platform === "youtube") {
      const api = await loadYouTubeApi().catch((err: Error) => {
        callbacks.onError(err.message);
        return null;
      });
      if (!api) return;
      // The API replaces the host element with its own iframe, so the host must sit
      // where the component's iframe was. Its size is what the player inherits.
      const host = document.createElement("div");
      host.className = iframe.className;
      host.style.width = "100%";
      host.style.height = "100%";
      iframe.replaceWith(host);
      this.ytHost = host;
      this.yt = new api.Player(host, {
        videoId: handle.videoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          origin: window.location.origin,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          autoplay: 0,
        },
        events: {
          onReady: (event) => {
            this.ready = true;
            // The official API is answering, so the "silent platform" warning must never
            // apply to a YouTube source.
            this.heardFrom = true;
            // The API hands back the underlying iframe; the wrapper below keeps the
            // component's ref usable for fullscreen and sizing.
            this.iframe = host.querySelector("iframe") ?? this.iframe;
            this.lastDuration = event.target.getDuration() || 0;
            callbacks.onReady(this.lastDuration);
            // Replay the preferences and the resume position now that the API can
            // accept them (the same reason the other platforms get a handshake).
            if (this.wanted.volume !== null) this.setVolume(this.wanted.volume);
            if (this.wanted.muted !== null) this.setMuted(this.wanted.muted);
            if (this.wanted.rate !== null) this.setRate(this.wanted.rate);
            if (this.wanted.start !== null) {
              this.seek(this.wanted.start);
              this.wanted.start = null;
              if (this.playRequested) this.play();
            }
          },
          onStateChange: (event) => {
            const state = api.PlayerState;
            this.lastTime = event.target.getCurrentTime() || 0;
            this.lastDuration = event.target.getDuration() || this.lastDuration;
            callbacks.onTime(this.lastTime, this.lastDuration);
            if (event.data === state.PLAYING) {
              callbacks.onBuffering(false);
              callbacks.onPlay();
            } else if (event.data === state.PAUSED) {
              callbacks.onPause();
            } else if (event.data === state.ENDED) {
              callbacks.onEnded();
            } else if (event.data === state.BUFFERING) {
              callbacks.onBuffering(true);
            }
          },
          onError: (event) => callbacks.onError(YT_ERRORS[event.data] ?? `YouTube reported playback error ${event.data}`),
        },
      });
      return;
    }

    // Dailymotion and Vimeo talk postMessage directly, no script needed.
    this.iframe = iframe;
    this.onMessage = (event: MessageEvent) => this.handleMessage(event);
    window.addEventListener("message", this.onMessage);
    this.sendTo = (payload: unknown) => iframe.contentWindow?.postMessage(JSON.stringify(payload), "*");

    // A platform only accepts commands when its own player has booted, and the embed
    // URL is what tells it to listen at all: Dailymotion needs `api=postMessage` plus
    // `origin`, YouTube needs `enablejsapi=1`, Vimeo needs `api=1`. The catalogue
    // stores the plain share URL (sometimes a link someone pasted), so the transport
    // is normalised here rather than trusted — without it the iframe loaded a player
    // that answered nothing, and the timeline sat at 0:00 while the learner pressed
    // play into the void.
    const desired = embedUrlFor(handle, window.location.origin);
    if (iframe.src !== desired) iframe.src = desired;

    // It also boots *after* navigating (Dailymotion redirects to geo.dailymotion.com),
    // so the first handshake is always early. Re-send on every load and keep retrying
    // briefly, since a player that misses the registration never reports time again.
    this.onFrameLoad = () => this.handshake();
    iframe.addEventListener("load", this.onFrameLoad);
    this.scheduleHandshakes();
  }

  /** Sends the handshake a few times over the first seconds, then stops. */
  private scheduleHandshakes(): void {
    for (const delay of [250, 800, 1600, 2800, 4500]) {
      this.handshakeTimers.push(window.setTimeout(() => this.handshake(), delay));
    }
    // Some platforms never answer. Dailymotion's JavaScript API requires the embedding
    // domain to be whitelisted in a publisher account: without that, the picture plays
    // but every command and every event is dropped on the floor, and the timeline sits
    // at 0:00 forever. Say so instead of pretending to be in sync.
    this.handshakeTimers.push(
      window.setTimeout(() => {
        if (this.heardFrom || !this.callbacks) return;
        this.callbacks.onSilentPlatform?.(
          `${this.handle?.platform === "dailymotion" ? "Dailymotion" : "This player"} did not answer the playback API (it needs a whitelisted embedding domain), so the video plays with its own controls and the timeline stays unsynced. A YouTube, Vimeo or direct-file source syncs fully.`,
        );
      }, 6500),
    );
  }

  private pollTimer = 0;
  private sendTo: ((payload: unknown) => void) | null = null;

  /**
   * (Re)sends the listener registration and the learner's preferences.
   *
   * Both platforms ignore messages posted before their player has booted, and the
   * iframe navigates after React mounts it, so this runs again on the iframe's
   * `load` event. Without it the very first `play` was silently dropped and the
   * video looked broken until the learner pressed play a second time.
   */
  handshake(): void {
    const handle = this.handle;
    const send = this.sendTo;
    if (!handle || !send || handle.platform === "youtube") return;

    if (handle.platform === "vimeo") {
      for (const name of ["play", "pause", "ended", "timeupdate", "seeked", "bufferstart", "bufferend", "loaded"]) {
        send({ method: "addEventListener", value: name });
      }
      send({ method: "getDuration" });
    } else {
      // Dailymotion's documented handshake for receiving events.
      send({ command: "addEventListener", params: ["timeupdate", "play", "pause", "ended", "durationchange", "seeked", "video_start", "start", "buffering", "canplay"] });
      send({ command: "getDuration" });
    }

    if (this.wanted.volume !== null) this.setVolume(this.wanted.volume);
    if (this.wanted.muted !== null) this.setMuted(this.wanted.muted);
    if (this.wanted.rate !== null) this.setRate(this.wanted.rate);
    if (this.wanted.start !== null) {
      this.seek(this.wanted.start);
      this.wanted.start = null;
      if (this.playRequested) this.play();
    }

    // Dailymotion does not emit a ready event reliably; poll briefly for duration.
    if (this.pollTimer) window.clearInterval(this.pollTimer);
    let attempts = 0;
    this.pollTimer = window.setInterval(() => {
      attempts++;
      if (this.ready || attempts > 20) {
        window.clearInterval(this.pollTimer);
        this.pollTimer = 0;
        return;
      }
      if (handle.platform === "dailymotion") send({ command: "getDuration" });
    }, 350);
  }

  /**
   * Preferences applied before the platform was ready are held here and replayed by
   * `handshake()`, because a message sent to a player that has not booted is lost.
   */
  private wanted: { volume: number | null; muted: boolean | null; rate: number | null; start: number | null } = {
    volume: null,
    muted: null,
    rate: null,
    start: null,
  };

  /** Records the position a newly attached embed should open at. */
  setStartAt(seconds: number): void {
    this.wanted.start = seconds > 0 ? seconds : null;
  }

  /** Preferences to apply once the platform player boots. */
  prime(patch: { volume?: number; muted?: boolean; rate?: number }): void {
    if (patch.volume !== undefined) this.wanted.volume = patch.volume;
    if (patch.muted !== undefined) this.wanted.muted = patch.muted;
    if (patch.rate !== undefined) this.wanted.rate = patch.rate;
  }

  private handleMessage(event: MessageEvent): void {
    const handle = this.handle;
    const callbacks = this.callbacks;
    if (!handle || !callbacks || !this.iframe) return;
    if (event.source !== this.iframe.contentWindow) return;
    if (!this.youtubeHostMatches(event.origin) && !this.platformHostMatches(event.origin, handle.platform)) return;

    let data: Record<string, unknown> | null = null;
    try {
      data = typeof event.data === "string" ? (JSON.parse(event.data) as Record<string, unknown>) : (event.data as Record<string, unknown>);
    } catch {
      return; // some platforms post plain text banners
    }
    if (!data || typeof data !== "object") return;

    const name = String(data.event ?? data.method ?? "");
    const payload = (data.info ?? data.data ?? {}) as Record<string, unknown>;

    // Only a *playback* report counts as an answer: an embed that posts banners and
    // config but never reports time is just as unusable as one that is silent, and a
    // "did we hear anything at all" test called it healthy while the timeline froze.
    if (PLAYBACK_EVENTS.has(name)) this.heardFrom = true;

    const readNumber = (key: string): number | null => {
      const raw = (data as Record<string, unknown>)[key] ?? payload[key];
      const value = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN;
      return Number.isFinite(value) ? value : null;
    };

    const duration = readNumber("duration");
    if (duration && duration > 0) {
      this.heardFrom = true;
      this.lastDuration = duration;
      if (!this.ready) {
        this.ready = true;
        callbacks.onReady(duration);
      }
    }
    const time = readNumber("time") ?? readNumber("currentTime") ?? readNumber("seconds");
    if (time !== null && time >= 0 && (name === "timeupdate" || name === "infoDelivery" || name === "seeked")) {
      this.heardFrom = true;
      this.lastTime = time;
      callbacks.onTime(time, this.lastDuration);
    }

    switch (name) {
      case "play":
      case "playing":
      case "video_start":
        callbacks.onBuffering(false);
        callbacks.onPlay();
        break;
      case "pause":
      case "paused":
        callbacks.onPause();
        break;
      case "ended":
      case "finish":
        callbacks.onEnded();
        break;
      case "buffering":
      case "bufferstart":
      case "waiting":
        callbacks.onBuffering(true);
        break;
      case "canplay":
      case "bufferend":
        callbacks.onBuffering(false);
        break;
      default:
        break;
    }
  }

  private youtubeHostMatches(origin: string): boolean {
    return this.handle?.platform === "youtube" && /(^|\.)youtube(-nocookie)?\.com$/.test(new URL(origin, "https://example.invalid").hostname);
  }
  private platformHostMatches(origin: string, platform: EmbedPlatform): boolean {
    let host = "";
    try {
      host = new URL(origin).hostname;
    } catch {
      return false;
    }
    if (platform === "dailymotion") return /(^|\.)dailymotion\.com$/.test(host);
    if (platform === "vimeo") return /(^|\.)vimeo\.com$/.test(host);
    return false;
  }

  play(): void {
    this.playRequested = true;
    if (this.yt) {
      this.yt.playVideo();
      return;
    }
    if (this.handle?.platform === "vimeo") this.sendTo?.({ method: "play" });
    else this.sendTo?.({ command: "play" });
  }
  pause(): void {
    if (this.yt) {
      this.yt.pauseVideo();
      return;
    }
    this.playRequested = false;
    if (this.handle?.platform === "vimeo") this.sendTo?.({ method: "pause" });
    else this.sendTo?.({ command: "pause" });
  }
  seek(seconds: number): void {
    const at = Math.max(0, seconds);
    this.lastTime = at;
    if (this.yt) {
      this.yt.seekTo(at, true);
      return;
    }
    if (this.handle?.platform === "vimeo") this.sendTo?.({ method: "setCurrentTime", value: at });
    else this.sendTo?.({ command: "seek", parameters: [at] });
  }
  setVolume(volume: number): void {
    const v = Math.min(1, Math.max(0, volume));
    if (this.yt) {
      this.yt.setVolume(v * 100);
      return;
    }
    if (this.handle?.platform === "vimeo") this.sendTo?.({ method: "setVolume", value: v });
    else this.sendTo?.({ command: "volume", parameters: [v] });
  }
  setMuted(muted: boolean): void {
    if (this.yt) {
      if (muted) this.yt.mute();
      else this.yt.unMute();
      return;
    }
    if (this.handle?.platform === "vimeo") this.sendTo?.({ method: "setVolume", value: muted ? 0 : 1 });
    else this.sendTo?.({ command: muted ? "mute" : "unmute", parameters: [] });
  }
  /** Every platform caps this; 0.5–2 is the range all three actually accept. */
  setRate(rate: number): void {
    const r = Math.min(2, Math.max(0.5, rate));
    if (this.yt) {
      this.yt.setPlaybackRate(r);
      return;
    }
    if (this.handle?.platform === "vimeo") this.sendTo?.({ method: "setPlaybackRate", value: r });
    else this.sendTo?.({ command: "playbackRate", parameters: [r] });
  }
  /** Current position, asked of the platform rather than cached. */
  readTime(): number {
    if (this.yt) {
      try {
        this.lastTime = this.yt.getCurrentTime() || this.lastTime;
      } catch {
        /* the player may be mid-teardown */
      }
    }
    return this.lastTime;
  }

  detach(): void {
    if (this.onMessage) window.removeEventListener("message", this.onMessage);
    if (this.pollTimer) window.clearInterval(this.pollTimer);
    this.pollTimer = 0;
    if (this.onFrameLoad && this.iframe) this.iframe.removeEventListener("load", this.onFrameLoad);
    for (const timer of this.handshakeTimers) window.clearTimeout(timer);
    this.handshakeTimers = [];
    this.onFrameLoad = null;
    this.onMessage = null;
    this.sendTo = null;
    try {
      this.yt?.destroy();
    } catch {
      /* destroying a torn-down player is not an error */
    }
    this.yt = null;
    this.ytHost = null;
    this.iframe = null;
    this.handle = null;
    this.callbacks = null;
    this.ready = false;
    this.playRequested = false;
    this.lastTime = 0;
    this.lastDuration = 0;
    this.wanted = { volume: null, muted: null, rate: null, start: null };
    this.heardFrom = false;
  }

  /** The element to make fullscreen — the API's own iframe once it exists. */
  get element(): HTMLElement | null {
    return this.ytHost ?? this.iframe;
  }
}
