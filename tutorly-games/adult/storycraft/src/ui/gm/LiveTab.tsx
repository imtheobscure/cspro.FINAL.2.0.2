import { useGameState } from "../../engine/store";
import { buildContinuationPrompt } from "../../engine/promptGen";
import { clearLiveInput, updateEntity } from "../../engine/actions";
import { Button, Card, SectionTitle, copyToClipboard } from "../primitives";
import { useState } from "react";

export function LiveTab() {
  const state = useGameState();
  const cur = state.chapters.find((c) => c.id === state.activeChapterId);
  const decisions = cur?.decisions ?? state.liveInputs;
  const [copied, setCopied] = useState(false);
  const players = state.entities.filter((e) => e.kind === "player" && !e.dead);
  const lockedCount = decisions.length;

  const award = (id: string, pts: number) => {
    const e = state.entities.find((x) => x.id === id);
    if (e) updateEntity(id, { score: Math.max(0, e.score + pts) });
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle action={
          <Button size="sm" variant="primary" disabled={!cur} onClick={async () => { await copyToClipboard(buildContinuationPrompt(state)); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
            {copied ? "✓ Copied" : "🔁 Copy Continuation Prompt"}
          </Button>
        }>
          Live Input Feed
        </SectionTitle>
        <p className="text-xs text-slate-400">{lockedCount}/{players.length} players locked in. Mirrors the canvas in real time.</p>
      </Card>

      <div className="space-y-2">
        {decisions.length === 0 && <Card><p className="text-sm text-slate-500">Awaiting player decisions…</p></Card>}
        {decisions.map((d) => {
          const e = state.entities.find((x) => x.id === d.entityId);
          return (
            <Card key={d.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">{e?.emoji}</span>
                <span className="font-bold" style={{ color: e?.color }}>{e?.name}</span>
                <span className="ml-auto flex gap-1">
                  {state.settings.scoringEnabled && (
                    <>
                      <Button size="sm" variant="subtle" onClick={() => award(d.entityId, 5)} title="Reward creativity/logic">+5 ★</Button>
                      <Button size="sm" variant="subtle" onClick={() => award(d.entityId, 10)}>+10 ★</Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => clearLiveInput(d.entityId)}>↩ Unlock</Button>
                </span>
              </div>
              <p className="rounded bg-slate-900/60 p-2 text-sm text-slate-100">💬 {d.action}</p>
              {d.reasoning && <p className="text-xs italic text-slate-400">↳ {d.reasoning}</p>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
