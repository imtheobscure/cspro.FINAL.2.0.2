import { useGameState } from "../../engine/store";
import { addNPC, addPlayer, removeEntity, resetAllCharacterVoices, updateEntity, patchSettings } from "../../engine/actions";
import { audio } from "../../engine/audio";
import { CHARACTER_CATEGORIES, BASE_EMOJI_TO_CATEGORY, emojiForLevel } from "../../engine/characterCatalog";
import { Badge, Button, Card, Field, Input, Select, Textarea, SectionTitle } from "../primitives";
import { useState, useEffect } from "react";
import type { Entity } from "../../engine/types";

/** Voice picker — auto-fills with a forced natural Edge voice (never David). */
function VoicePicker({ value, onChange, label }: { value?: string; onChange: (v: string) => void; label?: string }) {
  const [filter, setFilter] = useState("");
  const naturals = audio.naturalVoices();
  const voices = naturals.filter((v) =>
    (v.name + v.lang).toLowerCase().includes(filter.toLowerCase()),
  );

  useEffect(() => {
    if (!value && naturals.length > 0) {
      const ava = naturals.find((v) => v.name.toLowerCase().includes("ava"));
      onChange((ava || naturals[0]).voiceURI);
    }
  }, []);

  return (
    <div className="space-y-1">
      <Input placeholder="Filter natural English voices… (US/GB/AU/CA/IE/NZ/IN)" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <Select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">(default — pick Microsoft Ava or any Natural voice)</option>
        {voices.map((v) => (
          <option key={v.voiceURI} value={v.voiceURI}>{v.name} — {v.lang}</option>
        ))}
      </Select>
      <Button size="sm" variant="subtle" onClick={() => audio.speak(label || "This is a voice test for narration.", value)}>
        🔊 Test voice
      </Button>
    </div>
  );
}

/**
 * Shows the full 5-level ladder for the character's catalog. Lets the GM
 * manually move a character up or down. The visible emoji on the
 * leaderboard, on the canvas, everywhere — is ALWAYS taken from this
 * ladder at the character's evolutionLevel (0..5).
 */
