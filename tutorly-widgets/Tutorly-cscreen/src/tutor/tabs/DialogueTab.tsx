import { useState, useRef } from "react";
import { useStore, store, bus, uid } from "../../state/store";
import { Btn, TInput, TTextarea } from "../../ui/primitives";
import { Field, Section } from "../shared";
import type { Dialogue, DialogueLine } from "../../state/types";
import { sanitizeForSpeech } from "../../lib/speech";
import { requestSpeech } from "../../chat/speech";

export default function DialogueTab() {
  const npcs = useStore((s) => s.npcs);
  const tutor = useStore((s) => s.tutor);
  const dialogues = useStore((s) => s.dialogues);
  const [selectedNpcs, setSelectedNpcs] = useState<string[]>([]);
  const [timeAndPlace, setTimeAndPlace] = useState("");
  const [topic, setTopic] = useState("");
  const [reuse, setReuse] = useState("");
  const [sample, setSample] = useState("");
  const [count, setCount] = useState(5);
  const [customInstructions, setCustomInstructions] = useState("");
  const [paste, setPaste] = useState("");
  const [active, setActive] = useState<Dialogue | null>(null);
  const stopRef = useRef(false);
  const playingRef = useRef(false);

  function toggleNpc(id: string) {
    setSelectedNpcs((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function buildPrompt() {
    const picks = npcs.filter((n) => selectedNpcs.includes(n.id));
    const tutorInfo = `Teacher: ${tutor.name}. ${tutor.info}. Facts: ${tutor.facts}`;
    const npcInfo = picks
      .map((n) => `- ${n.name} (${n.role}). Personality: ${n.personality}. L1: ${n.L1}. Tone: ${n.tone}. Mood: ${n.mood}. Relationship to learner: ${n.relationshipToLearner}. Multilingual: ${n.multilingual}.`)
      .join("\n");
    return `You are generating role-play conversations for a live online language class.

PARTICIPANTS (use their personalities and voices realistically):
${npcInfo || "(none selected)"}

TEACHER CONTEXT:
${tutorInfo}

SCENE:
- Time and place: ${timeAndPlace}
- Topic and purpose: ${topic}
- Grammar/vocabulary to reuse: ${reuse}

SAMPLE DIALOGUE / LESSON TEXT TO BASE ON:
${sample}

INSTRUCTIONS:
- Generate ${count} DIFFERENT short conversations (varied registers, moods, twists), each personalized for the listed participants.
- Mark questions intended for the learner with "isQuestion": true and include 2-4 short branch suggestions for other learners to answer in "branches": [...].
- Output STRICTLY as JSON, an array of length ${count}, each item: { "title": string, "lines": [ { "npcId": string, "text": string, "isQuestion"?: boolean, "branches"?: string[] } ] }
- Use these exact npcId values: ${picks.map((n) => `"${n.id}"`).join(", ")}
- Keep each line natural and short (1-2 sentences), reusing the target vocabulary.
- Do not include any prose outside the JSON.
${customInstructions ? `\nCUSTOM INSTRUCTIONS FROM TEACHER:\n${customInstructions}` : ""}`;
  }

  async function copyPrompt() {
    try { await navigator.clipboard.writeText(buildPrompt()); alert("Prompt copied to clipboard ✓"); }
    catch { alert("Could not copy. Select the text below and copy manually."); }
  }

  function importJson() {
    try {
      const parsed = JSON.parse(paste);
      if (!Array.isArray(parsed)) throw new Error("Expected an array");
      const arr: Dialogue[] = parsed.map((p: any) => ({
        id: uid("d_"),
        title: String(p.title || "Conversation"),
        lines: (p.lines || []).map((l: any) => ({
          npcId: String(l.npcId),
          text: String(l.text),
          isQuestion: !!l.isQuestion,
          branches: Array.isArray(l.branches) ? l.branches.map(String) : undefined,
        })),
      }));
      store.set((s) => { s.dialogues = [...s.dialogues, ...arr]; return { ...s }; });
      setPaste("");
      alert(`Imported ${arr.length} conversations.`);
    } catch (e: any) {
      alert("Invalid JSON: " + e.message);
    }
  }

  function update(d: Dialogue) {
    store.set((s) => { s.dialogues = s.dialogues.map((x) => x.id === d.id ? d : x); return { ...s }; });
    if (active?.id === d.id) setActive(d);
  }
  function remove(id: string) {
    if (!confirm("Delete conversation?")) return;
    store.set((s) => { s.dialogues = s.dialogues.filter((d) => d.id !== id); return { ...s }; });
    if (active?.id === id) setActive(null);
  }

  async function play(d: Dialogue) {
    if (playingRef.current) return;
    playingRef.current = true;
    stopRef.current = false;
    for (const line of d.lines) {
      if (stopRef.current) break;
      const np = store.get().npcs.find((n) => n.id === line.npcId);
      if (!np) continue;
      bus.emit("npc-typing", { npcId: np.id });
      await wait(700 + Math.random() * 800);
      bus.emit("npc-typing", { npcId: null });
      // One call does both halves: it posts the line with the character's round
      // photo AND starts their voice, here in this window — the classroom screen
      // only has to follow along.
      await new Promise<void>((resolve) => {
        let done = false;
        const off = bus.on((ev) => {
          if (ev.type === "speech-ended" && !done) { done = true; off(); resolve(); }
        });
        requestSpeech(np.id, sanitizeForSpeech(line.text));
        setTimeout(() => { if (!done) { done = true; off(); resolve(); } }, line.text.length * 90 + 6000);
      });
      if (line.isQuestion && line.branches?.length) {
        // post branches as system message
        store.set((s) => {
          s.messages = [...s.messages, {
            id: uid("m_"),
            html: `🔀 <i>Possible answers:</i><br>` + line.branches!.map((b) => `• ${escapeHtml(b)}`).join("<br>"),
            authorName: "System",
            ts: Date.now(),
            system: true,
          }];
          return { ...s };
        });
        await wait(2500);
      } else {
        await wait(800);
      }
    }
    playingRef.current = false;
  }

  function stop() {
    stopRef.current = true;
    bus.emit("speak-stop");
    bus.emit("npc-typing", { npcId: null });
  }

  return (
    <div className="space-y-4">
      <Section title="Build conversation prompt">
        <div className="space-y-3">
          <Field label={`Select participants (${selectedNpcs.length})`}>
            <div className="flex flex-wrap gap-2">
              {npcs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => toggleNpc(n.id)}
                  className={
                    "px-2 py-1 rounded-full border text-xs flex items-center gap-1 transition " +
                    (selectedNpcs.includes(n.id) ? "bg-indigo-500 text-white border-indigo-600" : "bg-white border-slate-200 hover:border-slate-300")
                  }
                >
                  <span className="w-5 h-5 rounded-full overflow-hidden bg-white/30">
                    {n.avatar && <img src={n.avatar} className="w-full h-full object-cover" />}
                  </span>
                  {n.name}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Time and place"><TInput value={timeAndPlace} onChange={(e) => setTimeAndPlace(e.target.value)} placeholder="A cozy cafe, Saturday afternoon" /></Field>
            <Field label="Topic and purpose"><TInput value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ordering food and small talk" /></Field>
            <Field label="Language to reuse"><TInput value={reuse} onChange={(e) => setReuse(e.target.value)} placeholder="Past simple, food vocabulary" /></Field>
            <Field label="How many conversations"><TInput type="number" value={count} onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))} /></Field>
          </div>
          <Field label="Sample dialogue / lesson text"><TTextarea rows={4} value={sample} onChange={(e) => setSample(e.target.value)} placeholder="Paste textbook dialogue or lesson notes here…" /></Field>
          <Field label="Custom instructions (optional)"><TTextarea rows={2} value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} placeholder="e.g. Create super long conversations, focus on past tense, add cultural notes..." /></Field>
          <div className="flex gap-2">
            <Btn variant="primary" onClick={copyPrompt}>📋 Copy Prompt</Btn>
            <Btn variant="ghost" onClick={() => { setTimeAndPlace(""); setTopic(""); setReuse(""); setSample(""); }}>Clear fields</Btn>
          </div>
        </div>
      </Section>

      <Section title="Paste AI response (JSON array)">
        <TTextarea rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder='[ { "title": "...", "lines": [ { "npcId": "...", "text": "...", "isQuestion": true, "branches": ["..."] } ] } ]' className="font-mono text-xs" />
        <div className="mt-2"><Btn variant="success" onClick={importJson}>Import conversations</Btn></div>
      </Section>

      <Section title={`Saved conversations (${dialogues.length})`}>
        {dialogues.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-6">No conversations yet.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {dialogues.map((d) => (
              <div key={d.id} className={"border rounded-xl p-3 bg-white " + (active?.id === d.id ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200")}>
                <div className="flex items-center gap-2">
                  <div className="flex-1 font-semibold truncate">{d.title}</div>
                  <Btn size="sm" variant="ghost" onClick={() => setActive(d)}>Open</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => remove(d.id)}>🗑</Btn>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">{d.lines.length} lines</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {active && (
        <Section
          title={`Editing: ${active.title}`}
          right={
            <div className="flex gap-1">
              <Btn variant="success" onClick={() => play(active)}>▶ Play</Btn>
              <Btn variant="ghost" onClick={() => bus.emit("speak-pause")}>⏸</Btn>
              <Btn variant="ghost" onClick={() => bus.emit("speak-resume")}>▶</Btn>
              <Btn variant="danger" onClick={stop}>⏹ Stop</Btn>
            </div>
          }
        >
          <DialogueEditor d={active} onChange={update} />
        </Section>
      )}
    </div>
  );
}

