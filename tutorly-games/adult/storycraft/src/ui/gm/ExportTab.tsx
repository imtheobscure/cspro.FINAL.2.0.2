import { useGameState, store } from "../../engine/store";
import * as E from "../../engine/exporter";
import { exportImport } from "./helpers";
import { Button, Card, Field, Input, SectionTitle } from "../primitives";
import { defaultState } from "../../engine/defaults";
import { useState } from "react";

export function ExportTab() {
  const state = useGameState();
  const [ended, setEnded] = useState(false);

  return (
    <div className="space-y-4">
      <Card className="border-2 border-emerald-500/20 bg-emerald-500/5">
        <SectionTitle>Global Data Management</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="primary" onClick={() => exportImport.exportSession(state)}>💾 Export All Session Data</Button>
          <Button variant="primary" onClick={exportImport.importSession}>📂 Import Session File</Button>
          <Button variant="subtle" onClick={() => exportImport.exportUni(state)}>🌌 Export Universes Only</Button>
          <Button variant="subtle" onClick={exportImport.importUni}>🌌 Import Universes</Button>
        </div>
        <p className="mt-3 text-[10px] text-slate-500">Note: Importing a session will overwrite your current progress.</p>
      </Card>

      <Card>
        <SectionTitle>Session Info</SectionTitle>
        <Field label="Campaign Title">
          <Input value={state.meta.title} onChange={(e) => store.set((s) => ({ ...s, meta: { ...s.meta, title: e.target.value } }))} />
        </Field>
      </Card>

      <Card>
        <SectionTitle>Export Saga</SectionTitle>
        <p className="mb-2 text-xs text-slate-400">Merge all steps, decisions, reasons & leaderboard snapshots.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" onClick={() => E.exportFlipbook(state)}>📖 Interactive Flipbook</Button>
          <Button variant="subtle" onClick={() => E.exportPDF(state)}>📄 PDF (print)</Button>
          <Button variant="subtle" onClick={() => E.exportEpubLike(state)}>📚 EPUB</Button>
          <Button variant="subtle" onClick={() => E.exportScreenplay(state)}>🎬 Screenplay</Button>
        </div>
      </Card>

      <Card>
        <SectionTitle>End Session</SectionTitle>
        <Button variant="primary" onClick={() => { setEnded(true); store.command({ type: "TRIGGER_EFFECT", effect: { id: "fin", name: "Finale!", emoji: "🎉", animation: "burst", soundUrl: "", color: "#f59e0b" } }); }}>
          🎉 Finish & Celebrate
        </Button>
        {ended && (
          <div className="mt-3 rounded-lg bg-amber-500/10 p-3 ring-1 ring-amber-400/30">
            <p className="text-sm font-bold text-amber-200">👏 Achievement Summary</p>
            <ul className="mt-1 space-y-0.5 text-xs text-slate-300">
              <li>Chapters played: {state.chapters.length}</li>
              <li>Total decisions: {state.chapters.reduce((a, c) => a + c.decisions.length, 0)}</li>
              {[...state.entities].sort((a, b) => b.score - a.score).slice(0, 3).map((e, i) => (
                <li key={e.id}>{["🥇","🥈","🥉"][i]} {e.name} — ★{e.score}{e.dead ? " (fallen)" : ""}</li>
              ))}
            </ul>
            <Button className="mt-2" variant="subtle" onClick={() => E.exportFlipbook(state)}>Export final flipbook →</Button>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>Danger Zone</SectionTitle>
        <Button variant="danger" onClick={() => { if (confirm("Reset entire session? This clears chapters & resets state.")) store.replace(defaultState()); }}>
          ♻ New Campaign (reset)
        </Button>
      </Card>
    </div>
  );
}