function EvolutionLadder({ e }: { e: Entity }) {
  const cat = BASE_EMOJI_TO_CATEGORY[e.emoji];
  if (!cat) {
    return (
      <Card className="space-y-2 bg-slate-950/40">
        <SectionTitle>🧬 Level-Up Evolution</SectionTitle>
        <p className="text-[11px] text-slate-400">
          The current base emoji <b className="text-amber-300">{e.emoji}</b> isn't one of the
          20 supported character categories. Pick one of the 20 base emojis
          below to enable a 5-level evolution ladder (or pick a different emoji
          for this character).
        </p>
      </Card>
    );
  }
  const level = Math.max(0, Math.min(5, e.evolutionLevel ?? 0));
  return (
    <Card className="space-y-2 bg-slate-950/40">
      <SectionTitle>🧬 {cat.displayName} — Level {level}/5</SectionTitle>
      <div className="flex items-center gap-2">
        <span
          className="text-5xl drop-shadow-[0_0_24px_rgba(250,204,21,.55)]"
          title={`Level ${level} emoji`}
        >{emojiForLevel(cat, level)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-400">{cat.ladder.map((l) => l.emoji).join(" → ")} → {cat.finalEmoji}</p>
          <p className="text-[10px] text-amber-300/80">The leaderboard always shows the level emoji. Levels go from 0 (baby) to 5 (final adult form).</p>
        </div>
      </div>
      <div className="grid grid-cols-6 gap-1">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => updateEntity(e.id, { evolutionLevel: i })}
            className={`flex flex-col items-center gap-0.5 rounded-lg p-1.5 text-xs ${i === level ? "bg-amber-500/30 ring-1 ring-amber-400" : "bg-white/5 hover:bg-white/10"}`}
            title={`Level ${i}`}
          >
            <span className="text-2xl">{emojiForLevel(cat, i)}</span>
            <span className="text-[9px] text-slate-400">Lv {i}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function EntityEditor({ e }: { e: Entity }) {
  const isNPC = e.kind === "npc";
  const players = useGameState().entities.filter((x) => x.kind === "player");
  // The 20 base emojis from the catalog (deduplicated so Princess/Prince etc.
  // only appear once each).
  const baseEmojiChoices = Array.from(
    new Map(CHARACTER_CATEGORIES.map((c) => [c.baseEmoji, c])).values(),
  );

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="rounded-2xl bg-gradient-to-br from-white/20 to-violet-500/20 px-3 py-2 text-5xl shadow-[0_0_35px_rgba(167,139,250,.45)] [text-shadow:0_8px_18px_rgba(0,0,0,.45)]">
          {e.emoji}
        </span>
        <Input className="flex-1 font-bold" value={e.name} onChange={(ev) => updateEntity(e.id, { name: ev.target.value })} />
        <Badge color={e.color}>{isNPC ? "NPC" : "Player"}</Badge>
        <Button size="icon" variant="danger" onClick={() => removeEntity(e.id)} title="Remove">🗑️</Button>
      </div>

      <div>
        <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">Character Category (20 supported)</p>
        <div className="flex max-h-44 flex-wrap gap-1 overflow-y-auto rounded-lg bg-slate-900/40 p-2 ring-1 ring-white/10">
          {baseEmojiChoices.map((c) => (
            <button
              key={c.id}
              onClick={() => updateEntity(e.id, { emoji: c.baseEmoji, evolutionLevel: 0 })}
              className={`rounded p-1 text-xl hover:bg-white/10 ${e.emoji === c.baseEmoji ? "bg-violet-500/40 ring-1 ring-violet-400" : ""}`}
              title={`${c.displayName} (${c.gender})`}
            >
              {c.baseEmoji}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Name (Base) Emoji (or pick from 20)">
          <Input value={e.emoji} onChange={(ev) => updateEntity(e.id, { emoji: ev.target.value })} placeholder="Paste any emoji" className="text-2xl" />
        </Field>
        <Field label="Color">
          <input type="color" value={e.color} onChange={(ev) => updateEntity(e.id, { color: ev.target.value })} className="h-9 w-full rounded bg-transparent" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Background"><Textarea rows={2} value={e.background} onChange={(ev) => updateEntity(e.id, { background: ev.target.value })} /></Field>
        <Field label="Personality"><Textarea rows={2} value={e.personality} onChange={(ev) => updateEntity(e.id, { personality: ev.target.value })} /></Field>
        <Field label="Goals"><Textarea rows={2} value={e.goals} onChange={(ev) => updateEntity(e.id, { goals: ev.target.value })} /></Field>
        <Field label="Special Abilities"><Textarea rows={2} value={e.abilities} onChange={(ev) => updateEntity(e.id, { abilities: ev.target.value })} /></Field>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Focused Level (CEFR)" hint="AI uses this level strictly for this player's narration, dialogue, and hints.">
          <Select value={e.cefrLevel ?? "B1"} onChange={(ev) => updateEntity(e.id, { cefrLevel: ev.target.value as any })}>
            <option value="A1">A1 — Beginner</option>
            <option value="A2">A2 — Elementary</option>
            <option value="B1">B1 — Intermediate</option>
            <option value="B2">B2 — Upper-Intermediate</option>
            <option value="C1">C1 — Advanced</option>
            <option value="C2">C2 — Mastery</option>
          </Select>
        </Field>
        <Field label="Social Role (optional)"><Input value={e.role ?? ""} onChange={(ev) => updateEntity(e.id, { role: ev.target.value })} placeholder="e.g. Detective" /></Field>
      </div>

      {isNPC && (
        <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900/40 p-2 ring-1 ring-white/10">
          <input
            type="checkbox"
            checked={!!e.bilingual}
            onChange={(ev) => updateEntity(e.id, { bilingual: ev.target.checked })}
            className="h-4 w-4"
          />
          <span className="text-sm font-bold text-slate-200">🌐 Bilingual NPC</span>
          <span className="text-[10px] text-slate-400">— shows L1 + English translation + translation voice</span>
        </label>
      )}

      {isNPC && e.bilingual && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="NPC Native / L1 Language">
            <Input value={e.nativeLanguage ?? ""} onChange={(ev) => updateEntity(e.id, { nativeLanguage: ev.target.value })} placeholder="Spanish, Japanese, Arabic…" />
          </Field>
          <Field label="Learning Language (English target)">
            <Input value={e.learningLanguage ?? "English"} onChange={(ev) => updateEntity(e.id, { learningLanguage: ev.target.value })} placeholder="English" />
          </Field>
        </div>
      )}

      <Field label={`${isNPC ? "NPC" : "Player"} Voice (TTS — natural Edge voices only)`}>
        <VoicePicker value={e.voiceURI} onChange={(v) => updateEntity(e.id, { voiceURI: v })} />
      </Field>

      {isNPC && e.bilingual && (
        <Field label="Translation / Explanation Voice (TTS)">
          <VoicePicker value={e.translationVoiceURI} onChange={(v) => updateEntity(e.id, { translationVoiceURI: v })} />
        </Field>
      )}

      <div className="grid grid-cols-4 gap-2 text-xs">
        <Field label="HP"><Input type="number" value={e.health} onChange={(ev) => updateEntity(e.id, { health: +ev.target.value })} /></Field>
        <Field label="Max HP"><Input type="number" value={e.maxHealth} onChange={(ev) => updateEntity(e.id, { maxHealth: +ev.target.value })} /></Field>
        <Field label="Lives"><Input type="number" value={e.lives} onChange={(ev) => updateEntity(e.id, { lives: +ev.target.value })} /></Field>
        <Field label="Score"><Input type="number" value={e.score} onChange={(ev) => updateEntity(e.id, { score: +ev.target.value })} /></Field>
      </div>

      <EvolutionLadder e={e} />

      {isNPC && (
        <Field label="Relationship Meters → players">
          <div className="space-y-1">
            {players.map((p) => {
              const r = e.relationships.find((x) => x.targetId === p.id);
              return (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="w-24 truncate text-xs text-slate-300">{p.emoji} {p.name}</span>
                  <input type="range" min={-100} max={100} value={r?.value ?? 0} className="flex-1"
                    onChange={(ev) => {
                      const v = +ev.target.value;
                      const rels = e.relationships.filter((x) => x.targetId !== p.id);
                      updateEntity(e.id, { relationships: [...rels, { targetId: p.id, value: v }] });
                    }} />
                  <span className={`w-10 text-right text-xs ${(r?.value ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{r?.value ?? 0}</span>
                </div>
              );
            })}
          </div>
        </Field>
      )}
    </Card>
  );
}

export function PlayersTab() {
  const state = useGameState();
  const mode = state.settings.mode;
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Content Mode</SectionTitle>
        <div className="flex gap-2">
          <Button variant={mode === "adult" ? "primary" : "subtle"} onClick={() => patchSettings({ mode: "adult" })}>🔞 Adult (gore, hunger/thirst, evolution)</Button>
          <Button variant={mode === "kids" ? "primary" : "subtle"} onClick={() => patchSettings({ mode: "kids" })}>🧸 Kids (censored)</Button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {mode === "adult" ? "Graphic stakes enabled." : "Violence censored. No death — characters are 'defeated'."}
        </p>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={addPlayer}>＋ Add Player</Button>
        <Button variant="subtle" onClick={addNPC}>＋ Add NPC</Button>
        <Button variant="subtle" onClick={resetAllCharacterVoices}>🔁 Reapply all selected voices</Button>
      </div>

      <div className="space-y-3">
        {state.entities.map((e) => <EntityEditor key={e.id} e={e} />)}
      </div>
    </div>
  );
}