function DialogueEditor({ d, onChange }: { d: Dialogue; onChange: (d: Dialogue) => void }) {
  const npcs = useStore((s) => s.npcs);
  function setLine(i: number, patch: Partial<DialogueLine>) {
    onChange({ ...d, lines: d.lines.map((l, j) => (i === j ? { ...l, ...patch } : l)) });
  }
  function rmLine(i: number) {
    onChange({ ...d, lines: d.lines.filter((_, j) => i !== j) });
  }
  function addLine() {
    onChange({ ...d, lines: [...d.lines, { npcId: npcs[0]?.id || "", text: "" }] });
  }
  function setTitle(t: string) { onChange({ ...d, title: t }); }
  return (
    <div className="space-y-2">
      <TInput value={d.title} onChange={(e) => setTitle(e.target.value)} className="font-semibold" />
      {d.lines.map((l, i) => (
        <div key={i} className="border border-slate-200 rounded-lg p-2 bg-slate-50/40 space-y-1">
          <div className="flex items-center gap-1">
            <select value={l.npcId} onChange={(e) => setLine(i, { npcId: e.target.value })} className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white">
              {npcs.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
            <label className="text-xs flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-lg">
              <input type="checkbox" checked={!!l.isQuestion} onChange={(e) => setLine(i, { isQuestion: e.target.checked })} />
              Question
            </label>
            <span className="flex-1" />
            <Btn variant="ghost" size="icon" onClick={() => rmLine(i)}>✕</Btn>
          </div>
          <TInput value={l.text} onChange={(e) => setLine(i, { text: e.target.value })} placeholder="Line text…" />
          {l.isQuestion && (
            <TInput
              value={(l.branches || []).join(" | ")}
              onChange={(e) => setLine(i, { branches: e.target.value.split("|").map((s) => s.trim()).filter(Boolean) })}
              placeholder="Branch suggestions (separate by |)"
            />
          )}
        </div>
      ))}
      <Btn variant="ghost" size="sm" onClick={addLine}>＋ Add line</Btn>
    </div>
  );
}

function escapeHtml(s: string) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
function wait(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }
