import { bus, store } from "../state/store";
import type { NPC } from "../state/types";
import { hasRecentSpeech, postSpeechBubble } from "./messages";

/**
 * The one way to make a character speak.
 *
 * It does two things that must always happen together:
 *   1. put the character's bubble (with their round photo) in the chat, and
 *   2. ask the room to say it out loud.
 *
 * Both used to be split — the tutor's window emitted the speech and only the
 * classroom window posted the bubble — which meant speaking from Tutor Control
 * with the classroom closed showed the voice but left no trace in the chat, and
 * speaking from the classroom showed it twice. Posting here, at the point of
 * intent, makes the chat correct in either window; the classroom still listens
 * for the same event to drive the floating photo and the speaker ring, and the
 * de-duplication in `hasRecentSpeech` keeps one line to one bubble.
 */
export function requestSpeech(npcId: string, text: string, emoji?: string | null): NPC | null {
  const npc = store.get().npcs.find((n) => n.id === npcId);
  if (!npc) return null;
  const spoken = (text || "").trim();
  if (!spoken) return null;
  if (!hasRecentSpeech(npcId, spoken)) postSpeechBubble(npc, spoken, emoji);
  bus.emit("speak-request", { npcId, text: spoken, emoji: emoji ?? null });
  return npc;
}
