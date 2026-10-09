import { useSyncExternalStore } from "react";
import { bus } from "../state/store";
import type { ChatMessage, NPC } from "../state/types";
import { getPreferredDefaultVoiceURI, speak, stopSpeech } from "../lib/speech";
import { textOf } from "./messages";

/**
 * Read-aloud with several voices.
 *
 * A conversation in the room is a conversation between characters, so reading it
 * back must not flatten everyone into one narrator: each message is spoken with
 * the voice of whoever wrote it (their saved voice, rate and pitch), in order,
 * and the room is told who is talking so the floating photo and the speaker ring
 * follow along.
 */

let readingId: string | null = null;
let running = false;
let cancelToken = 0;
const listeners = new Set<() => void>();

function setReading(id: string | null) {
  readingId = id;
  for (const l of listeners) l();
}

export function getReadingId() {
  return readingId;
}

export function useReadingId(): string | null {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => readingId,
    () => readingId,
  );
}

export function useIsReading() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => running,
    () => running,
  );
}

/** What a bubble actually says out loud — media is described, never silent. */
export function spokenForm(m: ChatMessage): string {
  if (m.deletedTs) return "";
  const parts: string[] = [];
  const text = (() => {
    const d = document.createElement("div");
    d.innerHTML = m.html || "";
    return (d.textContent || "").trim();
  })();
  if (text) parts.push(text);
  for (const a of m.attachments || []) {
    if (a.kind === "voice" && a.transcript) parts.push(a.transcript);
    else if (a.kind === "sticker") parts.push(`${a.emoji || ""} sticker`);
    else if (a.kind === "gif") parts.push("a GIF");
    else if (a.kind === "image") parts.push(`a photo${a.caption ? `: ${a.caption}` : ""}`);
    else if (a.kind === "youtube") parts.push(`a YouTube video: ${a.title || a.url}`);
    else if (a.kind === "soundcloud") parts.push(`a SoundCloud track: ${a.title || a.url}`);
    else if (a.kind === "site") parts.push(`a website: ${a.provider || a.url}`);
    else if (a.kind === "video") parts.push("a video");
    else if (a.kind === "audio") parts.push("an audio clip");
    else if (a.kind === "file") parts.push(`a file: ${a.name || "attachment"}`);
    else if (a.kind === "link") parts.push(a.url);
  }
  return parts.join(". ").replace(/\s+/g, " ").trim();
}

/**
 * Speak one bubble with its author's voice. Resolves when it finishes.
 *
 * A character's line goes through the classroom's own `speak-request` pipeline
 * (the same one the Speak tab uses), so the floating photo, the speaker ring and
 * pause/resume all keep working. A line with no character behind it — the
 * tutor's own message, a system note — is spoken directly in the default voice.
 */
export function speakMessage(m: ChatMessage, npcs: NPC[]): Promise<void> {
  const text = spokenForm(m);
  if (!text) return Promise.resolve();
  const npc = npcs.find((n) => n.id === m.npcId) || npcs.find((n) => n.name === m.authorName);
  const safety = Math.min(45000, 1800 + text.length * 95);

  if (npc) {
    return new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        off();
        resolve();
      };
      const off = bus.on((ev: any) => {
        if (ev.type === "speech-ended" && ev.payload?.npcId === npc.id) finish();
      });
      // `replay: true` tells the classroom this line is already in the chat — it
      // must be spoken, not posted again. Every call from this module is a replay
      // of an existing bubble (read-aloud, a single bubble, a voice note's
      // transcript), so without the flag each replay added a duplicate bubble.
      bus.emit("speak-request", { npcId: npc.id, text, replay: true });
      setTimeout(finish, safety);
    });
  }

  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    speak({ text, voiceURI: getPreferredDefaultVoiceURI(), rate: 1, pitch: 1, onEnd: finish });
    setTimeout(finish, safety);
  });
}

export async function readAloud(messages: ChatMessage[], npcs: NPC[]) {
  if (running) {
    stopReadAloud();
    await new Promise((r) => setTimeout(r, 120));
  }
  running = true;
  const token = ++cancelToken;
  for (const m of messages) {
    if (token !== cancelToken) break;
    const text = spokenForm(m);
    if (!text) continue;
    setReading(m.id);
    await speakMessage(m, npcs);
    if (token !== cancelToken) break;
    await new Promise((r) => setTimeout(r, 220));
  }
  setReading(null);
  running = false;
  bus.emit("speak-stop");
}

/** Read one bubble, and read it again on a second tap (tap = toggle). */
export async function readOne(m: ChatMessage, npcs: NPC[]) {
  if (readingId === m.id) {
    stopReadAloud();
    return;
  }
  stopSpeech();
  running = true;
  const token = ++cancelToken;
  setReading(m.id);
  await speakMessage(m, npcs);
  if (token === cancelToken) {
    setReading(null);
    running = false;
  }
}

export function stopReadAloud() {
  cancelToken++;
  stopSpeech();
  running = false;
  setReading(null);
}

export function previewText(m: ChatMessage) {
  return textOf(m);
}
