import { useGameState } from "../../engine/store";
import { addSoundscape, removeSoundscape, setActiveSoundscape, setManualWeather, setOpeningImage, updateSoundscape } from "../../engine/actions";
import { audio } from "../../engine/audio";
import { ambientSearchPhrase } from "../../engine/promptGen";
import { Button, Card, Field, Input, SectionTitle, copyToClipboard } from "../primitives";

export function SoundTab() {
  const state = useGameState();
  const weathers = ["clear", "rain", "snow", "fog", "storm", "embers", "ash", "dust", "leaves", "stars", "aurora", "heat", "bubbles"];

  const pickLocal = (id: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*";
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) updateSoundscape(id, { url: URL.createObjectURL(f), name: f.name.replace(/\.[^.]+$/, "") });
    };
    input.click();
  };

  const pickOpeningImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: any) => {
      const f = e.target.files?.[0];
      if (f) {
        const reader = new FileReader();
        reader.onload = (re) => {
          if (re.target?.result) setOpeningImage(re.target.result as string);
        };
        reader.readAsDataURL(f);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle action={<Button size="sm" variant="primary" onClick={() => addSoundscape()}>＋ Soundscape</Button>}>
          Environment
        </SectionTitle>
        <p className="text-xs text-slate-400">
          Ambient sound, opening image, and manual environmental effects for the shared canvas.
        </p>
      </Card>

      <Card>
        <SectionTitle>Opening Image Background</SectionTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="subtle" onClick={pickOpeningImage}>📁 Pick image from PC</Button>
          <Button size="sm" variant="ghost" onClick={() => setOpeningImage(undefined)}>Clear</Button>
          <Input value={state.environment?.openingImageUrl ?? ""} onChange={(e) => setOpeningImage(e.target.value || undefined)} placeholder="https://… or local object URL" className="min-w-0 flex-1" />
        </div>
      </Card>

      <Card>
        <SectionTitle>Manual Environment Effects</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {weathers.map((w) => (
            <Button key={w} size="sm" variant={state.environment?.manualWeather === w ? "primary" : "subtle"} onClick={() => setManualWeather(w)}>
              {weatherIcon(w)} {w}
            </Button>
          ))}
        </div>
      </Card>

      <div className="space-y-3">
        {state.soundscapes.map((ss) => {
          const active = ss.id === state.activeSoundscapeId;
          return (
            <Card key={ss.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <Input value={ss.name} onChange={(e) => updateSoundscape(ss.id, { name: e.target.value })} className="flex-1 font-bold" />
                <Button size="sm" variant={active ? "primary" : "subtle"}
                  onClick={() => { if (active) { setActiveSoundscape(undefined); audio.stopAmbient(); } else { setActiveSoundscape(ss.id); if (ss.url) audio.playAmbient(ss.url, ss.volume, ss.loop); } }}>
                  {active ? "⏹ Stop" : "▶ Apply"}
                </Button>
                <Button size="icon" variant="danger" onClick={() => removeSoundscape(ss.id)}>🗑️</Button>
              </div>
              <Field label="Sound URL"><Input value={ss.url} onChange={(e) => updateSoundscape(ss.id, { url: e.target.value })} placeholder="https://…mp3 or pick local" /></Field>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="subtle" onClick={() => pickLocal(ss.id)}>📁 Pick from PC</Button>
                <Button size="sm" variant="subtle" onClick={() => copyToClipboard(ambientSearchPhrase(ss.name))} title="Copy web-search phrase">🔎 Copy search phrase</Button>
                <Button size="sm" variant="subtle" disabled={!ss.url} onClick={() => audio.playFx(ss.url, ss.volume)}>🔊 Preview</Button>
                <label className="flex items-center gap-1 text-xs text-slate-400">
                  Vol
                  <input type="range" min={0} max={1} step={0.05} value={ss.volume}
                    onChange={(e) => { const v = +e.target.value; updateSoundscape(ss.id, { volume: v }); if (active) audio.setAmbientVolume(v); }} />
                </label>
                <label className="flex items-center gap-1 text-xs text-slate-400">
                  <input type="checkbox" checked={ss.loop} onChange={(e) => updateSoundscape(ss.id, { loop: e.target.checked })} /> loop
                </label>
              </div>
              <Field label="Background Image URL (optional)"><Input value={ss.imageUrl ?? ""} onChange={(e) => updateSoundscape(ss.id, { imageUrl: e.target.value })} placeholder="https://images.unsplash.com/…" /></Field>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function weatherIcon(w: string) {
  return ({ clear: "☀️", rain: "🌧️", snow: "❄️", fog: "🌫️", storm: "⛈️", embers: "🔥", ash: "🌋", dust: "💨", leaves: "🍂", stars: "✨", aurora: "🌌", heat: "♨️", bubbles: "🫧" } as Record<string, string>)[w] ?? "✨";
}
