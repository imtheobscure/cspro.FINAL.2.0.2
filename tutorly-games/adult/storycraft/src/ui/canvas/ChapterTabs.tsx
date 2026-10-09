import { useGameState } from "../../engine/store";
import { removeChapter, switchChapter } from "../../engine/actions";
import { cn } from "../../utils/cn";

export function ChapterTabs() {
  const state = useGameState();
  if (state.chapters.length === 0) return null;
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-white/10 bg-slate-950/60 px-2 py-1.5">
      {state.chapters.map((c, i) => {
        const active = c.id === state.activeChapterId;
        const time = new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return (
          <div
            key={c.id}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-t-lg pl-3 pr-1 py-1 transition",
              active ? "bg-slate-800 text-white ring-1 ring-white/10" : "text-slate-400 hover:bg-white/5",
            )}
          >
            <button onClick={() => switchChapter(c.id)} className="flex items-center gap-1.5 text-xs font-semibold">
              <span>📖 {c.title}</span>
              <span className="text-[10px] text-slate-500">{time}</span>
              {i === state.chapters.length - 1 && active && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />}
            </button>
            <button
              onClick={() => {
                if (confirm(`Close chapter "${c.title}"? Its leaderboard snapshot will be removed.`)) removeChapter(c.id);
              }}
              title="Close chapter"
              className="ml-1 grid h-5 w-5 place-items-center rounded text-slate-500 hover:bg-rose-500/30 hover:text-rose-200"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
