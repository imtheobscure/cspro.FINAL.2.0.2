import { bus, store, uid } from "../state/store";
import type { ChatAttachment, ChatReplyPreview } from "../state/types";

/**
 * The low-level "put a bubble in the log" primitive.
 *
 * It lives on its own so the rest of the app (Classroom, the tutor tabs, the
 * peers) can post a message without importing the chat UI, and so the richer
 * helpers in `messages.ts` can build on it without a circular import.
 */
export interface LegacyMessageInput {
  html: string;
  authorName: string;
  authorAvatar?: string;
  npcId?: string;
  system?: boolean;
  outbound?: boolean;
  attachments?: ChatAttachment[];
  replyTo?: ChatReplyPreview | null;
}

export function addMessage(opts: LegacyMessageInput): string {
  const id = uid("m_");
  const msg = {
    id,
    html: opts.html,
    attachments: opts.attachments?.length ? opts.attachments : undefined,
    authorName: opts.authorName,
    authorAvatar: opts.authorAvatar,
    npcId: opts.npcId,
    ts: Date.now(),
    system: opts.system,
    outbound: opts.outbound,
    replyTo: opts.replyTo ?? null,
    status: opts.outbound ? ("sent" as const) : undefined,
  };
  store.set((s) => {
    s.messages = [...s.messages, msg];
    return { ...s };
  });
  bus.emit("chat-msg-added", { id, npcId: msg.npcId });
  return id;
}
