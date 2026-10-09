import { useGameState } from "../../engine/store";
import { switchChapter } from "../../engine/actions";
import { Card, SectionTitle } from "../primitives";

export function StoryMapTab() {
  const state = useGameState();
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Progressive Story Map</SectionTitle>
        <p className="text-xs text-slate-400">Auto-built mind-map of branching decisions & character fates. Click a node to jump to that chapter.</p>
      </Card>

      {state.storyMap.length === 0 ? (
        <Card><p className="text-sm text-slate-500">No nodes yet — deploy a scene to begin the map.</p></Card>
      ) : (
        <div className="relative pl-6">
          <div className="absolute bottom-2 left-2 top-2 w-px bg-gradient-to-b from-violet-500 to-indigo-700" />
          {state.storyMap.map((n, i) => {
            const ch = state.chapters.find((c) => c.id === n.chapterId);
            const active = ch?.id === state.activeChapterId;
            const decisions = ch?.decisions ?? [];
            return (
              <div key={n.id} className="relative mb-3">
                <span className="absolute -left-[18px] top-2 h-3 w-3 rounded-full ring-2 ring-slate-900"
                  style={{ background: active ? "#a78bfa" : "#4f46e5" }} />
                <button onClick={() => ch && switchChapter(ch.id)}
                  className={`w-full rounded-lg p-3 text-left ring-1 transition ${active ? "bg-violet-600/20 ring-violet-400" : "bg-slate-900/50 ring-white/10 hover:bg-white/5"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Node {i + 1} · {n.label}</span>
                    <span className="text-[10px] text-slate-500">{ch && new Date(ch.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {ch?.narratorOpening && <p className="mt-1 text-xs italic text-amber-200/80">📜 {ch.narratorOpening}</p>}
                  {decisions.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {decisions.map((d) => {
                        const e = state.entities.find((x) => x.id === d.entityId);
                        return <div key={d.id} className="text-[11px] text-slate-400">↳ <b style={{ color: e?.color }}>{e?.name}</b>: {d.action}</div>;
                      })}
                    </div>
                  )}
                  {/* Character fates snapshot */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {ch?.leaderboardSnapshot.map((e) => (
                      <span key={e.id} className={`rounded px-1 text-[11px] ${e.dead ? "bg-rose-500/20 text-rose-300" : "bg-white/5 text-slate-300"}`}>
                        {e.dead ? "💀" : e.emoji} {e.name}
                      </span>
                    ))}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
