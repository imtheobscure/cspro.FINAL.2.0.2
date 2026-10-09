import { useState } from "react";
import { useGameState, store } from "../../engine/store";
import { addEffect, removeEffect, setPaused, updateEffect } from "../../engine/actions";
import { audio } from "../../engine/audio";
import { Button, Card, Field, Input, Select, SectionTitle } from "../primitives";
import type { AnimKind } from "../../engine/types";

const ANIMS: AnimKind[] = ["burst","shake","spin","pulse","rain","float","zoom","flash","slide","wobble"];

const EFFECT_TEMPLATES = [
  { name: "Critical Hit", emoji: "💥", animation: "burst" as AnimKind, color: "#f97316", defaultSound: "https://assets.mixkit.co/active_storage/sfx/2017/impact-bass-horse-1383.mp3" },
  { name: "Jump Scare", emoji: "😱", animation: "flash" as AnimKind, color: "#ef4444", defaultSound: "https://assets.mixkit.co/active_storage/sfx/2827/scary-horror-ambience-014.mp3" },
  { name: "Earthquake", emoji: "🌋", animation: "shake" as AnimKind, color: "#dc2626", defaultSound: "https://assets.mixkit.co/active_storage/sfx/2094/quake-04-1099.wav" },
  { name: "Time Warp", emoji: "🌀", animation: "spin" as AnimKind, color: "#8b5cf6", defaultSound: "https://assets.mixkit.co/active_storage/sfx/1675/wind-blaster-1943.mp3" },
  { name: "Heartbeat", emoji: "❤️", animation: "pulse" as AnimKind, color: "#ec4899", defaultSound: "https://assets.mixkit.co/active_storage/sfx/1816/heart-beat-distant-1143.wav" },
  { name: "Blood Rain", emoji: "🩸", animation: "rain" as AnimKind, color: "#b91c1c", defaultSound: "https://assets.mixkit.co/active_storage/sfx/2515/rain-1.mp3" },
  { name: "Ascension", emoji: "👼", animation: "float" as AnimKind, color: "#38bdf8", defaultSound: "https://assets.mixkit.co/active_storage/sfx/1010/angelical-tones-1413.mp3" },
  { name: "Boss Reveal", emoji: "👹", animation: "zoom" as AnimKind, color: "#7c3aed", defaultSound: "https://assets.mixkit.co/active_storage/sfx/1671/horror-hit-1943.mp3" },
  { name: "Lightning", emoji: "⚡", animation: "flash" as AnimKind, color: "#facc15", defaultSound: "https://assets.mixkit.co/active_storage/sfx/1703/lightning-bolt-2570.mp3" },
  { name: "Phantom Slide", emoji: "👻", animation: "slide" as AnimKind, color: "#64748b", defaultSound: "https://assets.mixkit.co/active_storage/sfx/175/ghost-appear-1440.mp3" },
  { name: "Treasure", emoji: "💎", animation: "burst" as AnimKind, color: "#06b6d4", defaultSound: "https://assets.mixkit.co/active_storage/sfx/2017/coin-pickup-1383.mp3" },
  { name: "Drunken Haze", emoji: "🍺", animation: "wobble" as AnimKind, color: "#d97706", defaultSound: "https://assets.mixkit.co/active_storage/sfx/1675/crowd-laugh-1943.mp3" },
];

