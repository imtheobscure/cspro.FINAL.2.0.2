import { useGameState } from "../../engine/store";
import { patchSettings } from "../../engine/actions";
import { audio } from "../../engine/audio";
import { Button, Card, Field, Select, SectionTitle } from "../primitives";
import { useState, useEffect } from "react";
import type { CEFRLevel, Difficulty, Tone } from "../../engine/types";

const TONES: Tone[] = ["epic","dark","comedic","mysterious","romantic","horror","whimsical"];
const DIFFS: Difficulty[] = ["story","normal","hard","nightmare"];
const CEFR: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

function NarratorVoice() {
  const state = useGameState();
  const [filter, setFilter] = useState("");
  const voices = audio.voices.filter((v) => (v.name + v.lang).toLowerCase().includes(filter.toLowerCase()));
  
  // Default to Microsoft Ava Multilingual
  useEffect(() => {
    if (!state.settings.narratorVoiceURI && voices.length > 0) {
      const ava = voices.find(v => v.name.toLowerCase().includes("ava") && v.name.toLowerCase().includes("microsoft"));
      if (ava) patchSettings({ narratorVoiceURI: ava.voiceURI });
    }
  }, [voices, state.settings.narratorVoiceURI]);

  return (
    <Card>
      <SectionTitle>Narrator Voice</SectionTitle>
      <input className="mb-1 w-full rounded-lg bg-slate-900/70 px-3 py-2 text-sm text-slate-100 ring-1 ring-white/10"
        placeholder="Filter voices…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <Select value={state.settings.narratorVoiceURI ?? ""} onChange={(e) => patchSettings({ narratorVoiceURI: e.target.value || undefined })}>
        <option value="">(default voice)</option>
        {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} — {v.lang}</option>)}
      </Select>
      <Button className="mt-2" size="sm" variant="subtle" onClick={() => audio.speak("The story begins, and shadows gather at the edge of the world.", state.settings.narratorVoiceURI)}>
        🔊 Test Narrator
      </Button>
    </Card>
  );
}

export function SettingsTab() {
  const s = useGameState().settings;
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Universe Settings</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Tone">
            <Select value={s.tone} onChange={(e) => patchSettings({ tone: e.target.value as Tone })}>
              {TONES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Global Difficulty" hint="Per-player scaling affects AI dilemmas">
            <Select value={s.difficulty} onChange={(e) => patchSettings({ difficulty: e.target.value as Difficulty })}>
              {DIFFS.map((d) => <option key={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="CEFR Level" hint="Story Maker must follow this level strictly">
            <Select value={s.cefrLevel} onChange={(e) => patchSettings({ cefrLevel: e.target.value as CEFRLevel })}>
              {CEFR.map((d) => <option key={d}>{d}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      <NarratorVoice />

      <Card>
        <SectionTitle>Gameplay Toggles</SectionTitle>
        <div className="space-y-2 text-sm">
          <Toggle label="💰 Scoring (creativity / logic / teamwork)" checked={s.scoringEnabled} onChange={(v) => patchSettings({ scoringEnabled: v })} />
          <Toggle label="🗳️ Group consensus mode (anonymous voting)" checked={s.consensusMode} onChange={(v) => patchSettings({ consensusMode: v })} />
        </div>
      </Card>

      <Card>
        <SectionTitle>Accessibility</SectionTitle>
        <div className="space-y-2 text-sm">
          <Toggle label="🔳 High-contrast leaderboard" checked={s.highContrast} onChange={(v) => patchSettings({ highContrast: v })} />
          <Toggle label="⌨️ Keyboard-only input mode" checked={s.keyboardOnly} onChange={(v) => patchSettings({ keyboardOnly: v })} />
          <p className="text-xs text-slate-400">All text is screen-reader friendly; progress bars expose ARIA values.</p>
        </div>
      </Card>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2 ring-1 ring-white/10">
      <span>{label}</span>
      <button onClick={() => onChange(!checked)} role="switch" aria-checked={checked}
        className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-violet-500" : "bg-slate-600"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}
