/**
 * The structured event bus that keeps the three subsystems decoupled.
 *
 * Media Platform, Lesson Engine and AI Engine never import each other's
 * components: they publish here and subscribe here. Payloads are declared in
 * `FlixEventMap`, so adding an event is a compile-time change — a typo in an
 * event name or a wrong payload shape fails the build instead of silently doing
 * nothing at 3am before a class.
 */

export interface MediaReadyPayload {
  sourceId: string;
  engine: "shaka" | "hlsjs" | "native";
  duration: number;
  qualities: number;
  audioTracks: number;
  textTracks: number;
}

export interface MediaQualityPayload {
  id: string;
  label: string;
  bitrate?: number;
}

export interface MediaErrorPayload {
  sourceId: string | null;
  message: string;
  fatal: boolean;
}

export interface MediaFallbackPayload {
  from: string;
  to: string;
  restoredTime: number;
}

export interface ActivityOpenPayload {
  activityId: string;
  type: string;
  timestamp: number;
  /** How the player behaved so it can be undone when the overlay closes. */
  pausedByActivity: boolean;
}

export interface ActivityAnsweredPayload {
  activityId: string;
  type: string;
  correct: boolean;
  attempts: number;
  points: number;
  unscored: boolean;
}

export interface LessonLoadedPayload {
  episodeId: string;
  activityCount: number;
  segmentCount: number;
  qualityScore: number;
}

export interface PromptCopiedPayload {
  promptId: string;
  kind: "full" | "segment" | "cue";
  characters: number;
  tokensEstimate: number;
}

export interface PartyPayload {
  roomId: string;
  mode: "host" | "follow" | "independent";
  detail: string;
}

export interface FlixEventMap {
  "media:ready": MediaReadyPayload;
  "media:quality": MediaQualityPayload;
  "media:error": MediaErrorPayload;
  "media:fallback": MediaFallbackPayload;
  "media:source": { sourceId: string; url: string; kind: string };
  "lesson:loaded": LessonLoadedPayload;
  "lesson:activity-open": ActivityOpenPayload;
  "lesson:activity-answered": ActivityAnsweredPayload;
  "lesson:segment": { index: number; title: string; start: number; end: number };
  "lesson:badge": { badgeId: string; name: string };
  "maker:prompt-copied": PromptCopiedPayload;
  "maker:lesson-parsed": { ok: boolean; errors: number; warnings: number; activities: number };
  "party:joined": PartyPayload;
  "party:left": { roomId: string };
  "party:drift": { drift: number; action: string; detail: string };
  "party:sync": { applied: string; detail: string };
}

type Handler<K extends keyof FlixEventMap> = (payload: FlixEventMap[K]) => void;

class EventBus {
  private handlers = new Map<string, Set<(payload: unknown) => void>>();
  /** Last payload per event, so a late subscriber still sees the current state. */
  private last = new Map<string, unknown>();

  on<K extends keyof FlixEventMap>(type: K, handler: Handler<K>): () => void {
    const set = this.handlers.get(type) ?? new Set();
    set.add(handler as (payload: unknown) => void);
    this.handlers.set(type, set);
    return () => this.off(type, handler);
  }

  off<K extends keyof FlixEventMap>(type: K, handler: Handler<K>): void {
    this.handlers.get(type)?.delete(handler as (payload: unknown) => void);
  }

  emit<K extends keyof FlixEventMap>(type: K, payload: FlixEventMap[K]): void {
    this.last.set(type, payload);
    const set = this.handlers.get(type);
    if (!set) return;
    for (const handler of [...set]) {
      try {
        handler(payload);
      } catch (error) {
        // One broken listener must never take the player down mid-lesson.
        console.warn(`[tutoflix] listener for "${String(type)}" threw`, error);
      }
    }
  }

  lastOf<K extends keyof FlixEventMap>(type: K): FlixEventMap[K] | undefined {
    return this.last.get(type) as FlixEventMap[K] | undefined;
  }
}

export const events = new EventBus();

/** Human-readable log line for any event — the "Engine activity" panel shows these. */
export function describeEvent(type: keyof FlixEventMap, payload: unknown): string {
  const data = (payload ?? {}) as Record<string, unknown>;
  switch (type) {
    case "media:ready":
      return `✅ ${data.engine} ready — ${Number(data.duration ?? 0).toFixed(1)}s · ${data.qualities} qualities · ${data.audioTracks} audio · ${data.textTracks} text`;
    case "media:quality":
      return `🎚 quality → ${data.label}${data.bitrate ? ` (${Math.round(Number(data.bitrate) / 1000)} kbps)` : ""}`;
    case "media:error":
      return `⚠️ ${data.message}`;
    case "media:fallback":
      return `↩️ fell back to ${data.to} at ${Number(data.restoredTime ?? 0).toFixed(1)}s`;
    case "media:source":
      return `🎬 source ${data.kind} · ${data.sourceId}`;
    case "lesson:loaded":
      return `📚 lesson loaded — ${data.activityCount} activities / ${data.segmentCount} segments (quality ${data.qualityScore})`;
    case "lesson:activity-open":
      return `▶️ activity ${data.type} at ${Number(data.timestamp ?? 0).toFixed(1)}s`;
    case "lesson:activity-answered":
      return data.unscored
        ? `📝 ${data.type} completed`
        : `${data.correct ? "✅" : "❌"} ${data.type} · ${data.correct ? `+${data.points} XP` : "try again"}`;
    case "lesson:segment":
      return `🎞 segment ${Number(data.index ?? 0) + 1} — ${data.title}`;
    case "lesson:badge":
      return `🏅 badge unlocked: ${data.name}`;
    case "maker:prompt-copied":
      return `📋 copied the ${data.kind} prompt (${data.characters} chars ≈ ${data.tokensEstimate} tokens)`;
    case "maker:lesson-parsed":
      return data.ok
        ? `📥 lesson JSON accepted — ${data.activities} activities, ${data.warnings} warnings`
        : `⛔ lesson JSON rejected — ${data.errors} problems`;
    case "party:joined":
      return `👥 room ${data.roomId} · ${data.mode} · ${data.detail}`;
    case "party:left":
      return "👋 left the room";
    case "party:drift":
      return `🎯 drift ${Number(data.drift ?? 0).toFixed(2)}s — ${data.detail}`;
    case "party:sync":
      return `🔄 ${data.applied}: ${data.detail}`;
    default:
      return String(type);
  }
}