export function EffectsTab() {
  const state = useGameState();
  const [showTemplates, setShowTemplates] = useState(false);
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);
  
  const pickLocal = (effectId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*";
    input.onchange = (e: any) => {
      const f = e.target.files?.[0];
      if (f) {
        const reader = new FileReader();
        reader.onload = (re) => {
          if (re.target?.result) updateEffect(effectId, { soundUrl: re.target.result as string });
        };
        reader.readAsDataURL(f);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle action={
          <div className="flex gap-2">
            <Button size="sm" variant={state.paused ? "primary" : "subtle"} onClick={() => setPaused(!state.paused)}>
              {state.paused ? "▶ Resume" : "⏸ Pause All"}
            </Button>
            <Button size="sm" variant="primary" onClick={addEffect}>＋ Custom Effect</Button>
          </div>
        }>
          Effect Deck
        </SectionTitle>
        <p className="text-xs text-slate-400 mb-2">Trigger 3D emoji animations on the shared canvas. Each effect plays its own sound. <b>Jump-scares are NOT auto-fired from AI HTML</b> — trigger them only when you choose.</p>
        <Button size="sm" variant="subtle" onClick={() => setShowTemplates((v) => !v)}>
          {showTemplates ? "▼" : "▶"} Show Effect Templates ({EFFECT_TEMPLATES.length})
        </Button>
      </Card>

      {showTemplates && (
        <Card className="border-2 border-violet-500/30 bg-violet-500/5">
          <SectionTitle>Effect Templates</SectionTitle>
          <p className="text-xs text-slate-400 mb-3">Click a template to add it to your deck. Each includes a default sound — you can override with a sound file from your PC.</p>
          <div className="grid grid-cols-3 gap-2">
            {EFFECT_TEMPLATES.map((t) => (
              <button
                key={t.name}
                onClick={() => addEffect()}
                onDoubleClick={() => {
                  addEffect();
                  setTimeout(() => {
                    const last = store.getSnapshot().effects.at(-1);
                    if (last) updateEffect(last.id, { name: t.name, emoji: t.emoji, animation: t.animation, color: t.color, soundUrl: t.defaultSound });
                  }, 100);
                }}
                onMouseEnter={() => setHoveredTemplate(t.name)}
                onMouseLeave={() => setHoveredTemplate(null)}
                className="flex flex-col items-center gap-1 rounded-lg bg-slate-900/50 p-3 text-center ring-1 ring-white/10 transition hover:bg-violet-500/20"
                title="Click to add empty, double-click to add with template"
              >
                <div className="text-3xl" style={{ filter: `drop-shadow(0 0 12px ${t.color})` }}>{t.emoji}</div>
                <div className="text-xs font-bold" style={{ color: t.color }}>{t.name}</div>
                {hoveredTemplate === t.name && (
                  <div className="text-[9px] text-slate-500 mt-1">Click: empty | 2x: full</div>
                )}
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {state.effects.map((fx) => (
          <Card key={fx.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => { store.command({ type: "TRIGGER_EFFECT", effect: fx }); if (fx.soundUrl) audio.playFx(fx.soundUrl); }}
                className="grid h-14 w-14 place-items-center rounded-xl text-3xl ring-1 ring-white/10 transition hover:scale-105"
                style={{ background: fx.color + "22", boxShadow: `0 0 24px ${fx.color}44` }}
                title="Trigger on canvas (with sound)">
                {fx.emoji}
              </button>
              <div className="min-w-0 flex-1 space-y-1">
                <Input value={fx.name} onChange={(e) => updateEffect(fx.id, { name: e.target.value })} className="font-bold" />
                <div className="flex gap-1">
                  <Input value={fx.emoji} onChange={(e) => updateEffect(fx.id, { emoji: e.target.value })} className="w-14 text-center" />
                  <input type="color" value={fx.color} onChange={(e) => updateEffect(fx.id, { color: e.target.value })} className="h-9 w-10 rounded bg-transparent" />
                  <Button size="icon" variant="danger" onClick={() => removeEffect(fx.id)}>🗑️</Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Animation">
                <Select value={fx.animation} onChange={(e) => updateEffect(fx.id, { animation: e.target.value as AnimKind })}>
                  {ANIMS.map((a) => <option key={a}>{a}</option>)}
                </Select>
              </Field>
              <Field label="Color">
                <input type="color" value={fx.color} onChange={(e) => updateEffect(fx.id, { color: e.target.value })} className="h-9 w-full rounded bg-transparent" />
              </Field>
            </div>
            <Field label="🔊 Sound (URL or local file)">
              <div className="flex gap-1">
                <Input value={fx.soundUrl} onChange={(e) => updateEffect(fx.id, { soundUrl: e.target.value })} placeholder="https://… or local file" className="flex-1" />
                <Button size="sm" variant="subtle" onClick={() => pickLocal(fx.id)} title="Pick sound from PC">📁</Button>
                <Button size="sm" variant="subtle" disabled={!fx.soundUrl} onClick={() => audio.playFx(fx.soundUrl, 1)}>▶</Button>
              </div>
            </Field>
          </Card>
        ))}
      </div>

      {state.effects.length === 0 && (
        <Card><p className="text-sm text-slate-500 text-center">No effects. Click "Show Effect Templates" above and add some, or create custom ones with "+ Custom Effect".</p></Card>
      )}
    </div>
  );
}
