/** Normalized player events shared by the media platform, lesson engine and watch party. */
export type PlayerEventMap = {
  PLAY: { time: number };
  PAUSE: { time: number };
  SEEK: { from: number; to: number; source: "user" | "sync" | "engine" };
  TIME_UPDATE: { time: number };
  ENDED: { time: number };
  CUE_ENTER: { cueId: string; index: number };
  CUE_EXIT: { cueId: string; index: number };
  WORD_CLICK: { cueId: string; wordIndex: number; word: string; time: number };
  SUBTITLE_CLICK: { cueId: string; time: number };
  EPISODE_CHANGE: { episodeId: string };
  SOURCE_CHANGE: { sourceId: string; reason: "user" | "fallback" };
  QUALITY_CHANGE: { quality: string };
  AUDIO_CHANGE: { trackId: string };
  SUBTITLE_CHANGE: { mode: string };
  CHAPTER_CHANGE: { chapterId: string | null };
  PLAYBACK_RATE_CHANGE: { rate: number };
  ACTIVITY_TRIGGER: { activityId: string; time: number };
  ACTIVITY_COMPLETE: { activityId: string; correct: boolean | null; points: number };
  LESSON_START: { lessonId: string };
  LESSON_COMPLETE: { lessonId: string };
  WATCH_PARTY_JOINED: { code: string };
  WATCH_PARTY_SYNC: { drift: number; action: "none" | "nudge" | "seek" };
  ERROR: { message: string };
};

export type PlayerEventName = keyof PlayerEventMap;
type Handler<K extends PlayerEventName> = (payload: PlayerEventMap[K]) => void;

export function createEventBus() {
  const handlers = new Map<PlayerEventName, Set<Handler<PlayerEventName>>>();
  return {
    on<K extends PlayerEventName>(name: K, fn: Handler<K>): () => void {
      if (!handlers.has(name)) handlers.set(name, new Set());
      handlers.get(name)!.add(fn as Handler<PlayerEventName>);
      return () => handlers.get(name)?.delete(fn as Handler<PlayerEventName>);
    },
    emit<K extends PlayerEventName>(name: K, payload: PlayerEventMap[K]) {
      handlers.get(name)?.forEach((fn) => {
        try {
          (fn as Handler<K>)(payload);
        } catch (err) {
          console.error(`[player-event:${name}]`, err);
        }
      });
    },
    clear() {
      handlers.clear();
    },
  };
}

export type EventBus = ReturnType<typeof createEventBus>;
