import { useState } from "react";
import { store, useGameState } from "../../engine/store";
import { buildContinuationPrompt, buildScenePrompt } from "../../engine/promptGen";
import { deployScene } from "../../engine/actions";
import { interpretTriggers, sanitizeForCanvas } from "../../engine/triggers";
import { Button, Card, SectionTitle, Textarea, copyToClipboard } from "../primitives";
import { demoSceneHTML } from "../../engine/demo";

export function AITab() {
  const state = useGameState();
  const [html, setHtml] = useState("");
  const [copied, setCopied] = useState("");
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [showConversation, setShowConversation] = useState(false);

  const copy = async (text: string, label: string) => {
    await copyToClipboard(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  };

  const preview = html ? sanitizeForCanvas(html) : null;
  const parsed = html ? interpretTriggers(html, state) : null;

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle action={
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={() => copy(buildScenePrompt(state), "scene")}>
              {copied === "scene" ? "✓ Copied" : "📋 Copy Scene Prompt"}
            </Button>
            <Button size="sm" variant="subtle" disabled={state.chapters.length === 0} onClick={() => copy(buildContinuationPrompt(state), "cont")}>
              {copied === "cont" ? "✓ Copied" : "🔁 Copy Continuation"}
            </Button>
            <Button size="sm" variant="subtle" onClick={() => setShowConversation((v) => !v)}>
              💬 Whole Conversation
            </Button>
          </div>
        }>
          Story Maker Prompt
        </SectionTitle>
        <p className="text-xs text-slate-400">
          Compiles all profiles, universe, CEFR level, and game rules. Paste into your AI chat, then paste the returned HTML below.
        </p>
        {showConversation && <ConversationLog />}
      </Card>

      <Card>
        <SectionTitle>HTML Sandbox & Deploy</SectionTitle>
        <Textarea
          rows={8}
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          placeholder="Paste generated HTML5 scene here…"
          className="font-mono text-xs"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button variant="primary" disabled={!html.trim()} onClick={() => { deployScene(html); setHtml(""); }}>
            ▶ Deploy (3-2-1 → Canvas)
          </Button>
          <Button variant="subtle" disabled={!html.trim()} onClick={() => setShowSpoiler((s) => !s)}>
            👁️ {showSpoiler ? "Hide" : "Spoiler Peek"}
          </Button>
          <Button variant="subtle" onClick={() => setHtml(demoSceneHTML(state))}>✨ Load Elite Demo Scene</Button>
          {parsed && (
            <span className="text-xs text-slate-400">
              triggers: {countTriggers(parsed)} · speak: {parsed.speakQueue.length} · prompts: {parsed.prompts.length} · widgets: {parsed.widgets.length} · NPCs: {parsed.npcSuggestions.length}
            </span>
          )}
        </div>

        {showSpoiler && preview && (
          <div className="mt-3 overflow-hidden rounded-lg ring-1 ring-amber-400/40">
            <div className="bg-amber-500/15 px-2 py-1 text-xs font-bold text-amber-300">🔒 GM-only preview (players don't see this)</div>
            <iframe title="spoiler" sandbox="allow-same-origin" className="h-64 w-full border-0 bg-[#070a14]"
              srcDoc={`<style>body{margin:0;color:#e2e8f0;font-family:system-ui;background:#070a14}img{max-width:100%}</style>${preview.visible}`} />
          </div>
        )}
      </Card>

      {parsed && parsed.npcSuggestions.length > 0 && (
        <Card className="border-2 border-amber-500/30 bg-amber-500/5">
          <SectionTitle>🤖 NPC Suggestions (from AI)</SectionTitle>
          <p className="text-xs text-slate-400 mb-2">The AI suggested these NPCs for your universe. Click <b>Accept</b> to add them to the Players list (as editable NPCs) or <b>Decline</b> to skip.</p>
          <div className="space-y-2">
            {parsed.npcSuggestions.map((npc, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-900/50 p-2">
                <span className="text-3xl">{npc.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{npc.name} <span className="text-xs text-violet-300">· {npc.role}</span></div>
                  <div className="text-[10px] text-slate-400 truncate">{npc.background}</div>
                  <div className="text-[10px] text-slate-500">L1: {npc.nativeLanguage} | L2: {npc.learningLanguage}</div>
                </div>
                <Button size="sm" variant="primary" onClick={() => {
                  store.set((state) => ({
                    ...state,
                    entities: [...state.entities, {
                      id: Math.random().toString(36).slice(2, 10),
                      kind: "npc", name: npc.name, emoji: npc.emoji,
                      background: npc.background, personality: npc.personality, goals: npc.goals,
                      abilities: npc.abilities, language: "en-US",
                      nativeLanguage: npc.nativeLanguage, learningLanguage: npc.learningLanguage,
                      health: 100, maxHealth: 100, lives: 3, hunger: 0, thirst: 0, score: 0, deaths: 0, dead: false,
                      inventory: [], statuses: [], powerUps: [], relationships: [], role: npc.role, color: "#a78bfa",
                    } as any],
                  }));
                }}>✓ Accept</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {parsed && (
        <Card>
          <SectionTitle>Detected Triggers</SectionTitle>
          <div className="space-y-1 text-xs">
            {parsed.speakQueue.map((s, i) => (
              <div key={i} className="rounded bg-slate-900/60 px-2 py-1"><span className="text-violet-300">🗣️ {entityName(state, s.entityId)}:</span> {s.text}</div>
            ))}
            {parsed.prompts.map((p, i) => (
              <div key={"p" + i} className="rounded bg-slate-900/60 px-2 py-1"><span className="text-emerald-300">❓ {entityName(state, p.entityId)}:</span> {p.hints.join(" · ")}</div>
            ))}
            {parsed.visuals.map((v, i) => (
              <div key={"v" + i} className="rounded bg-slate-900/60 px-2 py-1 text-amber-300">✨ {v.kind} {JSON.stringify(v.data)}</div>
            ))}
            {parsed.widgets.map((w, i) => (
              <div key={"w" + i} className="rounded bg-slate-900/60 px-2 py-1 text-cyan-300">🧭 widget: {w.widget} · {w.action} · {w.title}</div>
            ))}
            {countTriggers(parsed) === 0 && <p className="text-slate-500">No triggers detected yet.</p>}
          </div>
        </Card>
      )}
    </div>
  );
}

function entityName(s: ReturnType<typeof useGameState>, id: string) {
  if (id === "narrator") return "Narrator";
  return s.entities.find((e) => e.id === id)?.name ?? id;
}
function countTriggers(p: ReturnType<typeof interpretTriggers>) {
  return p.speakQueue.length + p.prompts.length + p.visuals.length + p.celebrations.length + p.widgets.length + p.npcSuggestions.length;
}

function ConversationLog() {
  const state = useGameState();
  const rows = state.chapters.flatMap((c, ci) => interpretTriggers(c.html, state).speakQueue.map((s, si) => ({ chapter: ci + 1, i: si, ...s })));
  return (
    <div className="mt-3 max-h-64 overflow-y-auto rounded-lg bg-slate-950/60 p-3 ring-1 ring-white/10">
      {rows.length === 0 && <p className="text-xs text-slate-500">No spoken lines recorded yet.</p>}
      {rows.map((r) => (
        <div key={`${r.chapter}-${r.i}`} className="mb-1 text-xs text-slate-300">
          <span className="text-slate-500">Ch {r.chapter}</span> <span className={r.kind === "translation" ? "text-emerald-300" : "text-violet-300"}>{entityName(state, r.entityId)}{r.kind === "translation" ? " translation" : ""}:</span> {r.text}
        </div>
      ))}
    </div>
  );
}
