import { useEffect, useState } from "react";
import { useStore, store, uid } from "../../state/store";
import { requestSpeech } from "../../chat/speech";
import { Btn, TInput, TTextarea } from "../../ui/primitives";
import { AvatarInput, Field, Section, VoicePicker } from "../shared";
import type { NPC } from "../../state/types";
import { getPreferredDefaultVoiceURI, onVoicesReady } from "../../lib/speech";
import { pickAvatar } from "../../lib/avatars";

/**
 * A new character starts as a real person: a photo from the built-in portrait
 * library, preferring one nobody in the room is already using.
 */
function emptyNpc(taken: string[] = []): NPC {
  return {
    id: uid("npc_"),
    name: "",
    avatar: pickAvatar(taken),
    role: "",
    voiceURI: getPreferredDefaultVoiceURI(),
    personality: "",
    speechSpeed: 1,
    pitch: 1,
    relationshipToLearner: "Classmate",
    tone: "Friendly",
    mood: "Happy",
    L1: "English",
    spokenLanguages: "English",
    multilingual: false,
    catchphrases: [],
    quickActions: [
      { id: uid("qa_"), emoji: "👍", label: "Agree", say: "Yes, I agree!" },
      { id: uid("qa_"), emoji: "❓", label: "Confused", say: "Sorry, I don't understand." },
    ],
    mic: true,
  };
}

export default function ParticipantsTab() {
  const npcs = useStore((s) => s.npcs);
  const [editing, setEditing] = useState<NPC | null>(null);

  function save(n: NPC) {
    // A character keeps the voice the tutor chose for them: only fall back to the
    // preferred voice when none was picked. Forcing it here used to wipe every
    // hand-picked voice on save, so a class of characters all sounded identical.
    const normalized = { ...n, voiceURI: n.voiceURI || getPreferredDefaultVoiceURI() };
    store.set((s) => {
      const exists = s.npcs.find((x) => x.id === normalized.id);
      s.npcs = exists ? s.npcs.map((x) => (x.id === normalized.id ? normalized : x)) : [...s.npcs, normalized];
      return { ...s };
    });
    setEditing(null);
  }

  function remove(id: string) {
    if (!confirm("Remove this participant?")) return;
    store.set((s) => {
      s.npcs = s.npcs.filter((n) => n.id !== id);
      return { ...s };
    });
  }

  function speakAs(n: NPC) {
    const phrase = n.catchphrases[0] || `Hi, I'm ${n.name}. ${n.personality || ""}`;
    // requestSpeech drives the same classroom pipeline as the Speak tab, and
    // leaves the character's bubble (with their photo) in the chat.
    requestSpeech(n.id, phrase, null);
  }

  return (
    <div className="space-y-4">
      <Section
        title={`All participants (${npcs.length})`}
        right={
          <Btn variant="primary" onClick={() => setEditing(emptyNpc(npcs.map((n) => n.avatar)))}>
            ＋ Add participant
          </Btn>
        }
      >
        {npcs.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            <div className="text-4xl mb-2">👥</div>
            No participants yet. Click "Add participant" to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {npcs.map((n) => (
              <div key={n.id} className="flex gap-3 p-3 border border-slate-200 rounded-xl hover:border-indigo-300 transition bg-white">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center font-bold text-indigo-700">
                  {n.avatar ? <img src={n.avatar} className="w-full h-full object-cover" /> : n.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{n.name || "(unnamed)"}</div>
                  <div className="text-[11px] text-slate-500 truncate">{n.role} · {n.tone} · {n.L1}</div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    speed {n.speechSpeed} · pitch {n.pitch} · {n.multilingual ? "multilingual" : "monolingual"}
                  </div>
                  <div className="flex gap-1 mt-2">
                    <Btn size="sm" variant="ghost" onClick={() => speakAs(n)}>▶ Speak</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => setEditing(n)}>✏️ Edit</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => remove(n.id)}>🗑</Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {editing && <Editor npc={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function Editor({ npc, onClose, onSave }: { npc: NPC; onClose: () => void; onSave: (n: NPC) => void }) {
  const [n, setN] = useState<NPC>(npc);
  const set = (patch: Partial<NPC>) => setN((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    // Only fill in a voice when this character has none — a character that was
    // given a voice on purpose must not be re-voiced when the list loads late.
    const applyPreferred = () => {
      const preferred = getPreferredDefaultVoiceURI();
      if (!preferred) return;
      setN((prev) => (prev.voiceURI ? prev : { ...prev, voiceURI: preferred }));
    };
    applyPreferred();
    onVoicesReady(applyPreferred);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={onClose}>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white/95 backdrop-blur z-10 border-b border-slate-100 px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold">{npc.name ? "Edit participant" : "New participant"}</h3>
          <div className="flex gap-1">
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" onClick={() => onSave(n)}>Save</Btn>
          </div>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Avatar"><AvatarInput value={n.avatar} onChange={(v) => set({ avatar: v })} /></Field>
          <Field label="Name"><TInput value={n.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Emma" /></Field>
          <Field label="Role"><TInput value={n.role} onChange={(e) => set({ role: e.target.value })} placeholder="e.g. Classmate, Cafe owner" /></Field>
          <Field label="Tone"><TInput value={n.tone} onChange={(e) => set({ tone: e.target.value })} placeholder="Friendly, Formal..." /></Field>
          <Field label="Mood"><TInput value={n.mood} onChange={(e) => set({ mood: e.target.value })} /></Field>
          <Field label="L1 (first language)"><TInput value={n.L1} onChange={(e) => set({ L1: e.target.value })} /></Field>
          <Field label="Spoken languages (comma)"><TInput value={n.spokenLanguages} onChange={(e) => set({ spokenLanguages: e.target.value })} /></Field>
          <Field label="Relationship to learner"><TInput value={n.relationshipToLearner} onChange={(e) => set({ relationshipToLearner: e.target.value })} /></Field>
          <div className="md:col-span-2"><Field label="Personality"><TTextarea rows={2} value={n.personality} onChange={(e) => set({ personality: e.target.value })} placeholder="Brief personality description" /></Field></div>
          <Field label={`Speech speed: ${n.speechSpeed}`}>
            <input type="range" min={0.8} max={1.2} step={0.05} value={n.speechSpeed} onChange={(e) => set({ speechSpeed: Number(e.target.value) })} className="w-full" />
          </Field>
          <Field label={`Pitch: ${n.pitch}`}>
            <input type="range" min={0.5} max={2} step={0.05} value={n.pitch} onChange={(e) => set({ pitch: Number(e.target.value) })} className="w-full" />
          </Field>
          <div className="md:col-span-2">
            <Field label="Voice">
              <VoicePicker value={n.voiceURI} onChange={(v) => set({ voiceURI: v })} rate={n.speechSpeed} pitch={n.pitch} />
            </Field>
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <input id="ml" type="checkbox" checked={n.multilingual} onChange={(e) => set({ multilingual: e.target.checked })} />
            <label htmlFor="ml" className="text-sm text-slate-700">Multilingual</label>
            <span className="mx-3 w-px h-4 bg-slate-200" />
            <input id="mic" type="checkbox" checked={n.mic} onChange={(e) => set({ mic: e.target.checked })} />
            <label htmlFor="mic" className="text-sm text-slate-700">Mic on by default</label>
          </div>

          {/* Catchphrases */}
          <div className="md:col-span-2">
            <Field label="Catchphrases (clickable in Speak tab)">
              <ListEditor items={n.catchphrases} onChange={(arr) => set({ catchphrases: arr })} placeholder="Add a catchphrase…" />
            </Field>
          </div>

          {/* Quick actions */}
          <div className="md:col-span-2">
            <Field label="Quick reactions / actions">
              <QuickActionsEditor items={n.quickActions} onChange={(arr) => set({ quickActions: arr })} />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}

function ListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (a: string[]) => void; placeholder?: string }) {
  const [v, setV] = useState("");
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        <TInput value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (v.trim()) { onChange([...items, v.trim()]); setV(""); } } }} />
        <Btn variant="primary" onClick={() => { if (v.trim()) { onChange([...items, v.trim()]); setV(""); } }}>Add</Btn>
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((it, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 rounded-full text-slate-700">
            {it}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-500">✕</button>
          </span>
        ))}
      </div>
    </div>
  );
}

function QuickActionsEditor({ items, onChange }: { items: NPC["quickActions"]; onChange: (a: NPC["quickActions"]) => void }) {
  function update(idx: number, patch: Partial<NPC["quickActions"][number]>) {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function add() {
    onChange([...items, { id: uid("qa_"), emoji: "✨", label: "New", say: "Hello!" }]);
  }
  return (
    <div className="space-y-1.5">
      {items.map((it, i) => (
        <div key={it.id} className="flex items-center gap-1">
          <TInput value={it.emoji} onChange={(e) => update(i, { emoji: e.target.value })} className="w-14 text-center" maxLength={4} />
          <TInput value={it.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Label" className="w-32" />
          <TInput value={it.say} onChange={(e) => update(i, { say: e.target.value })} placeholder="Says..." />
          <Btn variant="ghost" size="icon" onClick={() => onChange(items.filter((_, j) => j !== i))}>✕</Btn>
        </div>
      ))}
      <Btn variant="ghost" size="sm" onClick={add}>＋ Add quick action</Btn>
    </div>
  );
}
