import { useEffect, useRef, useState } from "react";
import { bus, useStore } from "../state/store";
import type { ChatAttachment, ChatMessage, NPC } from "../state/types";
import { Btn } from "../ui/primitives";
import { Avatar } from "./Avatar";
import { cn } from "../utils/cn";
import { EmojiPicker, GifPicker, Popover, StickerPicker } from "./Pickers";
import { GIF_STICKERS, STICKERS, stickerCss, type StickerDef } from "./stickers";
import { attachmentFromFile, formatBytes, imageFromClipboard, waveformFromBlob } from "./media";
import { attachmentFromLink, fetchLinkMetadata, findUrls } from "./links";
import { escapeHtml, postMessage, replyPreviewOf, textOf, updateMessage } from "./messages";

type PickerKind = null | "emoji" | "attach";
type AttachTab = "media" | "sticker" | "gif";

export interface ComposerProps {
  replyTo: ChatMessage | null;
  onCancelReply: () => void;
  npcs: NPC[];
  asNpcId: string | null;
  onAsChange: (id: string | null) => void;
  speakOnSend: boolean;
  onSpeakOnSendChange: (v: boolean) => void;
}

export function Composer({ replyTo, onCancelReply, npcs, asNpcId, onAsChange, speakOnSend, onSpeakOnSendChange }: ComposerProps) {
  const tutor = useStore((s) => s.tutor);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const [picker, setPicker] = useState<PickerKind>(null);
  const [attachTab, setAttachTab] = useState<AttachTab>("media");
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [interim, setInterim] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const gifFileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const asNpc = npcs.find((n) => n.id === asNpcId) || null;

  // recording plumbing
  const recRef = useRef<{
    rec: MediaRecorder;
    stream: MediaStream;
    chunks: Blob[];
    levels: number[];
    timer: number;
    analyser?: AnalyserNode;
    ctx?: AudioContext;
    recognition?: any;
    transcript: string;
    startedAt: number;
  } | null>(null);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => {
      const r = recRef.current;
      if (!r) return;
      setRecSecs(Math.round((Date.now() - r.startedAt) / 1000));
      if (r.analyser) {
        const buf = new Uint8Array(r.analyser.frequencyBinCount);
        r.analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        r.levels.push(Math.min(1, rms * 3));
        if (r.levels.length > 240) r.levels.shift();
        setLevels([...r.levels].slice(-48));
      }
    }, 140);
    return () => clearInterval(id);
  }, [recording]);

  useEffect(() => {
    if (text === "" && !replyTo) inputRef.current?.focus();
  }, [text, replyTo]);

  // Notices are inline, never modal: a denied microphone or an empty clipboard
  // must not freeze a live lesson behind an alert box.
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 7000);
    return () => clearTimeout(id);
  }, [notice]);

  // ---------- sending ----------
  async function send() {
    const body = text.trim();
    if (!body && pending.length === 0) return;
    const urls = findUrls(body).filter((u) => !pending.some((a) => a.url === u));
    const links = urls.map(attachmentFromLink);
    const attachments = [...pending, ...links];
    const author = asNpc
      ? { authorName: asNpc.name, authorAvatar: asNpc.avatar, npcId: asNpc.id, outbound: false }
      : { authorName: tutor.name || "Teacher", authorAvatar: tutor.avatar, npcId: undefined, outbound: true };

    const msg = postMessage({
      html: escapeHtml(body),
      attachments,
      replyTo: replyTo ? replyPreviewOf(replyTo) : null,
      speak: asNpc ? { npcId: asNpc.id, text: body, voiceURI: asNpc.voiceURI, rate: asNpc.speechSpeed, pitch: asNpc.pitch } : undefined,
      ...author,
    });

    // A character who "sent" a message is also heard saying it.
    if (asNpc && speakOnSend && body) {
      bus.emit("speak-request", { npcId: asNpc.id, text: body });
    }
    if (asNpc && !body && attachments.length) {
      const voice = attachments.find((a) => a.kind === "voice");
      if (voice?.transcript) bus.emit("speak-request", { npcId: asNpc.id, text: voice.transcript });
    }

    setText("");
    setPending([]);
    onCancelReply();
    setPicker(null);

    // Titles and thumbnails arrive after the bubble — nobody waits for the network.
    if (links.length) {
      Promise.all(links.map((a) => fetchLinkMetadata(a.url).then((meta) => ({ id: a.id, meta })))).then((results) => {
        const patch = new Map(results.map((r) => [r.id, r.meta]));
        if (!patch.size) return;
        const enriched = attachments.map((a) => (patch.has(a.id) ? { ...a, ...patch.get(a.id) } : a));
        updateMessage(msg.id, { attachments: enriched });
      });
    }
  }

  // ---------- files ----------
  async function addFiles(files: FileList | File[] | null) {
    if (!files) return;
    const list = Array.from(files).slice(0, 6);
    if (!list.length) return;
    setBusy(true);
    try {
      for (const f of list) {
        const a = await attachmentFromFile(f);
        setPending((p) => [...p, a]);
      }
    } finally {
      setBusy(false);
    }
  }

  function addSticker(st: StickerDef) {
    setPending((p) => [
      ...p,
      { id: `st_${st.id}_${Math.random().toString(36).slice(2, 7)}`, kind: "sticker", url: "", emoji: st.emoji, animate: st.anim, stickerId: st.id, caption: st.label },
    ]);
    setPicker(null);
  }

  async function addGifUrl(url: string) {
    const a = attachmentFromLink(url);
    if (a.kind === "image") a.kind = "gif";
    setPending((p) => [...p, a]);
    setPicker(null);
  }

  // ---------- voice ----------
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"].find((t) => (window as any).MediaRecorder?.isTypeSupported?.(t));
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);

      let analyser: AnalyserNode | undefined;
      let ctx: AudioContext | undefined;
      try {
        const AC: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
        ctx = new AC();
        const src = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
      } catch {}

      // Live transcript, when the browser can do it (Chrome/Edge). Never fatal.
      let recognition: any;
      try {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SR) {
          recognition = new SR();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.onresult = (ev: any) => {
            let finalText = "";
            let interimText = "";
            for (let i = 0; i < ev.results.length; i++) {
              const res = ev.results[i];
              if (res.isFinal) finalText += res[0].transcript;
              else interimText += res[0].transcript;
            }
            // Stored on the recorder itself: this handler outlives the render that made it.
            if (recRef.current) recRef.current.transcript = finalText.trim();
            setInterim(interimText.trim());
          };
          recognition.start();
        }
      } catch {}

      recRef.current = { rec, stream, chunks, levels: [], timer: 0, analyser, ctx, recognition, transcript: "", startedAt: Date.now() };
      rec.start();
      setRecording(true);
      setRecSecs(0);
      setLevels([]);
    } catch {
      setNotice("Microphone access was denied, so no voice note could be recorded. Allow the mic in your browser settings, or attach an audio file instead.");
    }
  }

  async function stopRecording(sendIt: boolean) {
    const r = recRef.current;
    if (!r) return;
    recRef.current = null;
    const done = new Promise<Blob>((resolve) => {
      r.rec.onstop = () => resolve(new Blob(r.chunks, { type: r.rec.mimeType || "audio/webm" }));
      try {
        r.rec.stop();
      } catch {
        resolve(new Blob(r.chunks, { type: "audio/webm" }));
      }
    });
    try {
      r.recognition?.stop();
    } catch {}
    try {
      r.ctx?.close().catch(() => {});
    } catch {}
    r.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
    setInterim("");

    if (!sendIt) {
      setLevels([]);
      return;
    }
    const blob = await done;
    const durationSec = Math.max(1, Math.round((Date.now() - r.startedAt) / 1000));
    const levels = r.levels.length ? r.levels : await waveformFromBlob(blob);
    const max = Math.max(...levels, 0.01);
    const waveform = levels.slice(-60).map((v) => Math.max(0.08, Math.min(1, v / max)));
    const file = new File([blob], `voice-note-${new Date().toISOString().slice(11, 19).replace(/:/g, "")}.webm`, { type: blob.type || "audio/webm" });
    const base = await attachmentFromFile(file);
    const attachment: ChatAttachment = {
      ...base,
      kind: "voice",
      durationSec,
      waveform,
      transcript: r.transcript.trim() || undefined,
      name: "Voice message",
    };
    setLevels([]);
    setPending((p) => [...p, attachment]);
  }

  const canSend = !!text.trim() || pending.length > 0;

  return (
    <div
      className={cn("relative border-t border-slate-100 bg-white p-2", dragOver && "ring-2 ring-inset ring-indigo-400")}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setDragOver(false);
        await addFiles(e.dataTransfer?.files || null);
      }}
      onPaste={async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        const files: File[] = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith("image/")) {
            const f = items[i].getAsFile();
            if (f) files.push(f);
          }
        }
        if (files.length) {
          e.preventDefault();
          await addFiles(files);
        }
      }}
    >
      <style>{stickerCss()}</style>
      <input ref={photoRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
      <input ref={gifFileRef} type="file" accept="image/gif" hidden onChange={(e) => addFiles(e.target.files)} />
      <input ref={audioRef} type="file" accept="audio/*" hidden onChange={(e) => addFiles(e.target.files)} />
      <input ref={videoRef} type="file" accept="video/*" hidden onChange={(e) => addFiles(e.target.files)} />
      <input ref={fileRef} type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} />

      {dragOver && (
        <div className="absolute inset-0 z-[72] grid place-items-center rounded-xl bg-indigo-50/90 text-sm font-semibold text-indigo-700">
          Drop photos, video, audio, GIFs or documents into the chat
        </div>
      )}

      {/* Send-as row */}
      <div className="mb-1.5 flex items-center gap-1.5 overflow-x-auto">
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">As</span>
        <button
          type="button"
          onClick={() => onAsChange(null)}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition",
            !asNpc ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50",
          )}
        >
          <Avatar name={tutor.name || "Teacher"} avatar={tutor.avatar} size={18} />
          {tutor.name || "Teacher"}
        </button>
        {npcs.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => onAsChange(n.id)}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition",
              asNpc?.id === n.id ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50",
            )}
            title={`Speak as ${n.name}`}
          >
            <Avatar name={n.name} avatar={n.avatar} size={18} />
            {n.name}
          </button>
        ))}
        {asNpc && (
          <label className="ml-1 flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <input type="checkbox" checked={speakOnSend} onChange={(e) => onSpeakOnSendChange(e.target.checked)} />
            🔊 say it out loud
          </label>
        )}
      </div>

      {notice && (
        <div className="mb-1.5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
          <span>⚠️</span>
          <span className="flex-1">{notice}</span>
          <button type="button" className="text-amber-700 hover:text-amber-900" onClick={() => setNotice(null)} title="Dismiss">
            ✕
          </button>
        </div>
      )}

      {/* Inline link bar — no native dialogs anywhere in the composer */}
      {linkUrl !== null && (
        <form
          className="mb-1.5 flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/60 px-2 py-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            const url = linkUrl.trim();
            if (!url) return;
            const a = attachmentFromLink(url);
            setPending((p) => [...p, a]);
            fetchLinkMetadata(a.url).then((meta) => setPending((p) => p.map((x) => (x.id === a.id ? { ...x, ...meta } : x))));
            setPending((p) => p);
            setLinkUrl(null);
          }}
        >
          <span className="text-sm">🔗</span>
          <input
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Paste a YouTube, SoundCloud or website link"
            className="min-w-0 flex-1 rounded-lg border border-indigo-200 px-2 py-1 text-[12px] focus:border-indigo-400 focus:outline-none"
          />
          <Btn size="sm" variant="primary" type="submit">
            Attach
          </Btn>
          <button type="button" className="text-slate-400 hover:text-slate-700" onClick={() => setLinkUrl(null)} title="Cancel">
            ✕
          </button>
        </form>
      )}

      {/* Reply banner */}
      {replyTo && (
        <div className="mb-1.5 flex items-center gap-2 rounded-xl border-l-2 border-indigo-400 bg-indigo-50/60 px-2 py-1">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-indigo-700">Replying to {replyTo.authorName}</div>
            <div className="truncate text-[11px] text-slate-600">{textOf(replyTo) || describeAttachments(replyTo)}</div>
          </div>
          <button type="button" className="text-slate-400 hover:text-slate-700" onClick={onCancelReply}>
            ✕
          </button>
        </div>
      )}

      {/* Pending attachments */}
      {pending.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {pending.map((a) => (
            <div key={a.id} className="group flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
              {a.kind === "image" || a.kind === "gif" ? (
                a.url ? (
                  <img src={a.url} alt="" className="h-8 w-8 rounded-md object-cover" />
                ) : (
                  <span className="text-sm">🖼</span>
                )
              ) : (
                <span className="text-sm">{kindIcon(a.kind)}</span>
              )}
              <div className="min-w-0">
                <div className="max-w-[10rem] truncate text-[11px] font-semibold text-slate-700">
                  {a.kind === "sticker" ? a.caption || "Sticker" : a.title || a.name || a.provider || a.kind}
                </div>
                <div className="text-[10px] text-slate-400">
                  {a.kind === "sticker" || a.kind === "gif" ? "animated" : a.kind === "voice" ? "voice note" : formatBytes(a.sizeBytes) || a.provider || "link"}
                  {a.sessionOnly ? " · session only" : ""}
                </div>
              </div>
              <button type="button" className="text-slate-400 hover:text-rose-600" onClick={() => setPending((p) => p.filter((x) => x.id !== a.id))} title="Remove">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recording bar */}
      {recording ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-2 py-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
          <span className="font-mono text-[12px] text-rose-700">
            {Math.floor(recSecs / 60)}:{String(recSecs % 60).padStart(2, "0")}
          </span>
          <div className="flex h-6 flex-1 items-center gap-[2px] overflow-hidden">
            {(levels.length ? levels : Array.from({ length: 32 }, () => 0.1)).map((v, i) => (
              <span key={i} className="w-[3px] rounded-full bg-rose-400" style={{ height: `${Math.max(10, v * 100)}%` }} />
            ))}
          </div>
          {interim && <span className="max-w-[10rem] truncate text-[10px] italic text-rose-600">{interim}…</span>}
          <Btn size="sm" variant="ghost" onClick={() => stopRecording(false)}>
            Cancel
          </Btn>
          <Btn size="sm" variant="danger" onClick={() => stopRecording(true)}>
            ⟨ Send
          </Btn>
        </div>
      ) : (
        <div className="flex items-end gap-1">
          <div className="relative flex items-center">
            <IconBtn title="Emoji" onClick={() => setPicker(picker === "emoji" ? null : "emoji")} active={picker === "emoji"}>
              😊
            </IconBtn>
            <IconBtn title="Attach: media, stickers, GIFs, embeds" onClick={() => setPicker(picker === "attach" ? null : "attach")} active={picker === "attach"}>
              📎
            </IconBtn>
            {picker === "emoji" && (
              <Popover onClose={() => setPicker(null)}>
                <EmojiPicker onPick={(e) => setText((t) => t + e)} />
              </Popover>
            )}
            {picker === "attach" && (
              <Popover onClose={() => setPicker(null)} className="w-[21rem] max-w-[80vw]">
                <div className="mb-1.5 flex items-center gap-1">
                  {([
                    ["media", "🖼 Media"],
                    ["sticker", "🎟 Stickers"],
                    ["gif", "🎞 GIFs"],
                  ] as [AttachTab, string][]).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setAttachTab(k)}
                      className={cn(
                        "rounded-lg px-2 py-1 text-[11px] font-semibold transition",
                        attachTab === k ? "bg-indigo-500 text-white" : "text-slate-600 hover:bg-slate-100",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {attachTab === "media" && (
                  <>
                    <div className="grid grid-cols-2 gap-1">
                      <AttachBtn icon="🖼" label="Photo / GIF" onClick={() => { photoRef.current?.click(); setPicker(null); }} />
                      <AttachBtn icon="📄" label="Any file" onClick={() => { fileRef.current?.click(); setPicker(null); }} />
                      <AttachBtn icon="🎵" label="Audio file" onClick={() => { audioRef.current?.click(); setPicker(null); }} />
                      <AttachBtn icon="🎬" label="Video file" onClick={() => { videoRef.current?.click(); setPicker(null); }} />
                      <AttachBtn
                        icon="📋"
                        label="Paste image"
                        onClick={async () => {
                          const f = await imageFromClipboard();
                          setPicker(null);
                          if (f) await addFiles([f]);
                          else setNotice("No image in the clipboard — copy a picture, or use Photo / GIF to pick a file.");
                        }}
                      />
                      <AttachBtn
                        icon="🔗"
                        label="Link / site"
                        onClick={() => {
                          setPicker(null);
                          setLinkUrl("");
                        }}
                      />
                    </div>
                    <div className="mt-1.5 border-t border-slate-100 pt-1.5 text-[10px] text-slate-400">
                      Pasted links become real players: YouTube ▶️ · SoundCloud 🎧 · live site 🌐 · direct files 🖼
                    </div>
                  </>
                )}

                {attachTab === "sticker" && <StickerPicker onPick={addSticker} onSendGifFile={() => gifFileRef.current?.click()} />}
                {attachTab === "gif" && <GifPicker onPick={addSticker} onPickFile={() => gifFileRef.current?.click()} onPickUrl={addGifUrl} />}
              </Popover>
            )}
          </div>

          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
              if (e.key === "Escape") onCancelReply();
            }}
            rows={1}
            placeholder={asNpc ? `Message as ${asNpc.name}…` : "Message"}
            className="max-h-32 min-h-[2.25rem] flex-1 resize-none rounded-2xl border border-slate-200 px-3 py-2 text-[13px] focus:border-indigo-400 focus:outline-none"
            style={{ height: Math.min(120, 36 + text.split("\n").length * 16) }}
          />

          <IconBtn title="Record a voice message" onClick={startRecording}>
            🎤
          </IconBtn>
          <Btn size="icon" variant="primary" onClick={() => void send()} disabled={!canSend || busy} title="Send">
            {busy ? "⏳" : "➤"}
          </Btn>
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, onClick, title, active }: { children: React.ReactNode; onClick: () => void; title: string; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn("grid h-9 w-9 place-items-center rounded-full text-[16px] transition", active ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-100")}
    >
      {children}
    </button>
  );
}

function AttachBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-slate-100">
      <span className="text-base">{icon}</span>
      {label}
    </button>
  );
}

function kindIcon(kind: string) {
  switch (kind) {
    case "voice":
      return "🎙";
    case "audio":
      return "🎵";
    case "video":
      return "🎬";
    case "youtube":
      return "▶️";
    case "soundcloud":
      return "🎧";
    case "site":
      return "🌐";
    case "sticker":
      return "🎟";
    case "gif":
      return "🎞";
    default:
      return "📎";
  }
}

function describeAttachments(m: ChatMessage) {
  const kinds = (m.attachments || []).map((a) => kindIcon(a.kind)).join(" ");
  return kinds || "attachment";
}

/** Exposed for the empty state and tests: every built-in sticker, by id. */
export const STICKERS_BY_ID = new Map(STICKERS.map((st) => [st.id, st]));
export const GIF_IDS = GIF_STICKERS.map((st) => st.id);
