import { useEffect, useMemo, useRef, useState } from "react";
import { store, useBus, useStore } from "../state/store";
import type { ChatAttachment, ChatMessage } from "../state/types";
import { Btn, TInput } from "../ui/primitives";
import { Avatar } from "./Avatar";
import { cn } from "../utils/cn";
import { Message } from "./Message";
import { Composer } from "./Composer";
import Lightbox from "./Lightbox";
import { buildTimeline, markDelivered, markRead, replyPreviewOf, textOf } from "./messages";
import { useIsReading, useReadingId, readAloud, stopReadAloud } from "./readAloud";
import { chatPing } from "../lib/sounds";
import { stickerCss } from "./stickers";

/**
 * The classroom chat.
 *
 * Built like the messenger a tutor already knows how to use: one column of
 * bubbles with the speaker's round photo, day separators, replies, reactions,
 * delivery ticks, and a composer that can send anything a lesson needs — photos,
 * GIFs, stickers, voice notes, YouTube, SoundCloud, a live site, or a file from
 * the tutor's own computer. Everything renders from the store, so the tutor's
 * control window and the classroom screen always show the same conversation.
 */
export default function Chat({ onClose, onOpenTutor }: { onClose?: () => void; onOpenTutor?: () => void }) {
  const messages = useStore((s) => s.messages);
  const npcs = useStore((s) => s.npcs);
  const speaker = useStore((s) => s.speaker);
  const [typingNpc, setTypingNpc] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [asNpcId, setAsNpcId] = useState<string | null>(null);
  const [speakOnSend, setSpeakOnSend] = useState(true);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ items: ChatAttachment[]; index: number } | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unread, setUnread] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const readingId = useReadingId();
  const isReading = useIsReading();

  const { rows, grouped } = useMemo(() => buildTimeline(messages), [messages]);
  // The filter only applies while the search bar is actually open — closing it
  // must show the whole conversation again, not silently keep hiding messages.
  const searching = searchOpen && search.trim().length >= 2;
  const visibleRows = useMemo(() => {
    if (!searching) return rows;
    return rows.filter((r) => r.kind === "day" || textOf(r.message).toLowerCase().includes(search.trim().toLowerCase()));
  }, [rows, search, searching]);

  const speakerNpc = speaker.speaking && speaker.npcId ? npcs.find((n) => n.id === speaker.npcId) : null;
  const typing = typingNpc ? npcs.find((n) => n.id === typingNpc) : null;
  const photoNpc = speakerNpc || typing || npcs[0] || null;
  const photoName = photoNpc?.name || "Class chat";
  const photoAvatar = photoNpc?.avatar || "";

  useBus((ev) => {
    if (ev.type === "npc-typing") setTypingNpc(ev.payload?.npcId || null);
    if (ev.type === "chat-msg-added") {
      if (store.get().settings.soundEffects) chatPing();
      markDelivered();
      if (document.visibilityState === "visible") window.setTimeout(() => markRead("classroom"), 700);
    }
  });

  // Auto-scroll on new messages, but never yank the page away from a tutor reading back.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (atBottom) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
      setUnread(0);
    } else {
      setUnread((u) => u + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, typingNpc, visibleRows.length]);

  // Follow the voice while reading the chat aloud.
  useEffect(() => {
    if (!readingId) return;
    const node = document.getElementById(`msg-${readingId}`);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [readingId]);

  function scrollToBottom() {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setAtBottom(true);
    setUnread(0);
  }

  function jumpTo(id: string) {
    const node = document.getElementById(`msg-${id}`);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    node.animate([{ backgroundColor: "rgba(99,102,241,.25)" }, { backgroundColor: "transparent" }], { duration: 1200 });
  }

  const lastSpeakable = messages.filter((m) => !m.system && textOf(m)).slice(-20);

  return (
    <div className="flex h-full flex-col">
      <style>{stickerCss()}</style>

      {/* Header — the round photo of whoever is talking */}
      <header className="flex items-center gap-2 border-b border-slate-100 bg-white px-3 py-2">
        <div className="relative">
          <Avatar name={photoName} avatar={photoAvatar} size={38} ring={!!speakerNpc} speaking={!!speakerNpc} />
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white",
              speakerNpc || typing ? "bg-emerald-500" : "bg-slate-300",
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold text-slate-800">{speakerNpc ? `${speakerNpc.name} is speaking` : photoName}</div>
          <div className="truncate text-[11px] text-slate-500">
            {typing ? (
              <span className="text-indigo-600">{typing.name} is typing…</span>
            ) : isReading ? (
              <span className="text-emerald-600">Reading the chat aloud…</span>
            ) : (
              `${npcs.length} in class · ${messages.filter((m) => !m.system).length} messages`
            )}
          </div>
        </div>
        <Btn
          size="icon"
          variant="ghost"
          title="Search messages"
          onClick={() =>
            setSearchOpen((v) => {
              // Closing the bar clears the query too, so the next open starts fresh.
              if (v) setSearch("");
              return !v;
            })
          }
        >
          🔍
        </Btn>
        <Btn
          size="icon"
          variant="ghost"
          title={isReading ? "Stop reading" : "Read the last messages aloud, each in their own voice"}
          onClick={() => (isReading ? stopReadAloud() : void readAloud(lastSpeakable, npcs))}
          className={isReading ? "!text-emerald-600" : ""}
        >
          {isReading ? "⏹" : "🔊"}
        </Btn>
        {onOpenTutor && (
          <Btn size="icon" variant="ghost" title="Open Tutor Control" onClick={onOpenTutor}>
            ⚙️
          </Btn>
        )}
        {onClose && (
          <Btn size="icon" variant="ghost" title="Close panel" onClick={onClose}>
            ✕
          </Btn>
        )}
      </header>

      {/* Pinned live speech — the photo shows up the moment a character speaks */}
      {speakerNpc && speaker.text && (
        <button
          type="button"
          onClick={() => void readAloud([...lastSpeakable].slice(-1), npcs)}
          className="flex w-full items-center gap-2 border-b border-emerald-100 bg-emerald-50/80 px-3 py-1.5 text-left"
          title="Replay this line"
        >
          <Avatar name={speakerNpc.name} avatar={speakerNpc.avatar} size={26} ring speaking />
          <span className="shrink-0 text-[11px] font-bold text-emerald-700">{speakerNpc.name}</span>
          <span className="min-w-0 flex-1 truncate text-[12px] text-emerald-900">{speaker.text}</span>
          <span className="flex shrink-0 items-end gap-[2px]">
            {[0.5, 0.9, 0.4, 0.75].map((v, i) => (
              <span key={i} className="w-[3px] animate-pulse rounded-full bg-emerald-500" style={{ height: `${v * 16}px`, animationDelay: `${i * 120}ms` }} />
            ))}
          </span>
        </button>
      )}

      {searchOpen && (
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-1.5">
          <TInput autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search this conversation…" className="!text-[12px]" />
          <span className="shrink-0 text-[11px] text-slate-500">
            {searching ? `${visibleRows.filter((r) => r.kind === "msg").length} found` : ""}
          </span>
          <Btn size="sm" variant="ghost" onClick={() => { setSearch(""); setSearchOpen(false); }}>
            ✕
          </Btn>
        </div>
      )}

      {/* Timeline */}
      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          setAtBottom(bottom);
          if (bottom) setUnread(0);
        }}
        className="relative flex-1 overflow-y-auto bg-gradient-to-b from-slate-50/50 to-white px-3 py-2"
      >
        {messages.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <div className="mb-2 text-4xl">💬</div>
            Say hi to start the conversation
          </div>
        )}

        {visibleRows.map((row) =>
          row.kind === "day" ? (
            <div key={row.key} className="my-3 flex items-center gap-2">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{row.label}</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
          ) : (
            <Message
              key={row.key}
              m={row.message}
              grouped={grouped.has(row.message.id)}
              npcs={npcs}
              onReply={setReplyTo}
              onOpenMedia={(items, index) => setLightbox({ items, index })}
              query={searching ? search : ""}
              reading={readingId === row.message.id}
              onJumpTo={jumpTo}
              canModerate={!row.message.npcId}
            />
          ),
        )}

        {typing && (
          <div className="mt-2 flex items-end gap-2">
            <Avatar name={typing.name} avatar={typing.avatar} size={28} />
            <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-500">{typing.name} is typing</span>
                <span className="flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </span>
              </div>
            </div>
          </div>
        )}

        {!atBottom && (
          <div className="pointer-events-none sticky bottom-2 flex justify-center">
            <button
              type="button"
              onClick={scrollToBottom}
              className="pointer-events-auto flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-lg hover:bg-slate-50"
            >
              ↓ {unread > 0 ? `${unread} new message${unread === 1 ? "" : "s"}` : "Jump to newest"}
            </button>
          </div>
        )}
      </div>

      <Composer
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        npcs={npcs}
        asNpcId={asNpcId}
        onAsChange={setAsNpcId}
        speakOnSend={speakOnSend}
        onSpeakOnSendChange={setSpeakOnSend}
      />

      {lightbox && <Lightbox items={lightbox.items} index={lightbox.index} onClose={() => setLightbox(null)} />}
    </div>
  );
}

/** Named export kept for the panel and for anything that wants the reply preview helper. */
export { replyPreviewOf };
