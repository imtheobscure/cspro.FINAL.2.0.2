import { bus, store, uid } from "../state/store";
import type { ChatAttachment, ChatMessage, ChatReplyPreview, NPC } from "../state/types";
import { sanitizeForSpeech } from "../lib/speech";
import { addMessage } from "./bus";

export { addMessage };

export interface NewMessageInput {
  html?: string;
  attachments?: ChatAttachment[];
  authorName: string;
  authorAvatar?: string;
  npcId?: string;
  system?: boolean;
  outbound?: boolean;
  replyTo?: ChatReplyPreview | null;
  speak?: ChatMessage["speak"];
}

/** Append a message, wire its reply preview, and tell the room a bubble arrived. */
export function postMessage(input: NewMessageInput): ChatMessage {
  const msg: ChatMessage = {
    id: uid("m_"),
    html: input.html ?? "",
    attachments: input.attachments?.length ? input.attachments : undefined,
    authorName: input.authorName,
    authorAvatar: input.authorAvatar,
    npcId: input.npcId,
    system: input.system,
    outbound: input.outbound,
    replyTo: input.replyTo ?? null,
    speak: input.speak,
    status: input.outbound ? "sent" : undefined,
    reactions: [],
    ts: Date.now(),
  };
  store.set((s) => {
    s.messages = [...s.messages, msg];
    return { ...s };
  });
  bus.emit("chat-msg-added", { id: msg.id, npcId: msg.npcId });
  return msg;
}

export function updateMessage(id: string, patch: Partial<ChatMessage>) {
  store.set((s) => {
    s.messages = s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m));
    return { ...s };
  });
}

export function editMessageText(id: string, html: string) {
  updateMessage(id, { html, editedTs: Date.now() });
}

export function deleteMessage(id: string) {
  updateMessage(id, { html: "", attachments: undefined, deletedTs: Date.now() });
}

export function toggleReaction(id: string, emoji: string, by: string) {
  store.set((s) => {
    s.messages = s.messages.map((m) => {
      if (m.id !== id) return m;
      const list = m.reactions ? [...m.reactions] : [];
      const at = list.findIndex((r) => r.emoji === emoji && r.by === by);
      if (at >= 0) list.splice(at, 1);
      else list.push({ emoji, by, ts: Date.now() });
      return { ...m, reactions: list };
    });
    return { ...s };
  });
}

/** Outgoing bubbles get Telegram-style ticks as the room acknowledges them. */
export function markDelivered() {
  store.set((s) => {
    let touched = false;
    s.messages = s.messages.map((m) => {
      if (m.outbound && m.status === "sent") {
        touched = true;
        return { ...m, status: "delivered" };
      }
      return m;
    });
    return touched ? { ...s } : s;
  });
}

export function markRead(by: string) {
  store.set((s) => {
    let touched = false;
    s.messages = s.messages.map((m) => {
      if (m.outbound && m.status !== "read") {
        touched = true;
        return { ...m, status: "read", seenBy: [...(m.seenBy || []), by] };
      }
      return m;
    });
    return touched ? { ...s } : s;
  });
}

export function textOf(m: ChatMessage): string {
  if (m.deletedTs) return "deleted message";
  const tmp = document.createElement("div");
  tmp.innerHTML = m.html || "";
  const text = (tmp.textContent || "").trim();
  if (text) return text;
  const kinds = (m.attachments || []).map((a) => a.kind);
  if (!kinds.length) return "";
  if (kinds.includes("voice")) {
    const voice = m.attachments?.find((a) => a.kind === "voice");
    return voice?.transcript ? `🎙 ${voice.transcript}` : "🎙 Voice message";
  }
  if (kinds.includes("sticker")) return `${m.attachments?.find((a) => a.kind === "sticker")?.emoji || "🎟"} Sticker`;
  if (kinds.includes("gif")) return "🎞 GIF";
  if (kinds.includes("image")) return `🖼 Photo${m.attachments?.find((a) => a.kind === "image")?.caption ? `: ${m.attachments.find((a) => a.kind === "image")!.caption}` : ""}`;
  if (kinds.includes("youtube")) return `▶️ ${m.attachments?.find((a) => a.kind === "youtube")?.title || "YouTube video"}`;
  if (kinds.includes("soundcloud")) return `🎧 ${m.attachments?.find((a) => a.kind === "soundcloud")?.title || "SoundCloud track"}`;
  if (kinds.includes("site")) return `🌐 ${m.attachments?.find((a) => a.kind === "site")?.provider || "Website"}`;
  if (kinds.includes("video")) return "🎬 Video";
  if (kinds.includes("audio")) return "🎵 Audio";
  return "📎 Attachment";
}

export function replyPreviewOf(m: ChatMessage): ChatReplyPreview {
  const text = textOf(m);
  return { id: m.id, author: m.authorName, text: text.length > 120 ? `${text.slice(0, 117)}…` : text };
}

/**
 * A character speaking must show up in the chat — but only once.
 *
 * The tutor tabs already post a bubble when they post and speak together, so
 * when a `speak-request` arrives we look at the very recent tail of the log: if
 * that same character just said that same thing, the bubble is already there and
 * a second copy would be noise.
 */
export function hasRecentSpeech(npcId: string, text: string, withinMs = 2500): boolean {
  const clean = normalize(text);
  const now = Date.now();
  for (let i = store.get().messages.length - 1; i >= 0; i--) {
    const m = store.get().messages[i];
    if (now - m.ts > withinMs) break;
    if (m.npcId !== npcId) continue;
    if (normalize(textOf(m)) === clean) return true;
    if (m.speak?.text && normalize(m.speak.text) === clean) return true;
  }
  return false;
}

/**
 * Post the bubble for a character who is speaking right now, so the room always
 * sees *who* is talking next to what they said.
 */
export function postSpeechBubble(npc: NPC, text: string, emoji?: string | null) {
  const spoken = sanitizeForSpeech(text).trim() || text.trim();
  if (!spoken) return;
  const html = emoji ? `<span>${emoji} </span>${escapeHtml(spoken)}` : escapeHtml(spoken);
  postMessage({
    html,
    authorName: npc.name,
    authorAvatar: npc.avatar,
    npcId: npc.id,
    speak: { npcId: npc.id, text: spoken, voiceURI: npc.voiceURI, rate: npc.speechSpeed, pitch: npc.pitch },
  });
}

export function normalize(s: string): string {
  return (s || "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function escapeHtml(s: string): string {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML.replace(/\n/g, "<br/>");
}

export type DaySeparator = { kind: "day"; key: string; label: string } | { kind: "msg"; key: string; message: ChatMessage };

export function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long" });
}

/** Splits the log into day separators + messages, and marks grouped runs. */
export function buildTimeline(messages: ChatMessage[]): { rows: DaySeparator[]; grouped: Set<string> } {
  const rows: DaySeparator[] = [];
  const grouped = new Set<string>();
  let lastDay = "";
  let prev: ChatMessage | null = null;
  for (const m of messages) {
    const day = new Date(m.ts).toDateString();
    if (day !== lastDay) {
      rows.push({ kind: "day", key: `day-${day}`, label: dayLabel(m.ts) });
      lastDay = day;
      prev = null;
    }
    rows.push({ kind: "msg", key: m.id, message: m });
    if (prev && prev.authorName === m.authorName && prev.npcId === m.npcId && m.ts - prev.ts < 4 * 60 * 1000) {
      grouped.add(m.id);
    }
    prev = m;
  }
  return { rows, grouped };
}
