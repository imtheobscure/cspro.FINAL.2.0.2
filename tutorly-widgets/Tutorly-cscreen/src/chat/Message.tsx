import { useState } from "react";
import { useStore } from "../state/store";
import type { ChatAttachment, ChatMessage, NPC } from "../state/types";
import { Avatar } from "./Avatar";
import { Btn } from "../ui/primitives";
import { cn } from "../utils/cn";
import { YouTubeCard, SoundCloudCard, SiteCard } from "./Embed";
import { VoiceNote } from "./VoiceNote";
import { formatBytes, formatDuration } from "./media";
import { deleteMessage, editMessageText, textOf, toggleReaction, updateMessage } from "./messages";
import { readOne } from "./readAloud";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🤔", "👏", "🔥", "✅"];

export interface MessageProps {
  m: ChatMessage;
  grouped: boolean;
  npcs: NPC[];
  onReply: (m: ChatMessage) => void;
  onOpenMedia: (items: ChatAttachment[], index: number) => void;
  query?: string;
  reading?: boolean;
  onJumpTo?: (id: string) => void;
  canModerate?: boolean;
}

export function Message({ m, grouped, npcs, onReply, onOpenMedia, query, reading, onJumpTo, canModerate }: MessageProps) {
  const speaker = useStore((s) => s.speaker);
  const tutor = useStore((s) => s.tutor);
  const [showReactions, setShowReactions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (m.system) {
    const text = textOf(m);
    if (/^🔀/.test(text) || m.html?.includes("<i>")) {
      return (
        <div className="my-1 flex justify-start pl-9">
          <div className="max-w-[85%] rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-[12px] text-amber-900">
            <div dangerouslySetInnerHTML={{ __html: m.html }} />
          </div>
        </div>
      );
    }
    return <div className="py-1 text-center text-[11px] italic text-slate-400">{text || "—"}</div>;
  }

  const out = !!m.outbound;
  const mine = out || (!m.npcId && m.authorName === (tutor.name || "Teacher"));
  const speakingNow = !!m.npcId && speaker.npcId === m.npcId && speaker.speaking;
  const isReading = !!reading;
  const attachments = m.attachments || [];
  const mediaItems = attachments.filter((a) => a.kind === "image" || a.kind === "gif");
  const stickers = attachments.filter((a) => a.kind === "sticker");
  const voices = attachments.filter((a) => a.kind === "voice");
  const audios = attachments.filter((a) => a.kind === "audio");
  const videos = attachments.filter((a) => a.kind === "video");
  const youtubes = attachments.filter((a) => a.kind === "youtube");
  const clouds = attachments.filter((a) => a.kind === "soundcloud");
  const sites = attachments.filter((a) => a.kind === "site");
  const files = attachments.filter((a) => a.kind === "file" || a.kind === "link");
  const reactionGroups = groupReactions(m);
  /** Nothing to say out loud yet (a bare voice note with no transcript, an image). */
  const speakable = !!stripText(m.html) || attachments.some((a) => (a.kind === "voice" ? !!a.transcript : false)) || attachments.some((a) => a.kind !== "voice");
  const hasBody = !!m.html?.trim() || attachments.length > 0;
  const pureSticker = stickers.length > 0 && !m.html?.trim() && attachments.length === stickers.length;

  const bodyClass = out
    ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl rounded-br-md"
    : "bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-md";

  return (
    <div
      id={`msg-${m.id}`}
      className={cn("group flex items-end gap-2", out ? "flex-row-reverse" : "flex-row", grouped ? "mt-0.5" : "mt-2.5", isReading && "relative")}
    >
      {/* Circular photo — every character bubble carries it, grouped runs keep the gutter */}
      {!out &&
        (grouped ? (
          <div className="w-7 shrink-0" />
        ) : (
          <div className="relative shrink-0">
            <Avatar name={m.authorName} avatar={m.authorAvatar} size={28} ring={speakingNow} />
            {speakingNow && <span className="absolute -bottom-0.5 -right-0.5 text-[10px]">🔊</span>}
          </div>
        ))}

      <div className={cn("min-w-0", pureSticker ? "max-w-[60%]" : "max-w-[80%]", out ? "items-end" : "items-start", "flex flex-col")}>
        {!grouped && !out && <div className="mb-0.5 ml-1 text-[10px] font-semibold text-indigo-600/80">{m.authorName}</div>}

        {m.replyTo && (
          <button
            type="button"
            onClick={() => m.replyTo && onJumpTo?.(m.replyTo.id)}
            className={cn(
              "mb-1 max-w-full truncate rounded-lg border-l-2 px-2 py-1 text-left text-[11px]",
              out ? "border-white/70 bg-white/15 text-white/85" : "border-indigo-400 bg-indigo-50/70 text-slate-600",
              !onJumpTo && "cursor-default",
            )}
            title={m.replyTo.text}
          >
            <span className="font-semibold">{m.replyTo.author}</span> · {m.replyTo.text || "attachment"}
          </button>
        )}

        {/* Stickers live on their own, without a bubble — like Telegram */}
        {pureSticker && (
          <div className={cn("flex flex-wrap gap-1 p-1", out && "justify-end")}>
            {stickers.map((st) => (
              <StickerView key={st.id} a={st} size={92} />
            ))}
          </div>
        )}

        {hasBody && !pureSticker && (
          <div className={cn("relative overflow-hidden px-3 py-2 shadow-sm", bodyClass, isReading && "ring-2 ring-emerald-400 ring-offset-1")}>
            {m.deletedTs ? (
              <div className="text-[12px] italic opacity-70">This message was deleted</div>
            ) : (
              <div className="space-y-2">
                {!pureSticker && stickers.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {stickers.map((st) => (
                      <StickerView key={st.id} a={st} size={64} />
                    ))}
                  </div>
                )}

                {m.html?.trim() && (
                  <div
                    className={cn("msg-body text-[14px] leading-snug break-words", query && "searchable")}
                    dangerouslySetInnerHTML={{ __html: highlight(m.html, query) }}
                  />
                )}

                {mediaItems.length > 0 && (
                  <div className={cn("grid gap-1", mediaItems.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                    {mediaItems.map((a, i) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => onOpenMedia(mediaItems, i)}
                        className="group/media relative overflow-hidden rounded-xl"
                        title={`${a.name || a.kind}${a.sizeBytes ? ` · ${formatBytes(a.sizeBytes)}` : ""}`}
                      >
                        {a.url ? (
                          <img
                            src={a.url}
                            alt={a.caption || a.name || "photo"}
                            className="max-h-72 w-full object-cover transition group-hover/media:scale-[1.02]"
                          />
                        ) : (
                          <div className="grid h-32 place-items-center bg-slate-100 text-[11px] text-slate-500">Photo too large to keep after reload</div>
                        )}
                        {a.kind === "gif" && (
                          <span className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">GIF</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {mediaItems[0]?.caption && <div className="text-[12px] opacity-80">{mediaItems[0].caption}</div>}

                {voices.map((a) => (
                  <VoiceNote
                    key={a.id}
                    a={a}
                    tone={out ? "out" : "in"}
                    speaking={isReading && a.kind === "voice"}
                    onReadAloud={() => readOne(m, npcs)}
                    onTranscript={(transcript) =>
                      updateMessage(m.id, {
                        attachments: (m.attachments || []).map((x) => (x.id === a.id ? { ...x, transcript } : x)),
                        speak: { ...(m.speak || {}), text: transcript },
                      })
                    }
                  />
                ))}

                {audios.map((a) => (
                  <div key={a.id} className={cn("rounded-xl px-2 py-1.5", out ? "bg-white/12" : "bg-slate-50")}>
                    <div className="mb-1 truncate text-[11px] font-semibold">🎵 {a.name || "Audio"}</div>
                    {a.url ? <audio src={a.url} controls className="w-full" /> : <div className="text-[11px] opacity-70">Audio not available after reload</div>}
                  </div>
                ))}

                {videos.map((a) => (
                  <div key={a.id} className="overflow-hidden rounded-xl">
                    {a.url ? (
                      <video src={a.url} poster={a.thumb} controls className="max-h-72 w-full bg-black" />
                    ) : (
                      <div className="grid h-32 place-items-center bg-slate-100 text-[11px] text-slate-500">Video not available after reload</div>
                    )}
                    <div className={cn("px-2 py-1 text-[10px]", out ? "bg-white/12 text-white/80" : "bg-slate-50 text-slate-500")}>
                      🎬 {a.name || "Video"} {a.durationSec ? `· ${formatDuration(a.durationSec)}` : ""} {a.sizeBytes ? `· ${formatBytes(a.sizeBytes)}` : ""}
                    </div>
                  </div>
                ))}

                {youtubes.map((a) => (
                  <YouTubeCard key={a.id} a={a} />
                ))}
                {clouds.map((a) => (
                  <SoundCloudCard key={a.id} a={a} />
                ))}
                {sites.map((a) => (
                  <SiteCard key={a.id} a={a} />
                ))}

                {files.map((a) => (
                  <a
                    key={a.id}
                    href={a.url || a.url}
                    download={a.name}
                    className={cn("flex items-center gap-2 rounded-xl border px-2 py-1.5 text-[12px]", out ? "border-white/30 bg-white/10 text-white" : "border-slate-200 bg-slate-50 text-slate-700")}
                  >
                    <span className="text-lg">📎</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{a.name || a.title || a.url}</span>
                      <span className="block text-[10px] opacity-70">
                        {a.provider || a.mime || "file"} {a.sizeBytes ? `· ${formatBytes(a.sizeBytes)}` : ""}
                      </span>
                    </span>
                    {a.url ? <span className="text-[11px] underline">save</span> : <span className="text-[10px] opacity-70">link only</span>}
                  </a>
                ))}
              </div>
            )}

            <div className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", out ? "text-white/75" : "text-slate-400")}>
              {m.editedTs && <span>edited</span>}
              <span>{new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              {out && (
                <span className={cn("font-bold", m.status === "read" ? "text-sky-300" : "opacity-80")} title={m.status === "read" ? "Read" : m.status === "delivered" ? "Delivered" : "Sent"}>
                  {m.status === "read" || m.status === "delivered" ? "✓✓" : "✓"}
                </span>
              )}
            </div>

            {/* Hover actions */}
            <div
              className={cn(
                "absolute -top-3 flex items-center gap-0.5 rounded-full border border-slate-200 bg-white px-1 py-0.5 opacity-0 shadow-md transition group-hover:opacity-100 focus-within:opacity-100",
                out ? "left-1" : "right-1",
              )}
            >
              <button type="button" className="rounded-full px-1.5 py-0.5 text-[13px] hover:bg-slate-100" title="React" onClick={() => setShowReactions((v) => !v)}>
                😊
              </button>
              <button type="button" className="rounded-full px-1.5 py-0.5 text-[13px] hover:bg-slate-100" title="Reply" onClick={() => onReply(m)}>
                ↩
              </button>
              {speakable && (
                <button
                  type="button"
                  className={cn("rounded-full px-1.5 py-0.5 text-[13px] hover:bg-slate-100", isReading && "text-emerald-600")}
                  title="Read this aloud in the character's voice"
                  onClick={() => readOne(m, npcs)}
                >
                  🔊
                </button>
              )}
              <button
                type="button"
                className="rounded-full px-1.5 py-0.5 text-[13px] hover:bg-slate-100"
                title="Copy text"
                onClick={() => navigator.clipboard?.writeText(textOf(m)).catch(() => {})}
              >
                ⧉
              </button>
              {mine && !m.deletedTs && (
                <button
                  type="button"
                  className="rounded-full px-1.5 py-0.5 text-[13px] hover:bg-slate-100"
                  title="Edit"
                  onClick={() => {
                    setDraft(textOf(m));
                    setEditing(true);
                  }}
                >
                  ✏️
                </button>
              )}
              {(mine || canModerate) && !m.deletedTs && (
                <button type="button" className="rounded-full px-1.5 py-0.5 text-[13px] text-rose-600 hover:bg-rose-50" title="Delete" onClick={() => deleteMessage(m.id)}>
                  🗑
                </button>
              )}
            </div>

            {showReactions && (
              <div className={cn("absolute z-20 -bottom-9 flex items-center gap-0.5 rounded-full border border-slate-200 bg-white px-1.5 py-1 shadow-xl", out ? "left-0" : "right-0")}>
                {QUICK_REACTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className="grid h-6 w-6 place-items-center rounded-full text-[15px] hover:bg-slate-100"
                    onClick={() => {
                      toggleReaction(m.id, e, "Teacher");
                      setShowReactions(false);
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {editing && (
          <div className="mt-1 w-full rounded-xl border border-indigo-200 bg-white p-2 shadow-sm">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full resize-y rounded-lg border border-slate-200 px-2 py-1 text-[13px] focus:border-indigo-400 focus:outline-none"
              rows={2}
            />
            <div className="mt-1 flex justify-end gap-1">
              <Btn size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Btn>
              <Btn
                size="sm"
                variant="primary"
                onClick={() => {
                  editMessageText(m.id, escapeToHtml(draft));
                  setEditing(false);
                }}
              >
                Save
              </Btn>
            </div>
          </div>
        )}

        {reactionGroups.length > 0 && (
          <div className={cn("mt-1 flex flex-wrap gap-1", out && "justify-end")}>
            {reactionGroups.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => toggleReaction(m.id, r.emoji, "Teacher")}
                className={cn(
                  "flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] transition",
                  r.mine ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
                title={r.by.join(", ")}
              >
                <span>{r.emoji}</span>
                <span className="font-semibold tabular-nums">{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function StickerView({ a, size = 72, loop }: { a: ChatAttachment; size?: number; loop?: boolean }) {
  if (a.url) {
    return <img src={a.url} alt={a.caption || "sticker"} style={{ width: size, height: size }} className="rounded-lg object-cover" />;
  }
  return (
    <span
      className={cn("sticker", a.animate, (loop || a.kind === "gif") && "sticker-loop")}
      style={{ fontSize: size }}
      title={a.caption || a.emoji}
      role="img"
      aria-label={a.caption || a.emoji || "sticker"}
    >
      {a.emoji || "🎟"}
    </span>
  );
}

function groupReactions(m: ChatMessage) {
  const map = new Map<string, { emoji: string; count: number; by: string[]; mine: boolean }>();
  for (const r of m.reactions || []) {
    const cur = map.get(r.emoji) || { emoji: r.emoji, count: 0, by: [], mine: false };
    cur.count += 1;
    cur.by.push(r.by);
    if (r.by === "Teacher") cur.mine = true;
    map.set(r.emoji, cur);
  }
  return [...map.values()];
}

function stripText(html?: string) {
  if (!html) return "";
  const d = document.createElement("div");
  d.innerHTML = html;
  return (d.textContent || "").trim();
}

function escapeToHtml(text: string) {
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML.replace(/\n/g, "<br/>");
}

function highlight(html: string, query?: string) {
  if (!query || query.trim().length < 2) return html;
  try {
    const rx = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    // only touch text nodes: walk the parsed fragment, never the markup itself
    const holder = document.createElement("div");
    holder.innerHTML = html;
    const walk = document.createTreeWalker(holder, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walk.nextNode()) nodes.push(walk.currentNode as Text);
    for (const node of nodes) {
      const value = node.nodeValue || "";
      if (!rx.test(value)) continue;
      rx.lastIndex = 0;
      const span = document.createElement("span");
      span.innerHTML = value.replace(rx, '<mark class="rounded bg-amber-200 px-0.5">$1</mark>');
      node.parentNode?.replaceChild(span, node);
    }
    return holder.innerHTML;
  } catch {
    return html;
  }
}

