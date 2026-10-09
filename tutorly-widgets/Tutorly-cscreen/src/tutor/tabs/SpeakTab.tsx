import { useEffect, useRef, useState } from "react";
import { useStore, store, bus, uid } from "../../state/store";
import { Btn } from "../../ui/primitives";
import { Field, Section } from "../shared";
import RichEditor from "../../ui/RichEditor";
import { sanitizeForSpeech } from "../../lib/speech";
import { requestSpeech } from "../../chat/speech";

type Mode = "voice+chat" | "voice" | "chat";

interface Entry {
  id: string;
  npcId: string;
  html: string;
  mode: Mode;
  emoji?: string;
}

export default function SpeakTab() {
  const npcs = useStore((s) => s.npcs);
  const speaker = useStore((s) => s.speaker);
  const [selectedNpc, setSelectedNpc] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("voice+chat");
  const [html, setHtml] = useState("");
  const [queue, setQueue] = useState<Entry[]>([]);
  const playingRef = useRef(false);
  const stopRef = useRef(false);

  useEffect(() => {
    if (!selectedNpc && npcs[0]) setSelectedNpc(npcs[0].id);
  }, [npcs, selectedNpc]);

  const npc = npcs.find((n) => n.id === selectedNpc);

  function speakNow(text?: string, emoji?: string, mod?: Mode) {
    if (!npc) return alert("Select a participant first.");
    const useHtml = text ?? html;
    if (!useHtml.trim()) return;
    const m = mod ?? mode;
    if (m !== "chat") {
      const sayText = sanitizeForSpeech(useHtml);
      if (sayText.trim()) {
        // Voice + chat posts the rich bubble below; voice-only has no bubble of
        // its own, so requestSpeech posts one — that is what puts the character's
        // photo in the chat when they only speak.
        if (m === "voice") requestSpeech(npc.id, sayText, emoji);
        else bus.emit("speak-request", { npcId: npc.id, text: sayText, emoji });
      }
    }
    if (m !== "voice") {
      addToChat(useHtml, npc);
    }
    if (text === undefined) setHtml("");
  }

  function addToChat(html: string, npc: any) {
    const msg = {
      id: uid("m_"),
      html,
      authorName: npc.name,
      authorAvatar: npc.avatar,
      npcId: npc.id,
      ts: Date.now(),
    };
    store.set((s) => {
      s.messages = [...s.messages, msg];
      return { ...s };
    });
    bus.emit("chat-msg-added", { id: msg.id });
  }

  function addToQueue() {
    if (!npc || !html.trim()) return;
    setQueue((q) => [...q, { id: uid("q_"), npcId: npc.id, html, mode }]);
    setHtml("");
  }

  function removeFromQueue(id: string) {
    setQueue((q) => q.filter((x) => x.id !== id));
  }

  function moveQueue(id: string, dir: -1 | 1) {
    setQueue((q) => {
      const i = q.findIndex((x) => x.id === id);
      if (i < 0) return q;
      const j = i + dir;
      if (j < 0 || j >= q.length) return q;
      const copy = [...q];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  async function playQueue() {
    if (playingRef.current) return;
    playingRef.current = true;
    stopRef.current = false;
    for (const entry of queue) {
      if (stopRef.current) break;
      const en = entry;
      const np = store.get().npcs.find((n) => n.id === en.npcId);
      if (!np) continue;
      // typing indicator
      bus.emit("npc-typing", { npcId: np.id });
      await wait(800 + Math.random() * 1200);
      bus.emit("npc-typing", { npcId: null });
      if (stopRef.current) break;
      if (en.mode !== "voice") addToChat(en.html, np);
      if (en.mode !== "chat") {
        const sayText = sanitizeForSpeech(en.html);
        await new Promise<void>((resolve) => {
          let done = false;
          let off: () => void = () => {};
          const onEnd = (ev: any) => {
            if (ev.type === "speech-ended" && !done) {
              done = true;
              off();
              resolve();
            }
          };
          off = bus.on(onEnd);
          // A voice-only queue entry has no bubble yet, so it posts one first.
          if (en.mode === "voice") requestSpeech(np.id, sayText, en.emoji);
          else bus.emit("speak-request", { npcId: np.id, text: sayText, emoji: en.emoji });
          // safety timeout
          setTimeout(() => { if (!done) { done = true; off(); resolve(); } }, sayText.length * 90 + 8000);
        });
      } else {
        await wait(800);
      }
      // gap of 5-10 seconds between messages
      const gap = 5000 + Math.random() * 5000;
      const stepStart = Date.now();
      while (Date.now() - stepStart < gap) {
        if (stopRef.current) break;
        await wait(100);
      }
    }
    playingRef.current = false;
    setQueue((q) => q); // refresh
  }

  function stopQueue() {
    stopRef.current = true;
    bus.emit("speak-stop");
    bus.emit("npc-typing", { npcId: null });
  }

  function raiseHand() {
    if (!npc) return;
    bus.emit("raise-hand", { name: npc.name });
  }

  return (
    <div className="space-y-4">
      <Section title="Choose participant">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {npcs.map((n) => (
            <button
              key={n.id}
              onClick={() => setSelectedNpc(n.id)}
              className={
                "p-2 rounded-xl border transition flex flex-col items-center text-center gap-1 " +
                (selectedNpc === n.id
                  ? "border-indigo-400 bg-indigo-50 shadow"
                  : "border-slate-200 bg-white hover:border-slate-300")
              }
            >
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center font-bold text-indigo-700">
                {n.avatar ? <img src={n.avatar} className="w-full h-full object-cover" /> : n.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-[11px] font-medium truncate w-full">{n.name}</div>
            </button>
          ))}
          {npcs.length === 0 && <div className="text-xs text-slate-400 col-span-full p-4 text-center">Add participants first.</div>}
        </div>
      </Section>

      <Section title="Message">
        <div className="space-y-3">
          <Field label="Output mode">
            <div className="flex gap-1">
              {(["voice+chat", "voice", "chat"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={
                    "px-3 py-1.5 text-xs rounded-lg border transition " +
                    (mode === m
                      ? "bg-indigo-500 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300")
                  }
                >
                  {m === "voice+chat" ? "🔊 Voice + Chat" : m === "voice" ? "🔊 Voice only" : "💬 Chat only"}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Compose (rich text + images)">
            <RichEditor value={html} onChange={setHtml} placeholder="Type formatted text, paste images, insert tables…" minHeight={120} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Btn variant="primary" size="lg" onClick={() => speakNow()}>▶ Speak now</Btn>
            <Btn variant="ghost" onClick={() => bus.emit("speak-pause")} disabled={!speaker.speaking}>⏸ Pause</Btn>
            <Btn variant="ghost" onClick={() => bus.emit("speak-resume")} disabled={speaker.speaking}>▶ Resume</Btn>
            <Btn variant="danger" onClick={() => bus.emit("speak-stop")}>⏹ Stop</Btn>
            <span className="flex-1" />
            <Btn variant="soft" onClick={addToQueue}>＋ Add to chronological queue</Btn>
          </div>
        </div>
      </Section>

      {npc && npc.quickActions.length > 0 && (
        <Section title="Quick reactions">
          <div className="flex flex-wrap gap-2">
            {npc.quickActions.map((qa) => (
              <button
                key={qa.id}
                onClick={() => speakNow(`<span>${escapeHtml(qa.say)}</span>`, qa.emoji)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-sm transition"
                title={qa.say}
              >
                <span>{qa.emoji}</span>
                <span className="text-slate-700">{qa.label}</span>
              </button>
            ))}
            <button
              onClick={raiseHand}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 hover:bg-amber-100 text-sm transition"
            >
              <span>✋</span>
              <span className="text-amber-800">Raise hand</span>
            </button>
          </div>
        </Section>
      )}

      {npc && npc.catchphrases.length > 0 && (
        <Section title="Catchphrases">
          <div className="flex flex-wrap gap-2">
            {npc.catchphrases.map((c, i) => (
              <button
                key={i}
                onClick={() => speakNow(`<span>${escapeHtml(c)}</span>`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-sm transition"
              >
                "{c}"
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section
        title={`Chronological queue (${queue.length})`}
        right={
          <div className="flex gap-1">
            <Btn variant="success" disabled={!queue.length} onClick={playQueue}>▶ Play queue</Btn>
            <Btn variant="danger" onClick={stopQueue}>⏹ Stop</Btn>
            <Btn variant="ghost" onClick={() => setQueue([])}>Clear</Btn>
          </div>
        }
      >
        {queue.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-6">Add messages above to build a timeline.</div>
        ) : (
          <div className="space-y-2">
            {queue.map((q) => {
              const np = npcs.find((n) => n.id === q.npcId);
              return (
                <div key={q.id} className="flex gap-2 p-2 border border-slate-200 rounded-xl bg-white">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center font-bold text-indigo-700 text-sm">
                    {np?.avatar ? <img src={np.avatar} className="w-full h-full object-cover" /> : (np?.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-700">{np?.name} <span className="text-slate-400 font-normal ml-1">{q.mode}</span></div>
                    <div className="text-xs text-slate-600 line-clamp-2" dangerouslySetInnerHTML={{ __html: q.html }} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <button className="text-xs px-1 text-slate-400 hover:text-slate-700" onClick={() => moveQueue(q.id, -1)}>▲</button>
                    <button className="text-xs px-1 text-slate-400 hover:text-slate-700" onClick={() => moveQueue(q.id, 1)}>▼</button>
                  </div>
                  <Btn variant="ghost" size="icon" onClick={() => removeFromQueue(q.id)}>✕</Btn>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function escapeHtml(s: string) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function wait(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }
